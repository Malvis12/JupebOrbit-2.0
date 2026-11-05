import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, collectionGroup, getDocs, addDoc, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { orbitAudio } from '../lib/orbitAudio';
import { updateAggregateScore } from '../lib/scoreEngine';
import { Question, WeaknessItem } from '../types';
import { MathRenderer } from '../components/common/MathRenderer';
import { 
  ArrowLeft, 
  Sparkles, 
  Award, 
  RotateCcw, 
  ChevronRight,
  Sun,
  Flame,
  Zap,
  Clock,
  Target,
  Loader2,
  CheckCircle2
} from 'lucide-react';

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "fb-1",
    questionText: "Which fundamental law of physics is expressed as $\\Delta U = Q - W$?",
    options: ["First Law of Thermodynamics", "Second Law of Thermodynamics", "Zeroth Law of Thermodynamics", "Carnot's Principle"],
    correctAnswerIndex: 0,
    syllabusTopic: "Thermodynamics",
    subject: "physics",
    explanation: {
      coreConcept: "Conservation of Energy in Thermal Systems",
      steps: "The First Law states that the change in internal energy ($\\Delta U$) equals heat added ($Q$) minus work done by system ($W$).",
      pitfall: "Confusing the sign convention for work done on vs. by the system."
    }
  },
  {
    id: "fb-2",
    questionText: "If $\\log_{10}(x) + \\log_{10}(x - 3) = 1$, what is the real value of $x$?",
    options: ["$2$", "$5$", "$-2$", "$10$"],
    correctAnswerIndex: 1,
    syllabusTopic: "Logarithmic Equations",
    subject: "mathematics",
    explanation: {
      coreConcept: "Product Rule of Logarithms",
      steps: "$\\log_{10}[x(x-3)] = 1 \\implies x^2 - 3x = 10^1 = 10$.\n$x^2 - 3x - 10 = 0 \\implies (x - 5)(x + 2) = 0$.\nSince $\\log$ requires positive argument, $x = 5$.",
      pitfall: "Forgetting to discard negative extraneous roots for logarithms."
    }
  },
  {
    id: "fb-3",
    questionText: "What type of hybridization exists in the central Carbon atom of Ethene ($\\text{C}_2\\text{H}_4$)?",
    options: ["$sp$", "$sp^2$", "$sp^3$", "$sp^3d$"],
    correctAnswerIndex: 1,
    syllabusTopic: "Chemical Bonding & Hybridization",
    subject: "chemistry",
    explanation: {
      coreConcept: "Orbital Hybridization",
      steps: "In ethene, each carbon is bonded to two hydrogens and one other carbon via a double bond (3 $\\sigma$-bonds, 1 $\\pi$-bond) \\implies $sp^2$ planar geometry.",
      pitfall: "Counting $\\pi$-bonds into hybridization geometry."
    }
  }
];

