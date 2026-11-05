import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExamHistoryItem } from '../types';
import {
  Flame,
  ArrowRight,
  Play,
  BookOpen,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  History as HistoryIcon
} from 'lucide-react';
import { FlashMasterModal } from '../components/dashboard/FlashMasterModal';
import { FormulaVaultDrawer } from '../components/tools/FormulaVaultDrawer';
import { SyllabusHeatmap } from '../components/dashboard/SyllabusHeatmap';

export const DashboardPage: React.FC = () => {
  const { user, userData } = useAuth();
  const [recentExams, setRecentExams] = useState<ExamHistoryItem[]>([]);
  const [weaknessCount, setWeaknessCount] = useState<number>(0);
  const [flashMasterOpen, setFlashMasterOpen] = useState(false);
  const [formulaVaultOpen, setFormulaVaultOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch recent exams
        const histQuery = query(
          collection(db, 'users', user.uid, 'examHistory'),
          orderBy('timestamp', 'desc'),
          limit(3)
        );
        const histSnap = await getDocs(histQuery);
        const exams = histSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExamHistoryItem));
        setRecentExams(exams);

        // Fetch weakness bucket count
        const weakSnap = await getDocs(collection(db, 'users', user.uid, 'weaknessBucket'));
        setWeaknessCount(weakSnap.size);
      } catch (e) {
        console.error('Error loading dashboard metrics:', e);
      }
    };

    fetchDashboardData();
  }, [user]);

  const aggregateScore = userData?.aggregateScore ?? 0;
  const combination = userData?.combination || ['Physics', 'Chemistry', 'Mathematics'];
  const mastery = userData?.mastery || {};
  const grades = userData?.subjectGrades || {};
  const hasRisk = userData?.hasAdmissionRisk || false;
  const bonusAwarded = userData?.bonusPointAwarded || false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Welcome Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-[11px] font-black uppercase tracking-wider mb-2">
                <span>{userData?.targetUniversity || 'Target University'}</span>
                <span>•</span>
                <span>{userData?.targetCourse || 'Target Course'}</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                Welcome, {userData?.username || 'Candidate'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {userData?.tagline || '16 Points Cockpit • Spaced Repetition Mode Active'}
              </p>
            </div>

            {/* Daily Streak & Quick CTA */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-amber-700 dark:text-amber-300">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
                <div className="text-left">
                  <div className="text-xs font-black leading-none">{userData?.dailyStreak || 1} Days</div>
                  <div className="text-[9px] text-amber-600/80 dark:text-amber-400 font-bold uppercase tracking-wider">Practice Streak</div>
                </div>
              </div>

              <Link
                to="/exam?mode=marathon"
                className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>3-Subject Marathon</span>
              </Link>

              <Link
                to="/exam"
                className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Exam</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cockpit Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* 1. JUPEB AGGREGATE POINT GAUGE & READINESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Aggregate Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
                  Official JUPEB Point Projection
                </span>
                {bonusAwarded && (
                  <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-black flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    +1 Bonus Point Active
                  </span>
                )}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-6">
                <div className="font-display font-black text-5xl sm:text-7xl tracking-tight">
                  {aggregateScore.toFixed(1)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-brand-200">
                  / 16.0 Max Aggregate Points
                </div>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-brand-100 max-w-xl leading-relaxed">
                Calculated from your confidence-weighted mock examinations across {combination.join(', ')}.
                {hasRisk 
                  ? ' ⚠️ Notice: You currently have a projected F-Grade in one subject. Address flagged weaknesses to qualify for the 16th point.'
                  : ' Projected performance is on track for direct entry admission.'}
              </p>
            </div>

            {/* Quick Actions at Bottom of Hero Card */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setFlashMasterOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <BrainCircuit className="w-4 h-4 text-amber-300" />
                <span>Flash-Master ({weaknessCount} Weaknesses)</span>
              </button>

              <button
                onClick={() => setFormulaVaultOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-brand-300" />
                <span>Formula Vault (V)</span>
              </button>
            </div>
          </div>

          {/* Admission Probability & Weakness Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                  Admission Probability
                </h3>
                {hasRisk ? (
                  <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="py-4 text-center">
                <div className={`text-4xl font-display font-black ${
                  aggregateScore >= 12 ? 'text-emerald-600 dark:text-emerald-400' :
                  aggregateScore >= 8 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                }`}>
                  {aggregateScore >= 12 ? 'HIGH' : aggregateScore >= 8 ? 'MODERATE' : 'INITIALIZING'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  for {userData?.targetCourse || 'Target Program'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 mt-4 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Weakness Bucket:</span>
                  <span className="font-bold text-rose-500">{weaknessCount} Concepts</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>16th Point Bonus:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {bonusAwarded ? 'Earned (+1 Pt)' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/practice"
              className="mt-6 w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <span>Practice Question Bank</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. SUBJECT MASTERY CARDS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white">
              Subject Combination Mastery
            </h2>
            <Link to="/profile" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Change Combination
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {combination.map((sub) => {
              const subKey = sub.toLowerCase();
              const subMastery = Math.round((mastery[subKey] ?? 0) * 100);
              const subGrade = grades[subKey] || '—';

              return (
                <div 
                  key={sub}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                        {sub}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                        subGrade === 'A' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        subGrade === 'B' || subGrade === 'C' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400' :
                        subGrade === 'D' || subGrade === 'E' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' :
                        subGrade === 'F' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        Grade {subGrade}
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span>Mastery Level</span>
                        <span>{subMastery}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-brand-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(subMastery, 5)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <Link
                      to={`/practice?subject=${encodeURIComponent(subKey)}`}
                      className="flex-1 py-2 text-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Practice
                    </Link>
                    <Link
                      to={`/exam?subject=${encodeURIComponent(subKey)}`}
                      className="flex-1 py-2 text-center rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 text-xs font-bold text-brand-600 dark:text-brand-400 transition-colors"
                    >
                      Mock Test
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. SYLLABUS DIAGNOSTIC HEATMAP */}
        <SyllabusHeatmap />

        {/* 4. RECENT MOCK RUNS */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <HistoryIcon className="w-5 h-5 text-brand-600" />
              <h2 className="font-display font-black text-xl text-slate-900 dark:text-white">
                Recent Mock Simulation Logs
              </h2>
            </div>
            <Link to="/history" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
              View All History &rarr;
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <div className="text-4xl">⏱️</div>
              <p className="text-sm font-semibold">No mock simulations taken yet.</p>
              <Link
                to="/exam"
                className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider"
              >
                Launch First CBT Mock
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentExams.map((exam) => (
                <div key={exam.id} className="py-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {exam.subject} ({exam.year || '2024'})
                    </h4>
                    <p className="text-xs text-slate-400">
                      {new Date(exam.timestamp).toLocaleDateString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })} • {exam.mode}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {exam.score} / {exam.maxScore}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        {Math.round((exam.score / exam.maxScore) * 100)}%
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs">
                      Grade {exam.grade || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modals & Drawers */}
      <FlashMasterModal
        isOpen={flashMasterOpen}
        onClose={() => setFlashMasterOpen(false)}
      />

      <FormulaVaultDrawer
        isOpen={formulaVaultOpen}
        onClose={() => setFormulaVaultOpen(false)}
      />
    </div>
  );
};

