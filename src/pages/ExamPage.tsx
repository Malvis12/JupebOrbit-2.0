import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, collectionGroup, getDocs, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateAggregateScore } from '../lib/scoreEngine';
import { orbitAudio } from '../lib/orbitAudio';
import { Question } from '../types';
import { MathRenderer } from '../components/common/MathRenderer';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  Sparkles,
  Volume2,
  VolumeX,
  Headphones,
  Flame,
  Layers
} from 'lucide-react';

const COMPREHENSIVE_QUESTIONS: Record<string, Question[]> = {
  physics: [],
  mathematics: [],
  chemistry: [],
  biology: []
};

export const ExamPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const combination = userData?.combination || ['Physics', 'Chemistry', 'Mathematics'];
  const initialMode = searchParams.get('mode') === 'marathon' ? 'marathon' : 'single';

  // Exam Configuration State
  const [examMode, setExamMode] = useState<'single' | 'marathon'>(initialMode);
  const [singleSubject, setSingleSubject] = useState(
    searchParams.get('subject') || combination[0]?.toLowerCase() || 'physics'
  );
  const [year, setYear] = useState(searchParams.get('year') || '2025');
  
  // Execution State
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active Subject in Marathon Mock
  const [activeSubject, setActiveSubject] = useState<string>(
    combination[0]?.toLowerCase() || 'physics'
  );

  // Question Repository per Subject
  const [subjectQuestions, setSubjectQuestions] = useState<Record<string, Question[]>>({});
  const [currentIndices, setCurrentIndices] = useState<Record<string, number>>({});
  const [subjectAnswers, setSubjectAnswers] = useState<Record<string, Record<number, number>>>({});
  const [subjectFlags, setSubjectFlags] = useState<Record<string, Set<number>>>({});

  // Timer & Audio Settings
  const [timeLeft, setTimeLeft] = useState(3600); // 60 mins for single, 180 mins for marathon
  const [proctorEnabled, setProctorEnabled] = useState(orbitAudio.isProctorEnabled());
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Final Results Breakdown
  const [subjectResults, setSubjectResults] = useState<Record<string, {
    score: number;
    maxScore: number;
    accuracy: number;
    grade: string;
    points: number;
  }>>({});
  const [totalAggregatePoints, setTotalAggregatePoints] = useState(0);
  const [bonusPointAwarded, setBonusPointAwarded] = useState(false);
  const [allMistakes, setAllMistakes] = useState<Question[]>([]);

  // Load questions for subjects
  const loadExamData = async (mode: 'single' | 'marathon', sub: string, yr: string) => {
    setLoading(true);
    const targetSubjects = mode === 'marathon'
      ? combination.map(s => s.toLowerCase())
      : [sub.toLowerCase()];

    const loadedMap: Record<string, Question[]> = {};
    const initIndices: Record<string, number> = {};
    const initAnswers: Record<string, Record<number, number>> = {};
    const initFlags: Record<string, Set<number>> = {};

    // 1. Fetch available questions across subjects
    try {
      const qSnap = await getDocs(collectionGroup(db, 'questions'));
      const pool: Record<string, Record<string, Question[]>> = {};

      qSnap.forEach(d => {
        const pathParts = d.ref.path.split('/');
        const raw = d.data();
        let sName = (pathParts[1] || raw.subject || '').toLowerCase();
        if (sName === 'math') sName = 'mathematics';
        if (sName === 'phys') sName = 'physics';
        if (sName === 'chem') sName = 'chemistry';
        if (sName === 'bio') sName = 'biology';
        if (sName === 'econ') sName = 'economics';
        if (sName === 'govt') sName = 'government';

        const qYear = pathParts[3] || raw.year || '2025';

        if (!pool[sName]) pool[sName] = {};
        if (!pool[sName][qYear]) pool[sName][qYear] = [];

        let opts = Array.isArray(raw.options) ? raw.options : [];
        opts = opts.map((opt: string) => typeof opt === 'string' ? opt.replace(/^[A-D][).:\s\-]+/i, '').trim() : opt);

        pool[sName][qYear].push({
          id: d.id,
          ...raw,
          subject: sName,
          year: qYear,
          options: opts,
          correctAnswerIndex: raw.correctAnswerIndex ?? raw.correct ?? 0,
          questionText: raw.questionText || raw.question || ''
        } as Question);
      });

      for (const s of targetSubjects) {
        initIndices[s] = 0;
        initAnswers[s] = {};
        initFlags[s] = new Set();

        const subjYears = pool[s] || {};
        // Match chosen year or grab the latest year available with questions
        let available = subjYears[yr] || [];
        if (available.length === 0) {
          const sortedYears = Object.keys(subjYears).sort((a, b) => b.localeCompare(a));
          if (sortedYears.length > 0) {
            available = subjYears[sortedYears[0]] || [];
          }
        }

        if (available.length > 0) {
          loadedMap[s] = available;
        } else {
          loadedMap[s] = COMPREHENSIVE_QUESTIONS[s] || COMPREHENSIVE_QUESTIONS.physics;
        }
      }
    } catch (e) {
      console.warn('Error reading exam question pool:', e);
      for (const s of targetSubjects) {
        initIndices[s] = 0;
        initAnswers[s] = {};
        initFlags[s] = new Set();
        loadedMap[s] = COMPREHENSIVE_QUESTIONS[s] || COMPREHENSIVE_QUESTIONS.physics;
      }
    }

    setSubjectQuestions(loadedMap);
    setCurrentIndices(initIndices);
    setSubjectAnswers(initAnswers);
    setSubjectFlags(initFlags);
    setActiveSubject(targetSubjects[0]);
    setLoading(false);
  };

  const startExam = async () => {
    await loadExamData(examMode, singleSubject, year);
    const initialTime = examMode === 'marathon' ? 10800 : 3600; // 3 hours or 1 hour
    setTimeLeft(initialTime);
    setExamStarted(true);
    setExamFinished(false);
    setIsReviewMode(false);

    if (proctorEnabled) {
      const modeText = examMode === 'marathon' ? 'Three Subject Marathon Mock' : `${singleSubject} Mock Exam`;
      orbitAudio.speakProctor(`Welcome candidate. Your ${modeText} has started. Good luck.`);
    }
  };

  // Submit Exam Function
  const submitExam = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    orbitAudio.stopAmbientSound();
    setAmbientPlaying(false);

    const results: Record<string, {
      score: number;
      maxScore: number;
      accuracy: number;
      grade: string;
      points: number;
    }> = {};

    let totalPoints = 0;
    let hasFGrade = false;
    const mistakes: Question[] = [];

    for (const sub in subjectQuestions) {
      const qList = subjectQuestions[sub];
      const ans = subjectAnswers[sub] || {};
      let subScore = 0;

      qList.forEach((q, idx) => {
        if (ans[idx] === q.correctAnswerIndex) {
          subScore++;
        } else {
          mistakes.push(q);
        }
      });

      const acc = qList.length > 0 ? Math.round((subScore / qList.length) * 100) : 0;
      let grade = 'F';
      let pts = 0;

      if (acc >= 70) { grade = 'A'; pts = 5; }
      else if (acc >= 60) { grade = 'B'; pts = 4; }
      else if (acc >= 50) { grade = 'C'; pts = 3; }
      else if (acc >= 45) { grade = 'D'; pts = 2; }
      else if (acc >= 40) { grade = 'E'; pts = 1; }
      else { grade = 'F'; pts = 0; hasFGrade = true; }

      totalPoints += pts;
      results[sub] = {
        score: subScore,
        maxScore: qList.length,
        accuracy: acc,
        grade,
        points: pts
      };
    }

    // 16th Point Bonus rule: Award +1 if sitting 3 subjects and no F grades
    const evaluatedSubjectCount = Object.keys(results).length;
    let bonusPoint = 0;
    if (evaluatedSubjectCount >= 3 && !hasFGrade) {
      bonusPoint = 1;
    }

    const finalAggregate = Math.min(totalPoints + bonusPoint, 16);

    setSubjectResults(results);
    setBonusPointAwarded(bonusPoint > 0);
    setTotalAggregatePoints(finalAggregate);
    setAllMistakes(mistakes);
    setExamFinished(true);

    if (totalPoints >= (evaluatedSubjectCount * 3)) {
      orbitAudio.playCorrect();
    } else {
      orbitAudio.playIncorrect();
    }

    if (proctorEnabled) {
      orbitAudio.speakProctor(`Time has concluded. Your exam has been successfully graded.`);
    }

    // Save to Firestore
    if (user) {
      try {
        for (const sub in results) {
          const res = results[sub];
          await addDoc(collection(db, 'users', user.uid, 'examHistory'), {
            subject: sub.toUpperCase(),
            year,
            score: res.score,
            maxScore: res.maxScore,
            timestamp: new Date().toISOString(),
            mode: examMode === 'marathon' ? '3-Subject Marathon' : 'Speed Mock',
            grade: res.grade
          });
        }

        for (const m of mistakes.slice(0, 20)) {
          const qId = m.id || Math.random().toString(36).substring(7);
          await setDoc(doc(db, 'users', user.uid, 'weaknessBucket', qId), {
            title: m.questionText,
            topic: m.syllabusTopic || 'General Concept',
            qId,
            subject: m.subject || singleSubject || 'physics',
            options: m.options || [],
            correctAnswerIndex: m.correctAnswerIndex ?? 0,
            explanation: m.explanation || null,
            addedAt: new Date().toISOString(),
            source: examMode === 'marathon' ? 'Marathon Mock' : 'Speed Mock',
            srsLevel: 1,
            nextReviewDate: new Date().toISOString()
          }, { merge: true });
        }

        await updateAggregateScore(user.uid);
      } catch (err) {
        console.error('Error saving exam result:', err);
      }
    }
  }, [examMode, proctorEnabled, subjectAnswers, subjectQuestions, user, year]);

  // Timer Tick & Proctor Audio Milestones
  useEffect(() => {
    if (!examStarted || examFinished) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }

        // Proctor Audio Time Warnings
        if (prev === 1800) {
          orbitAudio.speakProctor("Attention candidate. You have thirty minutes remaining.");
        } else if (prev === 600) {
          orbitAudio.speakProctor("Ten minutes remaining. Please review your answers.");
        } else if (prev === 60) {
          orbitAudio.speakProctor("Final minute. Review flagged questions now.");
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examStarted, examFinished, submitExam]);

  // Current active subject questions & index
  const activeQuestions = subjectQuestions[activeSubject] || [];
  const currentIdx = currentIndices[activeSubject] || 0;
  const currentQ = activeQuestions[currentIdx];
  const currentAnswers = subjectAnswers[activeSubject] || {};
  const currentFlags = subjectFlags[activeSubject] || new Set();

  // Keyboard Navigation Engine
  useEffect(() => {
    if (!examStarted || examFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName)) return;
      const key = e.key.toUpperCase();

      if (['A', 'B', 'C', 'D'].includes(key) && !e.altKey && !e.ctrlKey) {
        const optIdx = key.charCodeAt(0) - 65;
        if (optIdx < (currentQ?.options?.length || 4)) {
          orbitAudio.playClick();
          setSubjectAnswers(prev => ({
            ...prev,
            [activeSubject]: { ...prev[activeSubject], [currentIdx]: optIdx }
          }));
        }
      } else if (['1', '2', '3', '4'].includes(key)) {
        const optIdx = parseInt(key) - 1;
        if (optIdx < (currentQ?.options?.length || 4)) {
          orbitAudio.playClick();
          setSubjectAnswers(prev => ({
            ...prev,
            [activeSubject]: { ...prev[activeSubject], [currentIdx]: optIdx }
          }));
        }
      } else if (key === 'N' || e.key === 'ArrowRight') {
        if (currentIdx < activeQuestions.length - 1) {
          setCurrentIndices(prev => ({ ...prev, [activeSubject]: currentIdx + 1 }));
        }
      } else if (key === 'P' || e.key === 'ArrowLeft') {
        if (currentIdx > 0) {
          setCurrentIndices(prev => ({ ...prev, [activeSubject]: currentIdx - 1 }));
        }
      } else if (key === 'F') {
        setSubjectFlags(prev => {
          const sSet = new Set(prev[activeSubject] || []);
          if (sSet.has(currentIdx)) sSet.delete(currentIdx);
          else sSet.add(currentIdx);
          return { ...prev, [activeSubject]: sSet };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestions.length, activeSubject, currentIdx, currentQ, examFinished, examStarted]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAmbient = () => {
    const isNowPlaying = orbitAudio.toggleAmbientSound();
    setAmbientPlaying(isNowPlaying);
  };

  const toggleProctor = () => {
    const isNowEnabled = orbitAudio.toggleProctorVoice();
    setProctorEnabled(isNowEnabled);
  };

  // ================= RENDER: PRE-EXAM CONFIGURATION =================
  if (!examStarted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>True-to-Life JUPEB CBT Simulator</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Configure Your CBT Session
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select between a Single Subject Speed Mock or the Full 3-Subject Marathon.
            </p>
          </div>

          <div className="space-y-6">
            {/* Mode Toggle Tabs */}
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setExamMode('single')}
                className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  examMode === 'single'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Single Subject (60 Mins)</span>
              </button>

              <button
                type="button"
                onClick={() => setExamMode('marathon')}
                className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  examMode === 'marathon'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>3-Subject Marathon (180 Mins)</span>
              </button>
            </div>

            {/* Single Subject Selection */}
            {examMode === 'single' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Subject
                </label>
                <select
                  value={singleSubject}
                  onChange={(e) => setSingleSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize"
                >
                  {combination.map((sub) => (
                    <option key={sub} value={sub.toLowerCase()}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-indigo-600" />
                  <span>Your 3-Subject Examination Bundle</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {combination.map(sub => (
                    <span key={sub} className="px-3 py-1 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                      {sub}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  You can jump freely between subjects during the 3-hour marathon via the top switcher tab.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Question Year / Standard
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="2025">2025 (Official JUPEB Series)</option>
                <option value="2024">2024 Past Examination</option>
                <option value="2023">2023 Past Examination</option>
                <option value="2022">2022 Past Examination</option>
              </select>
            </div>

            {/* Audio Settings Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">Voice Proctor & Time Warnings</h4>
                  <p className="text-[11px] text-slate-400">Audio countdown announcements at 30m, 10m, and 1m</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleProctor}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  proctorEnabled 
                    ? 'bg-brand-600 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {proctorEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <button
              onClick={startExam}
              disabled={loading}
              className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl shadow-brand-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? 'Assembling Examination...' : `Launch ${examMode === 'marathon' ? '3-Subject Marathon' : 'CBT Mock'}`}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ================= RENDER: ACTIVE EXAM SIMULATOR =================
  const activeSubjectList = examMode === 'marathon'
    ? combination.map(s => s.toLowerCase())
    : [singleSubject.toLowerCase()];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 select-none">
      
      {/* Review Banner */}
      {isReviewMode && (
        <div className="bg-amber-500 text-white py-2.5 px-4 text-center text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-4">
          <span>Review Mode Active: Viewing derivations and pitfalls</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold"
          >
            Exit to Dashboard
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Subject Tab Switcher in Marathon Mode */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {activeSubjectList.map((sub) => {
              const isCurrentSub = activeSubject === sub;
              const subAnsCount = Object.keys(subjectAnswers[sub] || {}).length;
              const subTotal = (subjectQuestions[sub] || []).length;

              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                    isCurrentSub
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{sub}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isCurrentSub ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {subAnsCount}/{subTotal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls: Audio Proctor, Ambient Sound, Countdown Timer, Submit */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
            {/* Ambient Sound Toggle */}
            <button
              onClick={toggleAmbient}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                ambientPlaying
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Ambient Exam Hall Sound (White Noise focus)"
            >
              <Headphones className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">{ambientPlaying ? 'Room Noise ON' : 'Room Noise'}</span>
            </button>

            {/* Voice Proctor Toggle */}
            <button
              onClick={toggleProctor}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 ${
                proctorEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Voice Proctor Time Announcements"
            >
              {proctorEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Countdown Timer */}
            {!isReviewMode && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${
                timeLeft < 600
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}

            {!isReviewMode && (
              <button
                onClick={submitExam}
                className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Submit Exam
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Main CBT Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Question Area (3 Cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark">
              
              {/* Question Header & Flagging */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-black text-xs uppercase tracking-wider">
                    {activeSubject}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    • {currentQ?.syllabusTopic || 'Standard Question'}
                  </span>
                </div>

                {!isReviewMode && (
                  <button
                    onClick={() => {
                      setSubjectFlags(prev => {
                        const sSet = new Set(prev[activeSubject] || []);
                        if (sSet.has(currentIdx)) sSet.delete(currentIdx);
                        else sSet.add(currentIdx);
                        return { ...prev, [activeSubject]: sSet };
                      });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      currentFlags.has(currentIdx)
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{currentFlags.has(currentIdx) ? 'Flagged (F)' : 'Flag (F)'}</span>
                  </button>
                )}
              </div>

              {/* Question Content */}
              <div className="py-6 text-slate-900 dark:text-white font-medium text-base sm:text-lg leading-relaxed">
                {currentQ ? (
                  <MathRenderer content={currentQ.questionText} />
                ) : (
                  <p>Loading question bank...</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ?.options?.map((opt, i) => {
                  const isSelected = currentAnswers[currentIdx] === i;
                  const isCorrect = i === currentQ.correctAnswerIndex;
                  const isUserMistake = isSelected && !isCorrect;

                  let borderStyle = 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700';
                  let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

                  if (isReviewMode) {
                    if (isCorrect) {
                      borderStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40';
                      badgeStyle = 'bg-emerald-600 text-white';
                    } else if (isUserMistake) {
                      borderStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40';
                      badgeStyle = 'bg-rose-600 text-white';
                    }
                  } else if (isSelected) {
                    borderStyle = 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/50 shadow-sm';
                    badgeStyle = 'bg-brand-600 text-white';
                  }

                  return (
                    <button
                      key={i}
                      disabled={isReviewMode}
                      onClick={() => {
                        orbitAudio.playClick();
                        setSubjectAnswers(prev => ({
                          ...prev,
                          [activeSubject]: { ...prev[activeSubject], [currentIdx]: i }
                        }));
                      }}
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

              {/* Review Mode Derivation Card */}
              {isReviewMode && currentQ?.explanation && (
                <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Mastery Derivation: {currentQ.explanation.coreConcept}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-3 border-l-2 border-brand-500">
                    <MathRenderer content={currentQ.explanation.steps || ''} />
                  </div>
                  {currentQ.explanation.pitfall && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 italic">
                      ⚠️ Pitfall: {currentQ.explanation.pitfall}
                    </p>
                  )}
                </div>
              )}

              {/* Navigation Bar */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIndices(prev => ({ ...prev, [activeSubject]: currentIdx - 1 }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  disabled={currentIdx === activeQuestions.length - 1}
                  onClick={() => setCurrentIndices(prev => ({ ...prev, [activeSubject]: currentIdx + 1 }))}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Question Palette Grid (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {activeSubject} Palette
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {Object.keys(currentAnswers).length} / {activeQuestions.length} Answered
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {activeQuestions.map((_, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = currentAnswers[idx] !== undefined;
                  const isFlagged = currentFlags.has(idx);

                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200';

                  if (isAnswered) {
                    bgClass = 'bg-brand-600 text-white font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndices(prev => ({ ...prev, [activeSubject]: idx }))}
                      className={`relative w-full aspect-square rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${bgClass} ${
                        isCurrent ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instructions */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px] text-slate-400">
                <p>• Keys <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">A-D</kbd> or <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">1-4</kbd> select option</p>
                <p>• Keys <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">N</kbd> / <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">P</kbd> navigate</p>
                <p>• Key <kbd className="px-1 bg-slate-100 dark:bg-slate-800 rounded font-mono">F</kbd> toggles flag</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= MODAL: COMBINED SCORECARD ================= */}
      {examFinished && !isReviewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-10 text-center animate-in zoom-in-95 duration-200 my-auto">
            
            <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              {examMode === 'marathon' ? '3-Subject Marathon Complete' : 'Exam Simulation Complete'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Official JUPEB Point Algorithm & Diagnostic Evaluation
            </p>

            {/* Combined Aggregate Box */}
            <div className="my-6 p-6 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
                <span>Official Aggregate Projection</span>
                {bonusPointAwarded && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    +1 Bonus Point Applied
                  </span>
                )}
              </div>

              <div className="text-4xl sm:text-6xl font-display font-black tracking-tight my-2">
                {totalAggregatePoints.toFixed(1)} <span className="text-xl sm:text-2xl font-bold text-brand-200">/ 16.0 Pts</span>
              </div>

              <p className="text-xs text-brand-100 mt-2">
                {totalAggregatePoints >= 12
                  ? '🌟 Outstanding! Projected at highest percentile for direct entry into your target course.'
                  : 'Consistent repetition of weak topics will propel this score into Grade A territory.'}
              </p>
            </div>

            {/* Subject Breakdown Table */}
            <div className="space-y-3 mb-6 text-left">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400">
                Subject Performance Breakdown
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-850/60">
                {Object.keys(subjectResults).map((sub) => {
                  const r = subjectResults[sub];
                  return (
                    <div key={sub} className="p-4 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                          {sub}
                        </h5>
                        <p className="text-xs text-slate-400">
                          {r.score} / {r.maxScore} correct ({r.accuracy}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                          {r.points} Pts
                        </span>
                        <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                          r.grade === 'A' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
                          r.grade === 'B' || r.grade === 'C' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          Grade {r.grade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {allMistakes.length > 0
                ? `${allMistakes.length} missed concepts have been automatically queued in your Weakness Bucket for Spaced Repetition mastery.`
                : 'Zero mistakes logged across this examination series!'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setIsReviewMode(true);
                  setCurrentIndices(prev => {
                    const reset: Record<string, number> = {};
                    for (const s in prev) reset[s] = 0;
                    return reset;
                  });
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Review Derivations
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-500/20 transition-all"
              >
                Return to Cockpit
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
