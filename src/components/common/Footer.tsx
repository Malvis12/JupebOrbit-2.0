import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <span className="font-display font-black text-sm tracking-tight text-slate-900 dark:text-white">
              JUPEB <span className="text-brand-600 dark:text-brand-400">ORBIT</span>
            </span>
            <span>© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link to="/practice" className="hover:text-brand-600 dark:hover:text-brand-400">
              Practice
            </Link>
            <Link to="/exam" className="hover:text-brand-600 dark:hover:text-brand-400">
              Mock Exam
            </Link>
            <Link to="/history" className="hover:text-brand-600 dark:hover:text-brand-400">
              History
            </Link>
            <Link to="/profile" className="hover:text-brand-600 dark:hover:text-brand-400">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

