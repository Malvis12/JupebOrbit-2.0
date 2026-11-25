import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collectionGroup,
  doc,
  setDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Question } from '../../types';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  Loader2,
  Layout,
  X,
  CheckCircle2,
  Trash2,
  Download,
  FileSpreadsheet,
  Edit3,
  Eye
} from 'lucide-react';
import { MathRenderer } from '../../components/common/MathRenderer';
import {
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToQuestions,
  parseQuestionsJson,
  generateCsvTemplate,
  CsvColumnMapping,
  CsvFieldKey,
  CSV_FIELD_LABELS,
  ParsedCsvData
} from '../../lib/csvQuestionParser';

export const QuestionUploadPage: React.FC = () => {
  const { userData, isAdmin } = useAuth();

  // Admin access check
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center w-full max-w-md shadow-sm border border-slate-200 dark:border-slate-800">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            You don't have administrative privileges to manage the Question Bank.
          </p>
        </div>
      </div>
    );
  }

  // State management
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state
  const [searchSubject, setSearchSubject] = useState<string>('');
  const [searchYear, setSearchYear] = useState<string>('');
  const [searchTopic, setSearchTopic] = useState<string>('');

  // CSV / JSON Batch Upload & Staging State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSubject, setUploadSubject] = useState<string>('physics');
  const [uploadYear, setUploadYear] = useState<string>('2024');
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvData | null>(null);
  const [csvMapping, setCsvMapping] = useState<CsvColumnMapping>({});
  const [showColumnMapper, setShowColumnMapper] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [editingStagedIdx, setEditingStagedIdx] = useState<number | null>(null);

  // Staged questions waiting for admin approval before writing to Firestore
  const [stagedQuestions, setStagedQuestions] = useState<Question[]>([]);
  const [commitStatus, setCommitStatus] = useState<string>('');

  // Form state for single question modal
  const [formData, setFormData] = useState<Question>({
    id: '',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: {
      coreConcept: '',
      steps: '',
      pitfall: ''
    },
    syllabusTopic: '',
    subject: 'physics',
    year: '2024'
  });

  const subjects = [
    'physics',
    'chemistry',
    'mathematics',
    'biology',
    'economics',
    'government',
    'agricultural science',
    'literature in english',
    'crs/irs',
    'accounting'
  ];
  const years = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  // Reset form
  const resetForm = () => {
    setFormData({
      id: '',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: {
        coreConcept: '',
        steps: '',
        pitfall: ''
      },
      syllabusTopic: '',
      subject: 'physics',
      year: '2024'
    });
    setEditIndex(null);
    setIsModalOpen(false);
  };

  // Load questions from Firestore using collectionGroup to reliably reach all questions
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const questionsSnap = await getDocs(collectionGroup(db, 'questions'));
      const allQuestions: Question[] = [];

      questionsSnap.forEach((d) => {
        const data = d.data() as Partial<Question>;
        // Extract subject and year from Firestore reference path: subjects/{subject}/years/{year}/questions/{docId}
        const pathParts = d.ref.path.split('/');
        let pathSubject = pathParts[1] || data.subject || 'physics';
        const pathYear = pathParts[3] || data.year || '2025';

        // Normalize subject abbreviation if needed
        if (pathSubject === 'math') pathSubject = 'mathematics';
        if (pathSubject === 'phys') pathSubject = 'physics';
        if (pathSubject === 'chem') pathSubject = 'chemistry';
        if (pathSubject === 'bio') pathSubject = 'biology';
        if (pathSubject === 'econ') pathSubject = 'economics';
        if (pathSubject === 'govt') pathSubject = 'government';

        allQuestions.push({
          id: d.id,
          questionText: (data as any).questionText || (data as any).question || '',
          options: (data as any).options || [],
          correctAnswerIndex: (data as any).correctAnswerIndex ?? (data as any).correct ?? 0,
          syllabusTopic: (data as any).syllabusTopic || (data as any).topic || '',
          explanation: (data as any).explanation || '',
          ...data,
          subject: pathSubject,
          year: pathYear
        } as Question);
      });

      setQuestions(allQuestions);
      setFilteredQuestions(allQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter questions
  const filterQuestions = () => {
    let filtered = [...questions];
    if (searchSubject) {
      filtered = filtered.filter(q => q.subject === searchSubject);
    }
    if (searchYear) {
      filtered = filtered.filter(q => q.year === searchYear);
    }
    if (searchTopic.trim()) {
      const t = searchTopic.trim().toLowerCase();
      filtered = filtered.filter(q => (q.syllabusTopic || '').toLowerCase().includes(t));
    }
    setFilteredQuestions(filtered);
  };

  // Bulk delete currently filtered questions
  const handleBulkDeleteFiltered = async () => {
    if (filteredQuestions.length === 0) return;
    if (!window.confirm(`Delete all ${filteredQuestions.length} filtered questions?`)) return;

    setLoading(true);
    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < filteredQuestions.length; i += BATCH_SIZE) {
        const chunk = filteredQuestions.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((q) => {
          const docRef = doc(db, 'subjects', q.subject || 'physics', 'years', q.year || '2024', 'questions', q.id);
          batch.set(docRef, { _deleted: true }, { merge: true });
        });
        await batch.commit();
      }
      await loadQuestions();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Failed to bulk delete questions.');
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV / JSON batch file selection
  const handleBatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    setUploadFiles(fileList);
    setUploadError('');
    setCommitStatus('');
    setEditingStagedIdx(null);

    try {
      const combinedCsvRows: Record<string, string>[] = [];
      let firstCsvHeaders: string[] = [];
      const jsonQuestions: Question[] = [];

      for (const file of fileList) {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.csv')) {
          const parsed = parseCsvText(text);
          if (firstCsvHeaders.length === 0 && parsed.headers.length > 0) {
            firstCsvHeaders = parsed.headers;
          }
          combinedCsvRows.push(...parsed.rows);
        } else if (file.name.toLowerCase().endsWith('.json')) {
          const parsedJson = parseQuestionsJson(
            text,
            uploadSubject,
            uploadYear,
            jsonQuestions.length
          );
          jsonQuestions.push(...parsedJson);
        } else {
          setUploadError(`Unsupported file type: ${file.name}. Please upload .csv or .json files.`);
          return;
        }
      }

      if (combinedCsvRows.length > 0 && firstCsvHeaders.length > 0) {
        const csvData: ParsedCsvData = { headers: firstCsvHeaders, rows: combinedCsvRows };
        const detected = autoDetectCsvMapping(firstCsvHeaders);
        setParsedCsv(csvData);
        setCsvMapping(detected);
        const mapped = mapCsvRowsToQuestions(
          combinedCsvRows,
          detected,
          uploadSubject,
          uploadYear,
          jsonQuestions.length
        );
        setStagedQuestions([...jsonQuestions, ...mapped]);
        // Auto-open column mapper if any required field wasn't auto-detected
        const missingRequired = (Object.keys(CSV_FIELD_LABELS) as CsvFieldKey[]).some(
          (k) => CSV_FIELD_LABELS[k].required && !detected[k]
        );
        setShowColumnMapper(missingRequired);
      } else {
        setParsedCsv(null);
        setCsvMapping({});
        setShowColumnMapper(false);
        setStagedQuestions(jsonQuestions);
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      setUploadError(err?.message || 'Failed to parse uploaded file(s).');
    }
  };

  // Re-map CSV rows when admin adjusts column mapping
  const handleMappingChange = (field: CsvFieldKey, headerName: string) => {
    const nextMapping: CsvColumnMapping = {
      ...csvMapping,
      [field]: headerName || undefined
    };
    setCsvMapping(nextMapping);
    if (parsedCsv) {
      const mapped = mapCsvRowsToQuestions(
        parsedCsv.rows,
        nextMapping,
        uploadSubject,
        uploadYear,
        0
      );
      setStagedQuestions(mapped);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jupeb-orbit-questions-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Update a staged question inline
  const handleUpdateStaged = (index: number, updated: Partial<Question>) => {
    setStagedQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, ...updated } : q))
    );
  };

  // Commit Staged Questions to Firestore
  const handleCommitStagedToFirestore = async () => {
    if (stagedQuestions.length === 0) return;

    setLoading(true);
    setCommitStatus('Batch saving questions to Firestore...');

    try {
      const BATCH_SIZE = 500;
      let committed = 0;

      for (let i = 0; i < stagedQuestions.length; i += BATCH_SIZE) {
        const chunk = stagedQuestions.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(q => {
          const docRef = doc(db, 'subjects', q.subject || uploadSubject, 'years', q.year || uploadYear, 'questions', q.id);
          batch.set(docRef, q, { merge: true });
        });

        await batch.commit();
        committed += chunk.length;
        setCommitStatus(`Uploaded ${committed} of ${stagedQuestions.length} questions...`);
      }

      setCommitStatus(`Successfully saved ${stagedQuestions.length} questions to Firestore with deterministic IDs!`);
      setStagedQuestions([]);
      setUploadFiles([]);
      setParsedCsv(null);
      await loadQuestions();
    } catch (err: any) {
      console.error('Commit error:', err);
      alert(`Error saving to Firestore: ${err?.message || 'Unknown error'}`);
      setCommitStatus('Error during Firestore upload.');
    } finally {
      setLoading(false);
    }
  };

  // Remove individual question from staged list
  const handleRemoveStaged = (index: number) => {
    setStagedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Edit single question
  const handleEdit = (index: number) => {
    setEditIndex(index);
    const question = filteredQuestions[index];
    setFormData({
      id: question.id,
      questionText: question.questionText || '',
      options: [...(question.options || ['', '', '', ''])],
      correctAnswerIndex: question.correctAnswerIndex ?? 0,
      explanation: question.explanation || {
        coreConcept: '',
        steps: '',
        pitfall: ''
      },
      syllabusTopic: question.syllabusTopic || '',
      subject: question.subject || 'physics',
      year: question.year || '2024'
    });
    setIsModalOpen(true);
  };

  // Delete question from Firestore
  const handleDelete = async (question: Question) => {
    if (!question.id || !window.confirm(`Delete question ${question.id}?`)) return;

    try {
      const subj = question.subject || 'physics';
      const yr = question.year || '2024';
      const questionRef = doc(db, 'subjects', subj, 'years', yr, 'questions', question.id);
      await setDoc(questionRef, { _deleted: true }, { merge: true });
      await loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  // Save manual add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.questionText.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const subj = formData.subject || 'physics';
      const yr = formData.year || '2024';

      let qId = formData.id;
      if (!qId) {
        // Generate deterministic fallback ID
        const prefix = subj.slice(0, 3);
        const count = questions.filter(q => q.subject === subj && q.year === yr).length + 1;
        qId = `${prefix}-${yr}-q${String(count).padStart(2, '0')}`;
      }

      const questionData: Question = {
        id: qId,
        questionText: formData.questionText.trim(),
        options: formData.options.map(opt => opt.trim()),
        correctAnswerIndex: formData.correctAnswerIndex,
        explanation: formData.explanation,
        syllabusTopic: formData.syllabusTopic?.trim() || 'General',
        subject: subj,
        year: yr
      };

      const docRef = doc(db, 'subjects', subj, 'years', yr, 'questions', qId);
      await setDoc(docRef, questionData, { merge: true });

      resetForm();
      await loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Batch CSV & JSON Ingestion</span>
                <span>•</span>
                <span>Deterministic ID Generator</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                JUPEB Past Question Ingestion Studio
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Upload CSV or JSON question files in bulk, map columns, preview & edit LaTeX equations inline, and commit directly to Firestore.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Layout className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Admin: {userData?.username || 'Authorized'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Batch CSV / JSON Upload Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Upload Past Questions (CSV / JSON)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Select one or multiple CSV/JSON files. Standard columns are auto-detected.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Download CSV Template
            </button>
          </div>

          {/* Default Subject & Year Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Default Subject (if omitted in file)
              </label>
              <select
                value={uploadSubject}
                onChange={(e) => setUploadSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                {subjects.map(s => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Default Exam Year (if omitted in file)
              </label>
              <select
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center transition-all bg-slate-50/50 dark:bg-slate-800/40">
            <input
              type="file"
              accept=".csv,.json"
              multiple
              onChange={handleBatchFileChange}
              id="past-question-files"
              className="hidden"
            />
            <label htmlFor="past-question-files" className="cursor-pointer block">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                {uploadFiles.length > 0
                  ? `${uploadFiles.length} file(s) selected: ${uploadFiles.map(f => f.name).join(', ')}`
                  : 'Click to select or drag and drop CSV / JSON files'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Deterministic ID schema: <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">{uploadSubject.slice(0, 3)}-{uploadYear}-q01</code> ...
              </p>
            </label>
          </div>

          {/* Status & Column Mapper Toggle */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {uploadError && (
                <p className="text-red-500 font-medium">⚠️ {uploadError}</p>
              )}
              {commitStatus && (
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {commitStatus}</p>
              )}
            </div>

            {parsedCsv && (
              <button
                type="button"
                onClick={() => setShowColumnMapper(prev => !prev)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showColumnMapper ? 'Hide Column Mapping' : 'Adjust CSV Column Mapping'}
              </button>
            )}
          </div>

          {/* Optional Manual CSV Column Mapping */}
          {parsedCsv && showColumnMapper && (
            <div className="mt-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                CSV Column Mapping
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Match your CSV headers to the required question fields. Changes update the staged preview immediately.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(CSV_FIELD_LABELS) as CsvFieldKey[]).map((field) => (
                  <div key={field}>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {CSV_FIELD_LABELS[field].label}
                      {CSV_FIELD_LABELS[field].required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={csvMapping[field] || ''}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="">-- Not Mapped --</option>
                      {parsedCsv.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Staged Questions Approval Box (Shows after extraction) */}
        {stagedQuestions.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border-2 border-blue-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Extraction Succeeded
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Review & Commit {stagedQuestions.length} Questions
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Review the extracted LaTeX questions, options, and explanations below before committing to Firestore.
                </p>
              </div>

              <button
                onClick={handleCommitStagedToFirestore}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                Confirm & Commit All to Firestore
              </button>
            </div>

            {/* Staged Question Review List */}
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
              {stagedQuestions.map((q, idx) => {
                const isEditing = editingStagedIdx === idx;
                return (
                  <div
                    key={`${q.id}-${idx}`}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
                          ID: {q.id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {(q.subject || uploadSubject).toUpperCase()} • {q.year || uploadYear}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium">
                          Topic: {q.syllabusTopic || 'General'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingStagedIdx(isEditing ? null : idx)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs flex items-center gap-1 font-semibold"
                        >
                          {isEditing ? (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Done Editing
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-3.5 h-3.5" /> Edit Inline
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStaged(idx)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Discard
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
                            <select
                              value={q.subject || uploadSubject}
                              onChange={(e) => handleUpdateStaged(idx, { subject: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                              {subjects.map(s => (
                                <option key={s} value={s}>{s.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Year</label>
                            <select
                              value={q.year || uploadYear}
                              onChange={(e) => handleUpdateStaged(idx, { year: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                              {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Syllabus Topic</label>
                            <input
                              type="text"
                              value={q.syllabusTopic || ''}
                              onChange={(e) => handleUpdateStaged(idx, { syllabusTopic: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Question Text (supports $...$ / $$...$$ LaTeX)
                          </label>
                          <textarea
                            rows={2}
                            value={q.questionText}
                            onChange={(e) => handleUpdateStaged(idx, { questionText: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                          <div className="mt-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Preview:</span>
                            <MathRenderer content={q.questionText} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctAnswerIndex === optIdx;
                            return (
                              <div key={optIdx} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-semibold text-slate-500">
                                    Option {String.fromCharCode(65 + optIdx)}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStaged(idx, { correctAnswerIndex: optIdx })}
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {isCorrect ? 'CORRECT' : 'Set Correct'}
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOpts = [...q.options];
                                    nextOpts[optIdx] = e.target.value;
                                    handleUpdateStaged(idx, { options: nextOpts });
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                                />
                                <div className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  <MathRenderer content={opt} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Explanation (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={q.explanation?.coreConcept || ''}
                            onChange={(e) =>
                              handleUpdateStaged(idx, {
                                explanation: {
                                  ...q.explanation,
                                  coreConcept: e.target.value
                                }
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-slate-800 dark:text-slate-200 text-sm font-medium">
                          <span className="font-bold mr-1">Q{idx + 1}.</span>
                          <MathRenderer content={q.questionText} />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctAnswerIndex === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                  isCorrect
                                    ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-semibold'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <MathRenderer content={opt} />
                                {isCorrect && <span className="ml-auto text-[10px] text-emerald-600 font-bold">CORRECT</span>}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation?.coreConcept && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                            <span className="font-semibold">Explanation: </span>
                            <MathRenderer content={q.explanation.coreConcept} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Existing Question Bank Management */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Live Question Bank ({questions.length} Total Questions)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Browse, filter, edit, or remove questions stored in Firestore.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && filterQuestions()}
                placeholder="Filter by topic..."
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              {filteredQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteFiltered}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Filtered ({filteredQuestions.length})
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              + Add Single Question Manually
            </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <select
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={filterQuestions}
                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setSearchSubject('');
                  setSearchYear('');
                  setFilteredQuestions(questions);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Questions Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Subject / Year</th>
                  <th className="px-4 py-3">Question Preview</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading questions...
                    </td>
                  </tr>
                ) : filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No questions found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q, idx) => (
                    <tr key={q.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {q.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className="capitalize">{q.subject}</span> • {q.year}
                      </td>
                      <td className="px-4 py-3 max-w-md truncate text-slate-700 dark:text-slate-300">
                        {q.questionText}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {q.syllabusTopic || 'General'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(idx)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(q)}
                          className="text-red-500 hover:underline text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editIndex !== null ? `Edit Question (${formData.id})` : 'Add New Question'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Question Text (LaTeX $...$)
                </label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700 text-sm"
                  rows={3}
                  required
                />
                {formData.questionText && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                    <span className="font-bold text-slate-500 block mb-1">KaTeX Preview:</span>
                    <MathRenderer content={formData.questionText} />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                  Options (4 required)
                </label>
                {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                      {letter}
                    </span>
                    <input
                      type="text"
                      value={formData.options[optIdx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          options: prev.options.map((o, i) => (i === optIdx ? val : o))
                        }));
                      }}
                      className="flex-1 px-3 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
                      placeholder={`Option ${letter} text`}
                      required
                    />
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="correctAnswerIndex"
                        checked={formData.correctAnswerIndex === optIdx}
                        onChange={() => setFormData(prev => ({ ...prev, correctAnswerIndex: optIdx }))}
                      />
                      <span>Correct</span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Syllabus Topic
                  </label>
                  <input
                    type="text"
                    value={formData.syllabusTopic || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, syllabusTopic: e.target.value }))}
                    placeholder="e.g. Waves, Calculus"
                    className="w-full px-2.5 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
