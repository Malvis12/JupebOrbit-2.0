import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExamHistoryItem } from '../types';
import { 
  History as HistoryIcon, 
  ArrowRight,
  Filter,
  Calendar
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { user, userData } = useAuth();
  const [exams, setExams] = useState<ExamHistoryItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const histQuery = query(
          collection(db, 'users', user.uid, 'examHistory'),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(histQuery);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamHistoryItem));
        setExams(list);
      } catch (err) {
        console.error('Error loading exam history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const combination = userData?.combination || ['Physics', 'Chemistry', 'Mathematics'];

  const filteredExams = filterSubject === 'all'
    ? exams
    : exams.filter(e => e.subject.toLowerCase() === filterSubject.toLowerCase());

  const totalExams = exams.length;
  const avgAccuracy = totalExams > 0 
    ? Math.round(exams.reduce((acc, curr) => acc + ((curr.score / curr.maxScore) * 100), 0) / totalExams)
    : 0;
  const bestScore = exams.reduce((max, curr) => {
    const acc = Math.round((curr.score / curr.maxScore) * 100);
    return acc > max ? acc : max;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <HistoryIcon className="w-4 h-4 text-brand-600" />
                <span>Diagnostic Archives</span>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                Performance Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Every mock CBT attempt and diagnostic practice logged with JUPEB point grades.
              </p>
            </div>

            <Link
              to="/exam"
              className="px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center gap-2 self-start sm:self-auto"
            >
              <span>Take New Mock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Aggregate Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Attempts</p>
              <p className="text-2xl font-display font-black text-slate-900 dark:text-white mt-1">
                {totalExams}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Accuracy</p>
              <p className="text-2xl font-display font-black text-brand-600 dark:text-brand-400 mt-1">
                {avgAccuracy}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Top Percentile Mark</p>
              <p className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {bestScore}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-2 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          <button
            onClick={() => setFilterSubject('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterSubject === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Subjects
          </button>
          {combination.map(sub => (
            <button
              key={sub}
              onClick={() => setFilterSubject(sub.toLowerCase())}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterSubject === sub.toLowerCase()
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Loading diagnostic logs...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-4xl">📚</div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              No exam attempts recorded yet.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Run a mock examination in the Exam Simulator to see full diagnostic trends and JUPEB point projections here.
            </p>
            <Link
              to="/exam"
              className="inline-block px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm"
            >
              Simulate Now
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-premium dark:shadow-premium-dark">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExams.map((ex) => {
                const acc = Math.round((ex.score / ex.maxScore) * 100);
                return (
                  <div 
                    key={ex.id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-wider">
                          {ex.subject}
                        </span>
                        <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {ex.year ? `${ex.year} CBT Mock` : 'Diagnostic Test'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ex.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span>{ex.mode || 'Mock Simulator'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-display font-black text-slate-900 dark:text-white">
                          {ex.score} / {ex.maxScore}
                        </div>
                        <div className="text-xs font-bold text-slate-400">
                          {acc}% Accuracy
                        </div>
                      </div>

                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-sm ${
                        ex.grade === 'A' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
                        ex.grade === 'B' || ex.grade === 'C' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400' :
                        'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {ex.grade || '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

