import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, BookOpen, Target, Sparkles, ArrowRight, Check } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, userData, loading, updateProfileData } = useAuth();
  const navigate = useNavigate();

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

  // Redirect to auth if not authenticated
  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  const [targetUniversity, setTargetUniversity] = useState(userData?.targetUniversity || 'University of Lagos (UNILAG)');
  const [targetCourse, setTargetCourse] = useState(userData?.targetCourse || 'Medicine & Surgery');
  const [tagline, setTagline] = useState(userData?.tagline || '16 Points Target');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    userData?.combination && userData.combination.length > 0 
      ? userData.combination 
      : ['Physics', 'Chemistry', 'Mathematics']
  );
  const [submitting, setSubmitting] = useState(false);

  const availableSubjects = [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'Agricultural Science',
    'Economics',
    'Government',
    'Literature in English',
    'CRS/IRS',
    'Accounting'
  ];

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
      }
    } else {
      if (selectedSubjects.length < 3) {
        setSelectedSubjects([...selectedSubjects, sub]);
      }
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length !== 3) {
      alert('Please choose exactly 3 subjects for your official JUPEB combination.');
      return;
    }

    setSubmitting(true);
    try {
      await updateProfileData({
        targetUniversity,
        targetCourse,
        tagline,
        combination: selectedSubjects,
        onboardingComplete: true
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Error saving onboarding data:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Candidate Profiler</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Set Your Target Destination
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            JUPEB Orbit tailors your mock tests, formula suggestions, and point metrics to your official course.
          </p>
        </div>

        <form onSubmit={handleFinish} className="space-y-6">
          {/* Institution & Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-brand-600" />
                Target University
              </label>
              <input
                type="text"
                required
                value={targetUniversity}
                onChange={(e) => setTargetUniversity(e.target.value)}
                placeholder="e.g. UNILAG, UI, OAU, UNIBEN"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent-500" />
                Target Course / Degree
              </label>
              <input
                type="text"
                required
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                placeholder="e.g. Medicine, Law, Software Eng."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Personal Motivation / Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Future Neurosurgeon | 16 Pts Target"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Subject Combination */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                JUPEB Subject Combination
              </label>
              <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                Selected: {selectedSubjects.length} / 3
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-3">
              Select the exact 3 subjects registered for your JUPEB examination.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubjects.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-300'
                    }`}
                  >
                    <span>{sub}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || selectedSubjects.length !== 3}
            className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Profile & Enter Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