export const QuizPage: React.FC = () => {
  const { user, userData, updateProfileData } = useAuth();
  
  // Quiz Generator State
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [weaknessItems, setWeaknessItems] = useState<WeaknessItem[]>([]);
  
  // Execution State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Speed Drill Mode (Blitz: 60s per question)
  const [speedDrillActive, setSpeedDrillActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Streak feedback
  const [streakEarned, setStreakEarned] = useState<number | null>(null);

  const combination = userData?.combination && userData.combination.length > 0
    ? userData.combination
    : ['Physics', 'Chemistry', 'Mathematics'];

  // 1. Fetch dynamic questions from Firestore tailored to student's 3-subject combination + Weakness Bucket
  const generateDailyMix = async () => {
    setLoading(true);
    setQuizFinished(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setSecondsRemaining(60);

    try {
      // 1. Fetch user's weakness bucket
      let userWeaknesses: WeaknessItem[] = [];
      if (user) {
        try {
          const weakSnap = await getDocs(collection(db, 'users', user.uid, 'weaknessBucket'));
          userWeaknesses = weakSnap.docs.map(d => ({ id: d.id, ...d.data() } as WeaknessItem));
          setWeaknessItems(userWeaknesses);
        } catch (we) {
          console.warn('Weakness bucket query warning:', we);
        }
      }

      // 2. Query question bank via collectionGroup
      const qSnap = await getDocs(collectionGroup(db, 'questions'));
      const questionsBySubj: Record<string, Question[]> = {};

      qSnap.forEach(d => {
        const raw = d.data();
        const pathParts = d.ref.path.split('/');
        let sName = (pathParts[1] || raw.subject || 'physics').toLowerCase();
        if (sName === 'math') sName = 'mathematics';
        if (sName === 'phys') sName = 'physics';
        if (sName === 'chem') sName = 'chemistry';
        if (sName === 'bio') sName = 'biology';
        if (sName === 'econ') sName = 'economics';
        if (sName === 'govt') sName = 'government';

        if (!questionsBySubj[sName]) questionsBySubj[sName] = [];

        let rawOpts = Array.isArray(raw.options) ? raw.options : [];
        rawOpts = rawOpts.map((opt: string) => typeof opt === 'string' ? opt.replace(/^[A-D][).:\s\-]+/i, '').trim() : opt);

        questionsBySubj[sName].push({
          id: d.id,
          questionText: raw.questionText || raw.question || '',
          options: rawOpts,
          correctAnswerIndex: raw.correctAnswerIndex ?? raw.correct ?? 0,
          syllabusTopic: raw.syllabusTopic || raw.topic || 'General Practice',
          subject: sName,
          year: pathParts[3] || raw.year || '2025',
          explanation: raw.explanation || {
            coreConcept: raw.syllabusTopic || 'JUPEB Concept',
            steps: typeof raw.explanation === 'string' ? raw.explanation : 'Comprehensive derivation available.',
            pitfall: raw.pitfall || ''
          }
        });
      });

      // 3. Assemble dynamic mix: 2 questions per subject in combination (Total 6 questions)
      // Prioritizing topics present in user's weakness bucket
      const selectedMix: Question[] = [];
      const weaknessTopics = new Set(userWeaknesses.map(w => (w.topic || '').toLowerCase().trim()));

      for (const subj of combination) {
        const sKey = subj.toLowerCase();
        const availableInSubj = questionsBySubj[sKey] || [];

        if (availableInSubj.length > 0) {
          // Shuffle available questions
          const shuffled = [...availableInSubj].sort(() => 0.5 - Math.random());
          // Sort questions matching weakness topics first (Spaced Repetition)
          shuffled.sort((a, b) => {
            const aIsWeak = weaknessTopics.has((a.syllabusTopic || '').toLowerCase().trim()) ? 1 : 0;
            const bIsWeak = weaknessTopics.has((b.syllabusTopic || '').toLowerCase().trim()) ? 1 : 0;
            return bIsWeak - aIsWeak;
          });

          // Take up to 2 questions per subject
          selectedMix.push(...shuffled.slice(0, 2));
        }
      }

      if (selectedMix.length > 0) {
        // Interleave / shuffle the mix so subjects alternate
        setQuestions(selectedMix.sort(() => 0.5 - Math.random()));
      } else {
        setQuestions(FALLBACK_QUESTIONS);
      }
    } catch (err) {
      console.error('Error generating daily mix:', err);
      setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateDailyMix();
  }, [user]);

  // Speed Drill Timer Countdown
  useEffect(() => {
    if (!speedDrillActive || isAnswered || quizFinished || loading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Time expired for this question: Auto-fail current question
          handleSelect(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [speedDrillActive, isAnswered, quizFinished, loading, currentIndex]);

  const currentQ = questions[currentIndex] || FALLBACK_QUESTIONS[0];

  // Check if current question targets a known weakness
  const isWeaknessQuestion = weaknessItems.some(
    w => (w.topic && currentQ.syllabusTopic && w.topic.toLowerCase().trim() === currentQ.syllabusTopic.toLowerCase().trim()) ||
         w.qId === currentQ.id
  );

  const handleSelect = async (idx: number) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctAnswerIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
      orbitAudio.playCorrect();

      // If this was a weakness topic and answered correctly, reward spaced repetition progression
      if (user && isWeaknessQuestion) {
        try {
          const matchingWeakness = weaknessItems.find(
            w => (w.topic && currentQ.syllabusTopic && w.topic.toLowerCase().trim() === currentQ.syllabusTopic.toLowerCase().trim()) ||
                 w.qId === currentQ.id
          );
          if (matchingWeakness) {
            const wRef = doc(db, 'users', user.uid, 'weaknessBucket', matchingWeakness.id);
            if ((matchingWeakness.srsLevel || 1) >= 3) {
              await deleteDoc(wRef); // Graduated from weakness bucket!
            } else {
              await updateDoc(wRef, {
                srsLevel: (matchingWeakness.srsLevel || 1) + 1,
                lastCorrect: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.warn('SRS update notice:', e);
        }
      }
    } else {
      orbitAudio.playIncorrect();
      // Add to user's weakness bucket if missed
      if (user) {
        try {
          const qId = currentQ.id || Math.random().toString(36).substring(7);
          await setDoc(doc(db, 'users', user.uid, 'weaknessBucket', qId), {
            title: currentQ.questionText,
            topic: currentQ.syllabusTopic || 'Daily Mix Concept',
            qId,
            subject: currentQ.subject || 'physics',
            options: currentQ.options || [],
            correctAnswerIndex: currentQ.correctAnswerIndex ?? 0,
            explanation: currentQ.explanation || null,
            addedAt: new Date().toISOString(),
            source: 'Daily Breakfast Mix',
            srsLevel: 1,
            nextReviewDate: new Date(Date.now() + 86400000).toISOString()
          }, { merge: true });
        } catch (e) {
          console.warn('Weakness record notice:', e);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setSecondsRemaining(60);
    } else {
      finishDailyQuiz();
    }
  };

  // Complete Quiz & Record into Firestore Exam History & Update Daily Streak
  const finishDailyQuiz = async () => {
    setQuizFinished(true);
    if (!user) return;

    setSubmitting(true);
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const lastQuizDate = userData?.lastDailyQuizDate;

      // 1. Calculate Streak
      let newStreak = userData?.dailyStreak || 0;
      if (lastQuizDate !== todayString) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        if (lastQuizDate === yesterdayString) {
          newStreak += 1;
        } else {
          newStreak = 1; // Streak reset or first time
        }

        setStreakEarned(newStreak);

        await updateProfileData({
          dailyStreak: newStreak,
          lastDailyQuizDate: todayString
        });
      } else {
        setStreakEarned(newStreak);
      }

      // 2. Persist to users/{uid}/examHistory
      const finalScore = score + (selectedOption === currentQ.correctAnswerIndex ? 1 : 0);
      const totalQ = questions.length;
      const pct = Math.round((finalScore / totalQ) * 100);
      let grade = 'F';
      if (pct >= 70) grade = 'A';
      else if (pct >= 60) grade = 'B';
      else if (pct >= 50) grade = 'C';
      else if (pct >= 45) grade = 'D';
      else if (pct >= 40) grade = 'E';

      await addDoc(collection(db, 'users', user.uid, 'examHistory'), {
        subject: 'Daily Mix',
        year: '2025',
        score: finalScore,
        maxScore: totalQ,
        grade,
        mode: speedDrillActive ? 'Daily Mix (Speed Drill)' : 'Daily Mix (Standard)',
        timestamp: now.toISOString()
      });

      // 3. Trigger Professional Score Engine recalculation
      await updateAggregateScore(user.uid);
    } catch (err) {
      console.error('Error saving daily quiz history:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Daily Breakfast Mix</span>
              </h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length} • {combination.join(' + ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Drill Toggle */}
            <button
              onClick={() => {
                if (!isAnswered && currentIndex === 0) {
                  setSpeedDrillActive(!speedDrillActive);
                  setSecondsRemaining(60);
                }
              }}
              disabled={isAnswered || currentIndex > 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                speedDrillActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              } ${isAnswered || currentIndex > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="60s per question blitz pacing drill"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Speed Drill {speedDrillActive ? 'ON' : 'OFF'}</span>
            </button>

            {/* Score Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs">
              Score: {score}
            </div>
          </div>
        </div>

        {/* Progress Bar Segments */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < currentIndex || (i === currentIndex && isAnswered)
                    ? 'bg-brand-600'
                    : i === currentIndex
                    ? 'bg-brand-300 dark:bg-brand-700'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark text-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-4" />
            <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
              Synthesizing Today's Adaptive Mix...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Selecting high-yield questions across {combination.join(', ')} and targeting your Spaced Repetition bucket.
            </p>
          </div>
        ) : !quizFinished ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark space-y-6 animate-in fade-in">
            
            {/* Meta & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-[11px] uppercase tracking-wider">
                  {currentQ.subject || 'Combination'}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {currentQ.syllabusTopic}
                </span>
                {isWeaknessQuestion && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Targeted Weakness
                  </span>
                )}
              </div>

              {/* Speed Drill Countdown Clock */}
              {speedDrillActive && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold ${
                  secondsRemaining <= 15
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{secondsRemaining}s</span>
                </div>
              )}
            </div>

            {/* Question Text */}
            <div className="py-2 text-slate-900 dark:text-white font-medium text-base sm:text-lg leading-relaxed">
              <MathRenderer content={currentQ.questionText} />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === currentQ.correctAnswerIndex;

                let btnStyle = 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900';
                let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100';
                    badgeStyle = 'bg-emerald-500 text-white';
                  } else if (isSelected) {
                    btnStyle = 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100';
                    badgeStyle = 'bg-rose-500 text-white';
                  } else {
                    btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
                  }
                }

                const optionLetter = String.fromCharCode(65 + i);

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={isAnswered}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${btnStyle}`}
                  >
                    <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}>
                      {optionLetter}
                    </span>
                    <div className="flex-1 text-sm sm:text-base font-normal pt-0.5">
                      <MathRenderer content={opt} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Derivation Principle / Explanation Reveal */}
            {isAnswered && currentQ.explanation && (
              <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Derivation Principle & Core Concept</span>
                </div>
                {currentQ.explanation.coreConcept && (
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentQ.explanation.coreConcept}
                  </p>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <MathRenderer content={currentQ.explanation.steps || ''} />
                </p>
                {currentQ.explanation.pitfall && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 pt-1">
                    <strong>Distractor Alert:</strong> {currentQ.explanation.pitfall}
                  </p>
                )}
              </div>
            )}

            {/* Next / Finish Button */}
            {isAnswered && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-brand-500/20 animate-in fade-in"
                >
                  <span>{currentIndex === questions.length - 1 ? 'Finish Daily Mix' : 'Next Question'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Completion Screen with Streak Celebration */
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display font-black text-3xl text-slate-900 dark:text-white">
                Daily Breakfast Mix Complete!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Completed across {combination.join(' • ')} with real-time derivation mastery recorded.
              </p>
            </div>

            {/* Streak & Score Banner */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto py-2">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                  <Flame className="w-5 h-5 fill-current animate-bounce" />
                  <span className="text-2xl font-black">{streakEarned || userData?.dailyStreak || 1}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Day Streak Active
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-2xl font-black">{score} / {questions.length}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Score ({Math.round((score / questions.length) * 100)}%)
                </p>
              </div>
            </div>

            {submitting && (
              <div className="flex items-center justify-center gap-2 text-xs text-brand-600 font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating your official JUPEB Cockpit readiness...</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={generateDailyMix}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Another Mix</span>
              </button>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-brand-500/20 text-center"
              >
                Return to Cockpit
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};