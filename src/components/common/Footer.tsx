import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white">
              JUPEB <span className="text-brand-600 dark:text-brand-400">ORBIT</span>
            </span>
            <span className="text-xs text-slate-400">
              • The #1 Intelligent JUPEB CBT & Prep Cockpit
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link to="/practice" className="hover:text-brand-600 dark:hover:text-brand-400">
              Practice Mode
            </Link>
            <Link to="/exam" className="hover:text-brand-600 dark:hover:text-brand-400">
              CBT Mock Simulator
            </Link>
            <Link to="/history" className="hover:text-brand-600 dark:hover:text-brand-400">
              Performance Vault
            </Link>
            <Link to="/profile" className="hover:text-brand-600 dark:hover:text-brand-400">
              Profile
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} JUPEB Orbit. Engineered for 16/16 Aggregate Points.</p>
          <p className="italic">JUPEB is a registered trademark of the Joint Universities Preliminary Examinations Board.</p>
        </div>
      </div>
    </footer>
  );
};

