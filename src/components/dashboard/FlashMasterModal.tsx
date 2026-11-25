import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WeaknessItem, QuestionExplanation } from '../../types';
import {
  X,
  BrainCircuit,
  CheckCircle2,
  RotateCcw,
  Eye,
  Sparkles,
  Loader2,
  Clock
} from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

interface FlashMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlashMasterModal: React.FC<FlashMasterModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WeaknessItem[]>([]);
  const [recalledCount, setRecalledCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadWeaknesses = async () => {
      setLoading(true);
      setRecalledCount(0);
      setShowAnswer(false);
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'weaknessBucket'));
        const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeaknessItem));

        const now = Date.now();
        const dueItems = allItems.filter(
          item => !item.nextReviewDate || new Date(item.nextReviewDate).getTime() <= now
        );

        setItems(dueItems.length > 0 ? dueItems : allItems);
      } catch (err) {
        console.error('Error loading Flash-Master items:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWeaknesses();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentItem = items[0] || null;

  const handleRecall = async (mastered: boolean) => {
    if (!user || !currentItem || saving) return;
    setSaving(true);

    const itemRef = doc(db, 'users', user.uid, 'weaknessBucket', currentItem.id);

    try {
      if (mastered) {
        const currentLevel = currentItem.srsLevel || 1;
        if (currentLevel >= 3) {
          await deleteDoc(itemRef);
        } else {
          const intervals = [0, 1, 3, 7];
          const days = intervals[currentLevel] || 3;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + days);

          await updateDoc(itemRef, {
            srsLevel: currentLevel + 1,
            nextReviewDate: nextDate.toISOString(),
            lastCorrect: new Date().toISOString()
          });
        }
        setRecalledCount(prev => prev + 1);
        setItems(prev => prev.slice(1));
      } else {
        const resetDate = new Date();
        resetDate.setHours(resetDate.getHours() + 4);
        await updateDoc(itemRef, {
          srsLevel: 1,
          nextReviewDate: resetDate.toISOString()
        });
        // Move to back of queue so user can retry
        setItems(prev => [...prev.slice(1), { ...currentItem, srsLevel: 1 }]);
      }
      setShowAnswer(false);
    } catch (err) {
      console.error('Error updating Flash-Master item:', err);
    } finally {
      setSaving(false);
    }
  };

  const explanation: QuestionExplanation | undefined = currentItem?.explanation;
  const correctOption =
    currentItem?.options && typeof currentItem.correctAnswerIndex === 'number'
      ? currentItem.options[currentItem.correctAnswerIndex]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-base text-slate-900 dark:text-white">
                Flash-Master Recall
              </h2>
              <p className="text-[11px] text-slate-500">
                Recalled: <strong className="text-emerald-600 dark:text-emerald-400">{recalledCount}</strong> • Remaining: <strong>{items.length}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close Flash-Master"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-brand-600" />
              <p className="text-sm font-medium">Loading your recall queue...</p>
            </div>
          ) : !currentItem ? (
            <div className="py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
                  {recalledCount > 0 ? 'Session Complete!' : 'All Caught Up!'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {recalledCount > 0
                    ? `You successfully recalled ${recalledCount} concept${recalledCount === 1 ? '' : 's'}.`
                    : 'No weakness concepts are currently due for review.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Meta */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-[11px] font-bold uppercase">
                    {currentItem.subject || 'General'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {currentItem.topic}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  SRS Level {currentItem.srsLevel || 1}/3
                </span>
              </div>

              {/* Question Prompt */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm sm:text-base font-medium leading-relaxed">
                <MathRenderer content={currentItem.title} />
              </div>

              {/* Options (if available) */}
              {currentItem.options && currentItem.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentItem.options.map((opt, idx) => {
                    const isCorrect = showAnswer && currentItem.correctAnswerIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <MathRenderer content={opt} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Answer & Explanation */}
              {!showAnswer ? (
                <button
                  type="button"
                  onClick={() => setShowAnswer(true)}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Answer & Explanation
                </button>
              ) : (
                <div className="space-y-4">
                  {correctOption && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                      <p className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 mb-1">
                        Correct Answer
                      </p>
                      <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                        <MathRenderer content={correctOption} />
                      </div>
                    </div>
                  )}

                  {explanation && (explanation.coreConcept || explanation.steps || explanation.pitfall) && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {explanation.coreConcept && (
                        <div>
                          <span className="font-bold">Core Concept: </span>
                          <MathRenderer content={explanation.coreConcept} />
                        </div>
                      )}
                      {explanation.steps && (
                        <div>
                          <span className="font-bold">Steps: </span>
                          <MathRenderer content={explanation.steps} />
                        </div>
                      )}
                      {explanation.pitfall && (
                        <div className="text-amber-600 dark:text-amber-400">
                          <span className="font-bold">Pitfall: </span>
                          <MathRenderer content={explanation.pitfall} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Self-Rating Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRecall(false)}
                      className="min-h-[48px] px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Still Learning
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRecall(true)}
                      className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Got It
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
