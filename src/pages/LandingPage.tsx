import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  BrainCircuit,
  Calculator,
  Clock
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading indicator while auth is initializing
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading JUPEB Orbit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-400 rounded-full blur-[140px]" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-accent-500 rounded-full blur-[140px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center z-10">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200/80 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-black uppercase tracking-wider mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>The Definitive JUPEB CBT Cockpit</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl text-slate-900 dark:text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
          Secure Your Maximum <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 bg-clip-text text-transparent">
            16 / 16 JUPEB Points
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The all-in-one preparation engine built specifically for JUPEB candidates. Timed CBT mock simulations, confidence-weighted grading, and automated weakness mastery.
        </p>

        {/* Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={user ? "/dashboard" : "/auth"}
            className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm uppercase tracking-wider shadow-xl shadow-brand-600/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
          >
            <span>{user ? "Go To Cockpit" : "Launch Simulator Free"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/practice"
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm uppercase tracking-wider shadow-sm transition-all"
          >
            Explore Question Hub
          </Link>
        </div>

        {/* Proof Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Official JUPEB Point Scale (A=5 to F=0)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>16th Point Bonus Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Full Step-by-Step Derivations</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display font-black text-2xl sm:text-4xl text-slate-900 dark:text-white">
            Engineered for Precision & Mastery
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Everything you need to eliminate exam anxiety and achieve direct entry into your first-choice 200-level university program.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-premium dark:shadow-premium-dark hover:border-brand-300 dark:hover:border-brand-600 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-2">
              Authentic CBT Mock Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Full-screen exam simulator matching official JUPEB conditions. Includes strict countdown timers, keyboard navigation (A-D, N, P), and instant scorecards.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-premium dark:shadow-premium-dark hover:border-brand-300 dark:hover:border-brand-600 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-2">
              Weakness Bucket & SRS
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Every missed question automatically flows into your personal Weakness Bucket. Flash-Master uses scientifically proven Spaced Repetition to convert mistakes into mastery.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-premium dark:shadow-premium-dark hover:border-brand-300 dark:hover:border-brand-600 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-2">
              Formula Vault & Calculator
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Never forget a formula during practice. Access a searchable LaTeX formula drawer and an integrated scientific calculator right inside your session.
            </p>
          </div>
        </div>
      </section>

      {/* Target Point Scale Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 rounded-[2.5rem] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
              JUPEB Scoring Algorithm
            </span>
            <h2 className="font-display font-black text-3xl sm:text-5xl mt-4 leading-tight">
              Understand the 16th Point Advantage
            </h2>
            <p className="mt-4 text-brand-100 text-sm sm:text-base leading-relaxed">
              Official JUPEB results combine your three subjects (5 points each for A, down to 0 for F). If you achieve at least grade E across all three subjects without any F grades, you are awarded <strong>1 bonus point</strong>, propelling your score to the coveted 16.0 aggregate.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={user ? "/dashboard" : "/auth"}
                className="px-6 py-3 bg-white text-brand-900 hover:bg-brand-50 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Start Practicing Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

