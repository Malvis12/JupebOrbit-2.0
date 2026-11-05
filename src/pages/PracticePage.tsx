import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collectionGroup, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { orbitAudio } from '../lib/orbitAudio';
import { Question } from '../types';
import { MathRenderer } from '../components/common/MathRenderer';
import { FormulaVaultDrawer } from '../components/tools/FormulaVaultDrawer';
import { 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Filter,
  Layers,
  X
} from 'lucide-react';

const FALLBACK_PRACTICE_QUESTIONS: Record<string, Question[]> = {
  physics: [],
  mathematics: [],
  chemistry: [],
  biology: []
};

// Helper to normalize any Firestore question document format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeQuestion = (docData: Record<string, any>, id: string): Question => {
  const qText = docData.questionText || docData.question || 'Question text not available.';
  let rawOpts = Array.isArray(docData.options) ? docData.options : [];
  // Strip "A) ", "A. ", "A - " prefix so options render cleanly without duplicate letters
  rawOpts = rawOpts.map((opt: string) => typeof opt === 'string' ? opt.replace(/^[A-D][).:\s\-]+/i, '').trim() : opt);
  
  const correctIdx = docData.correctAnswerIndex ?? docData.correct ?? docData.answer ?? 0;
  const topic = docData.syllabusTopic || docData.topic || 'General Practice';
  
  let explanation = docData.explanation;
  if (!explanation || typeof explanation !== 'object') {
    explanation = {
      coreConcept: topic,
      steps: typeof docData.explanation === 'string' ? docData.explanation : (docData.explanationText || 'Step-by-step derivation available.'),
      pitfall: docData.pitfall || ''
    };
  }

  return {
    id,
    questionText: qText,
    options: rawOpts,
    correctAnswerIndex: typeof correctIdx === 'number' ? correctIdx : 0,
    syllabusTopic: topic,
    explanation
  };
};

