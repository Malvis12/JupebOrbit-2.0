import React, { useState } from 'react';
import { Calculator, X, Delete } from 'lucide-react';

export const ScientificCalculator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');

  const append = (val: string) => {
    setExpr(prev => prev + val);
  };

  const clear = () => {
    setExpr('');
    setResult('');
  };

  const backspace = () => {
    setExpr(prev => prev.slice(0, -1));
  };

  const calculate = () => {
    try {
      if (!expr.trim()) return;

      // Safe evaluation of mathematical expression
      let sanitized = expr
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/\^/g, '**');

      // eslint-disable-next-line no-eval
      const evalRes = Function(`"use strict"; return (${sanitized})`)();
      if (typeof evalRes === 'number' && !isNaN(evalRes)) {
        // Round to 6 decimal places if needed
        const formatted = Math.round(evalRes * 1000000) / 1000000;
        setResult(String(formatted));
      } else {
        setResult('Error');
      }
    } catch {
      setResult('Error');
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 flex items-center justify-center transition-transform hover:scale-105"
        title="Scientific Calculator"
      >
        <Calculator className="w-5 h-5" />
      </button>

      {/* Floating Calculator Modal */}
      {isOpen && (
        <div className="fixed bottom-16 right-3 sm:bottom-20 sm:right-6 z-50 w-[calc(100vw-1.5rem)] max-w-[20rem] sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span className="font-display font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                Scientific Calculator
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Screen */}
          <div className="my-3 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-right overflow-hidden">
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono h-4 truncate">
              {expr || '0'}
            </div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1 h-7 truncate">
              {result || '0'}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
            {/* Row 1 */}
            <button onClick={() => append('sin(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">sin</button>
            <button onClick={() => append('cos(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">cos</button>
            <button onClick={() => append('tan(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">tan</button>
            <button onClick={clear} className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-200">AC</button>

            {/* Row 2 */}
            <button onClick={() => append('log(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">log</button>
            <button onClick={() => append('ln(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">ln</button>
            <button onClick={() => append('sqrt(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-700">√</button>
            <button onClick={backspace} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"><Delete className="w-3.5 h-3.5" /></button>

            {/* Row 3 */}
            <button onClick={() => append('(')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200">(</button>
            <button onClick={() => append(')')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200">)</button>
            <button onClick={() => append('^')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200">x^y</button>
            <button onClick={() => append('/')} className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100">÷</button>

            {/* Row 4 */}
            <button onClick={() => append('7')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">7</button>
            <button onClick={() => append('8')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">8</button>
            <button onClick={() => append('9')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">9</button>
            <button onClick={() => append('*')} className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100">×</button>

            {/* Row 5 */}
            <button onClick={() => append('4')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">4</button>
            <button onClick={() => append('5')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">5</button>
            <button onClick={() => append('6')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">6</button>
            <button onClick={() => append('-')} className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100">−</button>

            {/* Row 6 */}
            <button onClick={() => append('1')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">1</button>
            <button onClick={() => append('2')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">2</button>
            <button onClick={() => append('3')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">3</button>
            <button onClick={() => append('+')} className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100">+</button>

            {/* Row 7 */}
            <button onClick={() => append('0')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">0</button>
            <button onClick={() => append('.')} className="p-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50">.</button>
            <button onClick={() => append('π')} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200">π</button>
            <button onClick={calculate} className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-bold shadow-md shadow-brand-500/20">=</button>
          </div>
        </div>
      )}
    </>
  );
};

