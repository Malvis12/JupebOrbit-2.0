import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  Target, 
  BookOpen, 
  LogOut, 
  Check, 
  Save, 
  Flame
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, userData, updateProfileData, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(userData?.username || '');
  const [tagline, setTagline] = useState(userData?.tagline || '');
  const [targetUniversity, setTargetUniversity] = useState(userData?.targetUniversity || '');
  const [targetCourse, setTargetCourse] = useState(userData?.targetCourse || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    userData?.combination || ['Physics', 'Chemistry', 'Mathematics']
  );

  const [savedMessage, setSavedMessage] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length !== 3) {
      alert('Please select exactly 3 subjects for your JUPEB combination.');
      return;
    }

    setSaving(true);
    try {
      await updateProfileData({
        username,
        tagline,
        targetUniversity,
        targetCourse,
        combination: selectedSubjects
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const avatarUrl = username
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=student`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Profile Card Header */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <img
            src={avatarUrl}
            alt="Candidate avatar"
            className="w-24 h-24 rounded-3xl bg-brand-50 dark:bg-brand-950/60 border border-slate-200 dark:border-slate-700 shadow-sm"
          />

          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display font-black text-2xl text-slate-900 dark:text-white">
              {userData?.username || 'Candidate'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{userData?.dailyStreak || 1} Day Streak</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold">
                <span>{userData?.aggregateScore?.toFixed(1) || '0.0'} Projected Points</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Settings Form */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <h2 className="font-display font-black text-xl text-slate-900 dark:text-white">
                Candidate Preferences & Goal Settings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize your academic targets and registered subjects.
              </p>
            </div>

            {savedMessage && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                Saved Successfully!
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Motto / Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. 16 Points Candidate"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

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
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-accent-500" />
                  Target Course
                </label>
                <input
                  type="text"
                  required
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Subject Combination */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  JUPEB Combination (Exact 3)
                </label>
                <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                  {selectedSubjects.length} / 3 Selected
                </span>
              </div>

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

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving || selectedSubjects.length !== 3}
                className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