export const PracticePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userData } = useAuth();

  const combination = userData?.combination || ['Physics', 'Chemistry', 'Mathematics'];
  const [selectedSubject, setSelectedSubject] = useState(
    searchParams.get('subject')?.toLowerCase() || combination[0]?.toLowerCase() || 'physics'
  );
  const [selectedTopic, setSelectedTopic] = useState<string>(
    searchParams.get('topic') || 'all'
  );

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [formulaVaultOpen, setFormulaVaultOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state if URL params change
  useEffect(() => {
    const subParam = searchParams.get('subject');
    const topicParam = searchParams.get('topic');
    if (subParam && subParam.toLowerCase() !== selectedSubject) {
      setSelectedSubject(subParam.toLowerCase());
    }
    if (topicParam) {
      setSelectedTopic(topicParam);
    }
  }, [searchParams, selectedSubject]);

  // Load questions from Firestore across all years (including 2025)
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setCurrentIndex(0);

      const loadedList: Question[] = [];
      const targetSub = selectedSubject.toLowerCase();

      try {
        // Query question bank reliably using collectionGroup so all subcollections are reached
        const qSnap = await getDocs(collectionGroup(db, 'questions'));
        qSnap.forEach((docSnap) => {
          const pathParts = docSnap.ref.path.split('/');
          const raw = docSnap.data();
          let sName = (pathParts[1] || raw.subject || '').toLowerCase();
          if (sName === 'math') sName = 'mathematics';
          if (sName === 'phys') sName = 'physics';
          if (sName === 'chem') sName = 'chemistry';
          if (sName === 'bio') sName = 'biology';
          if (sName === 'econ') sName = 'economics';
          if (sName === 'govt') sName = 'government';

          if (sName === targetSub) {
            loadedList.push(normalizeQuestion({
              ...raw,
              subject: sName,
              year: pathParts[3] || raw.year || '2025'
            }, docSnap.id));
          }
        });

        if (loadedList.length > 0) {
          setAllQuestions(loadedList);
        } else {
          const fallback = FALLBACK_PRACTICE_QUESTIONS[selectedSubject.toLowerCase()] || FALLBACK_PRACTICE_QUESTIONS.physics;
          setAllQuestions(fallback);
        }
      } catch (err) {
        console.warn('Error querying Firestore question bank, using curriculum bank:', err);
        const fallback = FALLBACK_PRACTICE_QUESTIONS[selectedSubject.toLowerCase()] || FALLBACK_PRACTICE_QUESTIONS.physics;
        setAllQuestions(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedSubject]);

  // Extract unique topics and filter whenever allQuestions or selectedTopic changes
  useEffect(() => {
    // Collect all unique topics found in questions
    const topicsSet = new Set<string>();
    allQuestions.forEach((q) => {
      if (q.syllabusTopic && q.syllabusTopic.trim()) {
        topicsSet.add(q.syllabusTopic.trim());
      }
    });
    setAvailableTopics(Array.from(topicsSet));

    // Filter by topic if active
    if (!selectedTopic || selectedTopic === 'all') {
      setFilteredQuestions(allQuestions);
    } else {
      const target = selectedTopic.toLowerCase().trim();
      const targetTokens = target
        .replace(/[^a-z0-9]/gi, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !['general', 'chemistry', 'physics', 'mathematics', 'biology', 'concept'].includes(w));

      const filtered = allQuestions.filter((q) => {
        const qTopic = (q.syllabusTopic || '').toLowerCase().trim();
        // 1. Direct substring match
        if (qTopic.includes(target) || target.includes(qTopic)) return true;
        // 2. Keyword/token overlap (e.g. "stoichiometry" matches "CHM 001: General Chemistry (Stoichiometry and Empirical Formula)")
        return targetTokens.some(token => qTopic.includes(token));
      });

      // If matches found, use filtered; if no matches found in database for that exact string, keep all but inform user
      if (filtered.length > 0) {
        setFilteredQuestions(filtered);
      } else {
        setFilteredQuestions(allQuestions);
      }
    }
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  }, [allQuestions, selectedTopic]);

  const currentQ = filteredQuestions[currentIndex];

  const handleSelectOption = async (idx: number) => {
    if (isAnswerRevealed || !currentQ) return;
    setSelectedOption(idx);
    setIsAnswerRevealed(true);

    const isCorrect = idx === currentQ.correctAnswerIndex;
    if (isCorrect) {
      orbitAudio.playCorrect();
    } else {
      orbitAudio.playIncorrect();

      // Automatically queue mistake to candidate's Weakness Bucket in Firestore for Spaced Repetition!
      if (user) {
        try {
          const qId = currentQ.id || Math.random().toString(36).substring(7);
          await setDoc(doc(db, 'users', user.uid, 'weaknessBucket', qId), {
            title: currentQ.questionText,
            topic: currentQ.syllabusTopic || 'Practice Concept',
            qId,
            subject: currentQ.subject || selectedSubject,
            options: currentQ.options || [],
            correctAnswerIndex: currentQ.correctAnswerIndex ?? 0,
            explanation: currentQ.explanation || null,
            addedAt: new Date().toISOString(),
            source: `Practice Hub (${selectedSubject.toUpperCase()})`,
            srsLevel: 1,
            nextReviewDate: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Could not auto-save to weaknessBucket:', e);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    }
  };

  const clearTopicFilter = () => {
    setSelectedTopic('all');
    setSearchParams({ subject: selectedSubject });
  };

  const handleSelectTopicFilter = (top: string) => {
    setSelectedTopic(top);
    if (top === 'all') {
      setSearchParams({ subject: selectedSubject });
    } else {
      setSearchParams({ subject: selectedSubject, topic: top });
    }
  };

  const isTopicSpecific = selectedTopic && selectedTopic !== 'all';
  const hasExactMatches = isTopicSpecific && allQuestions.some(q => {
    const t = (q.syllabusTopic || '').toLowerCase();
    const target = selectedTopic.toLowerCase();
    return t.includes(target) || target.includes(t);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 select-none">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5 text-brand-600" />
              <span>Untimed Topical Sandbox</span>
            </div>
            <h1 className="font-display font-black text-2xl text-slate-900 dark:text-white capitalize">
              {selectedSubject} Practice Hub
            </h1>
          </div>

          {/* Subject Pills & Formula Vault */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {combination.map((sub) => {
              const subKey = sub.toLowerCase();
              const isSelected = selectedSubject.toLowerCase() === subKey;
              return (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedSubject(subKey);
                    setSelectedTopic('all');
                    setSearchParams({ subject: subKey });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sub}
                </button>
              );
            })}

            <button
              onClick={() => setFormulaVaultOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Formula Vault</span>
            </button>
          </div>
        </div>

        {/* Topic Filter Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Filter Topic:</span>
            
            <select
              value={selectedTopic}
              onChange={(e) => handleSelectTopicFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Topics ({allQuestions.length} Questions)</option>
              {availableTopics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>

          {/* Active Topic Tag */}
          {isTopicSpecific && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Drill: {selectedTopic}</span>
                <button
                  onClick={clearTopicFilter}
                  className="hover:text-rose-600 ml-1 p-0.5 rounded-md"
                  title="Clear topic filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Practice Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-4">
        
        {/* Notice when topic requested has no matches in the database */}
        {isTopicSpecific && !hasExactMatches && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div>
              <p className="font-bold">No direct questions tagged "{selectedTopic}" found in the database yet.</p>
              <p className="text-[11px] opacity-80 mt-0.5">Showing general {selectedSubject} questions instead. You can select another topic from the dropdown.</p>
            </div>
            <button
              onClick={clearTopicFilter}
              className="px-3 py-1 bg-amber-200 dark:bg-amber-900/80 hover:bg-amber-300 rounded-lg font-bold text-[11px] shrink-0 ml-2"
            >
              Show All Topics
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-semibold">Loading questions from database...</p>
          </div>
        ) : currentQ ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark space-y-6">
            
            {/* Question Progress & Topic */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                {currentQ.syllabusTopic || `${selectedSubject} Practice`}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Question {currentIndex + 1} of {filteredQuestions.length}
              </span>
            </div>

            {/* Question Text */}
            <div className="py-4 text-slate-900 dark:text-white font-medium text-base sm:text-lg leading-relaxed">
              <MathRenderer content={currentQ.questionText} />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options?.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === currentQ.correctAnswerIndex;
                const isUserMistake = isSelected && !isCorrect;

                let borderStyle = 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700';
                let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

                if (isAnswerRevealed) {
                  if (isCorrect) {
                    borderStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40';
                    badgeStyle = 'bg-emerald-600 text-white';
                  } else if (isUserMistake) {
                    borderStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40';
                    badgeStyle = 'bg-rose-600 text-white';
                  }
                } else if (isSelected) {
                  borderStyle = 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/50';
                  badgeStyle = 'bg-brand-600 text-white';
                }

                return (
                  <button
                    key={i}
                    disabled={isAnswerRevealed}
                    onClick={() => handleSelectOption(i)}
                    className={`w-full flex items-center p-4 sm:p-5 rounded-2xl border-2 text-left transition-all ${borderStyle}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 ${badgeStyle}`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="ml-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <MathRenderer content={opt} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Feedback & Derivation Accordion */}
            {isAnswerRevealed && (
              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-850 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedOption === currentQ.correctAnswerIndex ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Correct Answer</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" />
                        <span>Incorrect • Added to Weakness Bucket</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Option {String.fromCharCode(65 + currentQ.correctAnswerIndex)}
                  </span>
                </div>

                {currentQ.explanation && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{currentQ.explanation.coreConcept}</span>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-brand-500 whitespace-pre-line">
                      <MathRenderer content={currentQ.explanation.steps || ''} />
                    </div>

                    {currentQ.explanation.pitfall && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-bold">⚠️ Typical Pitfall: </span>
                        {currentQ.explanation.pitfall}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() => {
                  setSelectedOption(null);
                  setIsAnswerRevealed(false);
                }}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Reset this question"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                disabled={currentIndex === filteredQuestions.length - 1}
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <div className="py-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 font-bold text-sm">No practice questions available for this selection.</p>
            <button
              onClick={clearTopicFilter}
              className="px-6 py-2.5 bg-brand-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* Formula Vault Drawer */}
      <FormulaVaultDrawer
        isOpen={formulaVaultOpen}
        onClose={() => setFormulaVaultOpen(false)}
      />

    </div>
  );
};
