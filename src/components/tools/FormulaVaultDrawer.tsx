import React, { useState } from 'react';
import { BookOpen, X, Search } from 'lucide-react';
import { FORMULA_DATA } from '../../lib/formulaData';
import { MathRenderer } from '../common/MathRenderer';

interface FormulaVaultDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaVaultDrawer: React.FC<FormulaVaultDrawerProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'physics' | 'mathematics' | 'chemistry'>('all');

  if (!isOpen) return null;

  const subjectsToRender = selectedSubject === 'all' 
    ? Object.keys(FORMULA_DATA) 
    : [selectedSubject];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Formula Vault</h3>
                <p className="text-xs text-slate-400">JUPEB Reference & Constants</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas, laws, constants..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {(['all', 'physics', 'mathematics', 'chemistry'] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                    selectedSubject === sub
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Formulas List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {subjectsToRender.map((sub) => {
              const categories = FORMULA_DATA[sub] || [];
              return (
                <div key={sub} className="space-y-4">
                  {categories.map((cat) => {
                    const filtered = cat.formulas.filter(f => 
                      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      cat.topic.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (filtered.length === 0) return null;

                    return (
                      <div key={cat.topic} className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-3.5 bg-brand-600 rounded-full"></span>
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            {sub} • {cat.topic}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {filtered.map((f, idx) => (
                            <div 
                              key={idx}
                              className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-brand-300 dark:hover:border-slate-700 transition-colors"
                            >
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                {f.name}
                              </div>
                              <div className="py-1 text-slate-900 dark:text-white font-mono overflow-x-auto">
                                <MathRenderer content={f.latex} block />
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                                {f.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">V</kbd> to toggle vault
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

