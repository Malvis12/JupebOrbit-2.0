import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  RotateCcw, 
  BrainCircuit, 
  Eye, 
  Lightbulb, 
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { WeaknessItem, QuestionExplanation } from '../../types';
import { MathRenderer } from '../common/MathRenderer';

interface FlashMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlashMasterModal: React.FC<FlashMasterModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<WeaknessItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  // Active Recall States
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userRecallNotes, setUserRecallNotes] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [detailedExplanation, setDetailedExplanation] = useState<QuestionExplanation | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadWeaknessBucket = async () => {
      setLoading(true);
      setCompleted(false);
      setIsAnswerRevealed(false);
      setUserRecallNotes('');
      setShowHint(false);
      setDetailedExplanation(null);

      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'weaknessBucket'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeaknessItem));
        setItems(list);
        setCurrentIndex(0);
      } catch (err) {
        console.error('Error loading weakness bucket:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWeaknessBucket();
  }, [isOpen, user]);

  const currentItem = items[currentIndex];

  // If question doesn't have cached explanation, attempt to fetch from questions collection
  useEffect(() => {
    if (!currentItem) return;
    setIsAnswerRevealed(false);
    setUserRecallNotes('');
    setShowHint(false);

    if (currentItem.explanation) {
      setDetailedExplanation(currentItem.explanation);
    } else if (currentItem.qId) {
      // Lazy lookup in question bank if available
      const fetchQuestionDetails = async () => {
        try {
          const subjects = ['physics', 'chemistry', 'mathematics', 'biology', 'economics', 'government'];
          const years = ['2025', '2024', '2023', '2022', '2021', '2020', '2019'];

          for (const s of subjects) {
            for (const y of years) {
              const qRef = doc(db, 'subjects', s, 'years', y, 'questions', currentItem.qId);
              const qSnap = await getDoc(qRef);
              if (qSnap.exists()) {
                const data = qSnap.data();
                if (data.explanation) {
                  setDetailedExplanation(data.explanation as QuestionExplanation);
                  return;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not retrieve full explanation:', e);
        }
      };
      fetchQuestionDetails();
    }
  }, [currentIndex, currentItem]);

  if (!isOpen) return null;

  const handleResponse = async (mastered: boolean) => {
    if (!user || items.length === 0) return;
    const itemRef = doc(db, 'users', user.uid, 'weaknessBucket', currentItem.id);

    try {
      if (mastered) {
        const currentLevel = currentItem.srsLevel || 1;
        if (currentLevel >= 3) {
          // Permanently graduate from weakness bucket!
          await deleteDoc(itemRef);
          const updated = items.filter((_, idx) => idx !== currentIndex);
          setItems(updated);
          if (updated.length === 0 || currentIndex >= updated.length) {
            setCompleted(true);
          }
          return;
        } else {
          const intervals = [0, 1, 3, 7, 21];
          const nextInterval = intervals[currentLevel] || 7;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + nextInterval);

          await updateDoc(itemRef, {
            srsLevel: currentLevel + 1,
            nextReviewDate: nextDate.toISOString(),
            lastCorrect: new Date().toISOString()
          });

          const updated = items.filter((_, idx) => idx !== currentIndex);
          setItems(updated);
          if (updated.length === 0 || currentIndex >= updated.length) {
            setCompleted(true);
          }
          return;
        }
      } else {
        // Reset SRS Level back to 1 for high-frequency spaced repetition
        const resetDate = new Date();
        resetDate.setHours(resetDate.getHours() + 4);
        await updateDoc(itemRef, {
          srsLevel: 1,
          nextReviewDate: resetDate.toISOString()
        });

        if (currentIndex + 1 >= items.length) {
          setCompleted(true);
        } else {
          setCurrentIndex(prev => prev + 1);
        }
      }
    } catch (e) {
      console.error('Error updating weakness item:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Active Recall Studio</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Flash-Master
                </span>
              </h3>
              <p className="text-xs text-slate-400">JUPEB Active Spaced Repetition Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-8 flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-400">Loading your tagged concepts...</p>
            </div>
          ) : completed || items.length === 0 ? (
            <div className="py-8 space-y-4 max-w-sm text-center">
              <div className="text-5xl">🎉</div>
              <h4 className="font-display font-black text-2xl text-slate-900 dark:text-white">
                {items.length === 0 ? "Weakness Bucket is Clear!" : "Recall Loop Complete!"}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {items.length === 0
                  ? "You currently have 0 active weakness items. Every missed question has been successfully mastered!"
                  : "You've successfully completed this active recall session. Retrieval without recognition cements long-term memory."}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20"
              >
                Return to Cockpit
              </button>
            </div>
          ) : currentItem ? (
            <div className="w-full space-y-6 animate-in fade-in text-left">
              
              {/* Meta Pill & Card Count */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider rounded-full">
                    {currentItem.topic || 'Tagged Concept'}
                  </span>
                  {currentItem.subject && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      {currentItem.subject}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    SRS Level {currentItem.srsLevel || 1}/3
                  </span>
                </div>
                <span className="text-slate-400 font-mono font-bold text-xs">
                  Concept {currentIndex + 1} of {items.length}
                </span>
              </div>

              {/* The Question Prompt */}
              <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Problem Statement
                </div>
                <h4 className="font-display font-bold text-lg md:text-xl text-slate-900 dark:text-white leading-relaxed">
                  <MathRenderer content={currentItem.title} />
                </h4>
              </div>

              {/* RECALL PROMPT HERO BANNER */}
              <div className="p-5 bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-purple-50/80 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-purple-950/40 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <span>Recall Prompt</span>
                  </div>

                  {/* Optional Hint Toggle */}
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Hide Hint' : 'Show Topic Hint'}</span>
                  </button>
                </div>

                <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  "Recall the foundational formulas, steps, and core principles needed to solve this without looking at the answer."
                </p>

                {showHint && (
                  <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in">
                    <strong>Core Focus:</strong> {detailedExplanation?.coreConcept || currentItem.topic || 'Examine physical or mathematical relationships tested here.'}
                  </div>
                )}
              </div>

              {/* Active Recall Scratchpad Area */}
              {!isAnswerRevealed && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Your Mental / Scratchpad Derivation</span>
                    <span className="text-[10px] text-slate-400 font-normal">Type formulas or key steps (Optional self-test)</span>
                  </label>
                  <textarea
                    value={userRecallNotes}
                    onChange={(e) => setUserRecallNotes(e.target.value)}
                    placeholder="e.g. Formula: F = ma, W = F*d*cos(θ), substitute given mass..."
                    rows={3}
                    className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs md:text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  />
                  
                  {/* Reveal Answer Trigger Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => setIsAnswerRevealed(true)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Reveal Full Derivation & Principle</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Revealed Solution & Derivation Steps */}
              {isAnswerRevealed && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Options display if question has options */}
                  {currentItem.options && currentItem.options.length > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Exam Options
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentItem.options.map((opt, i) => {
                          const isCorrect = i === currentItem.correctAnswerIndex;
                          const letter = String.fromCharCode(65 + i);
                          return (
                            <div
                              key={i}
                              className={`p-2.5 rounded-xl text-xs flex items-center gap-2.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-md text-[10px] flex items-center justify-center font-bold ${
                                isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'
                              }`}>
                                {letter}
                              </span>
                              <span><MathRenderer content={opt} /></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Derivation Principles Box */}
                  <div className="p-5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Verified Derivation & Solution</span>
                    </div>

                    {detailedExplanation?.coreConcept && (
                      <div className="text-xs text-slate-800 dark:text-slate-200">
                        <strong className="text-emerald-900 dark:text-emerald-300">Core Principle: </strong>
                        {detailedExplanation.coreConcept}
                      </div>
                    )}

                    <div className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-1">
                      <MathRenderer content={detailedExplanation?.steps || 'Derivation: Recall the governing laws for this topic and substitute standard values.'} />
                    </div>

                    {detailedExplanation?.pitfall && (
                      <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Common Pitfall:</strong> {detailedExplanation.pitfall}</span>
                      </div>
                    )}
                  </div>

                  {/* Mastery Rating Prompt */}
                  <div className="pt-2 space-y-2 text-center">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      How was your recall?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleResponse(false)}
                        className="p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Still Struggling (Review Soon)</span>
                      </button>
                      <button
                        onClick={() => handleResponse(true)}
                        className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Recalled Accurately (+1 Level)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};
