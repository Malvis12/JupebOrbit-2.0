import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, ExamHistoryItem } from '../../types';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Shield,
  Search,
  AlertTriangle,
  Loader2,
  LayoutDashboard,
  FileQuestion,
  Sparkles
} from 'lucide-react';
import { QuestionUploadPage } from './QuestionUploadPage';

export const AdminDashboardPage: React.FC = () => {
  const { userData, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'students' | 'exams'>('overview');

  // Metrics State
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<UserProfile[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterRole, setStudentFilterRole] = useState<'all' | 'admin' | 'student'>('all');

  // Aggregate Stats
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionsBySubject, setQuestionsBySubject] = useState<Record<string, number>>({});
  const [recentExamLogs, setRecentExamLogs] = useState<{ studentName: string; exam: ExamHistoryItem }[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Access check
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center w-full max-w-md shadow-sm border border-slate-200 dark:border-slate-800">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Access Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You must have the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 font-mono text-xs">role: "admin"</code> in your profile to view this panel.
          </p>
        </div>
      </div>
    );
  }

  // Load Overview Data
  const loadAdminMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const usersSnap = await getDocs(collection(db, 'users'));
      const userList: UserProfile[] = [];
      const examLogs: { studentName: string; exam: ExamHistoryItem }[] = [];

      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        const profile: UserProfile = {
          ...uData,
          uid: uDoc.id
        } as UserProfile;
        userList.push(profile);

        // Fetch recent exams for each student (limit 2 per user)
        try {
          const histSnap = await getDocs(collection(db, 'users', uDoc.id, 'examHistory'));
          histSnap.docs.forEach((eDoc) => {
            examLogs.push({
              studentName: profile.username || profile.email || 'Candidate',
              exam: { id: eDoc.id, ...(eDoc.data() as ExamHistoryItem) }
            });
          });
        } catch {
          // Skip if permission or not available
        }
      }

      setStudents(userList);
      setFilteredStudents(userList);
      // Sort exams by timestamp descending
      examLogs.sort((a, b) => (b.exam.timestamp || '').localeCompare(a.exam.timestamp || ''));
      setRecentExamLogs(examLogs.slice(0, 15));

      // 2. Fetch Question Counts using collectionGroup to accurately find all questions across all subjects & years
      const counts: Record<string, number> = {};
      let grandTotal = 0;

      const qSnap = await getDocs(collectionGroup(db, 'questions'));
      qSnap.forEach((docSnap) => {
        grandTotal++;
        // Extract subject from Firestore reference path: subjects/{subject}/years/{year}/questions/{docId}
        const pathParts = docSnap.ref.path.split('/');
        const data = docSnap.data();
        let sName = (pathParts[1] || data.subject || 'other').toLowerCase();
        // Normalize common subject abbreviations
        if (sName === 'math') sName = 'mathematics';
        if (sName === 'phys') sName = 'physics';
        if (sName === 'chem') sName = 'chemistry';
        if (sName === 'bio') sName = 'biology';
        if (sName === 'econ') sName = 'economics';
        if (sName === 'govt') sName = 'government';

        counts[sName] = (counts[sName] || 0) + 1;
      });

      setQuestionsBySubject(counts);
      setTotalQuestions(grandTotal);

    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  // Filter students
  useEffect(() => {
    let result = [...students];

    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      result = result.filter(s =>
        (s.username || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.targetCourse || '').toLowerCase().includes(q) ||
        (s.targetUniversity || '').toLowerCase().includes(q)
      );
    }

    if (studentFilterRole !== 'all') {
      result = result.filter(s => {
        const isAdm = s.role === 'admin';
        return studentFilterRole === 'admin' ? isAdm : !isAdm;
      });
    }

    setFilteredStudents(result);
  }, [studentSearch, studentFilterRole, students]);

  // Promote / Demote User Role
  const handleToggleAdminRole = async (targetUser: UserProfile) => {
    const isCurrentlyAdmin = targetUser.role === 'admin';
    const newRole = isCurrentlyAdmin ? 'student' : 'admin';
    const confirmMsg = isCurrentlyAdmin
      ? `Revoke admin rights from ${targetUser.username || targetUser.email}?`
      : `Promote ${targetUser.username || targetUser.email} to Administrator?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(targetUser.uid);
    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: newRole });

      // Update local state
      setStudents(prev =>
        prev.map(s => (s.uid === targetUser.uid ? { ...s, role: newRole as any } : s))
      );
    } catch (err: any) {
      console.error('Role update failed:', err);
      alert(`Failed to update role: ${err?.message || 'Permission denied'}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Shield className="w-3.5 h-3.5" />
                <span>Executive Command Center</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                JUPEB ORBIT Master Administration
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Manage curriculum question banks, inspect registered candidates, monitor mock test logs, and configure platform roles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Admin: <strong className="text-slate-900 dark:text-white">{userData?.username || 'Superadmin'}</strong>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 -mb-6 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview & Analytics
            </button>

            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'questions'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileQuestion className="w-4 h-4" />
              Question Ingestion Studio
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Students & Roles ({students.length})
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'exams'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Live CBT Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-500">Registered Students</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : students.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Candidates on the platform</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-500">Total Questions</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : totalQuestions}
                </div>
                <p className="text-xs text-slate-500 mt-1">Live questions in bank</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-500">CBT Mocks Completed</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : recentExamLogs.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Recorded exam simulations</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase text-slate-500">Avg Candidate Score</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {students.length > 0
                    ? `${(students.reduce((acc, s) => acc + (s.aggregateScore || 0), 0) / students.length).toFixed(1)} / 16`
                    : '0.0 / 16'}
                </div>
                <p className="text-xs text-slate-500 mt-1">16-point scale performance</p>
              </div>
            </div>

            {/* Subject Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Question Ingestion Coverage by Subject
                </h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  {Object.keys(questionsBySubject).length} Subjects Detected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from(new Set(['physics', 'mathematics', 'chemistry', 'biology', 'economics', 'government', ...Object.keys(questionsBySubject)])).map((subj) => {
                  const count = questionsBySubject[subj] || 0;
                  return (
                    <div
                      key={subj}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center transition-all hover:border-blue-500/30"
                    >
                      <p className="text-xs font-bold uppercase text-slate-500 tracking-wider truncate">
                        {subj}
                      </p>
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {count}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {count > 0 ? `${count} live questions` : 'Needs ingestion'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('questions')}
                className="p-6 rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Upload Past Questions
                    </h4>
                    <p className="text-xs text-slate-500">
                      Extract directly from PDFs via Gemini AI
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Manage Student Accounts
                    </h4>
                    <p className="text-xs text-slate-500">
                      View profiles and grant/revoke admin rights
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION INGESTION STUDIO */}
        {activeTab === 'questions' && (
          <QuestionUploadPage />
        )}

        {/* TAB 3: STUDENTS & ROLES */}
        {activeTab === 'students' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Candidate & User Management
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Inspect candidate goals, target universities, and manage system roles.
                </p>
              </div>

              <button
                onClick={loadAdminMetrics}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Refresh List
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative col-span-2">
                <input
                  type="text"
                  placeholder="Search by username, email, university or course..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>

              <select
                value={studentFilterRole}
                onChange={(e) => setStudentFilterRole(e.target.value as any)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrators Only</option>
                <option value="student">Students Only</option>
              </select>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Target Goal</th>
                    <th className="px-4 py-3">Combination</th>
                    <th className="px-4 py-3 text-center">Score (16-Pt)</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading candidate roster...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No students matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isAdm = s.role === 'admin';
                      return (
                        <tr key={s.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {s.username || 'Candidate'}
                            </div>
                            <div className="text-xs text-slate-400">{s.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {s.targetCourse || 'Not set'}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {s.targetUniversity || 'Pending onboarding'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                            {s.combination?.join(', ') || 'Physics, Chemistry, Maths'}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                            {s.aggregateScore ?? 0} pts
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                isAdm
                                  ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {isAdm ? 'Administrator' : 'Student'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleToggleAdminRole(s)}
                              disabled={actionLoading === s.uid}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                isAdm
                                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                              }`}
                            >
                              {actionLoading === s.uid ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isAdm ? (
                                'Revoke Admin'
                              ) : (
                                'Make Admin'
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE CBT EXAM LOGS */}
        {activeTab === 'exams' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Recent Mock Exam Activity
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Real-time exam submission audit trail and grade distribution.
                </p>
              </div>

              <button
                onClick={loadAdminMetrics}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Subject / Year</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recentExamLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No CBT exam attempts recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentExamLogs.map((item, idx) => (
                      <tr key={item.exam.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {item.studentName}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-300">
                          {item.exam.subject} ({item.exam.year || '2024'})
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-mono">
                            {item.exam.mode || 'Single'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {item.exam.score} / {item.exam.maxScore}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-black text-xs ${
                            ['A', 'B'].includes(item.exam.grade)
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                              : ['C', 'D'].includes(item.exam.grade)
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
                          }`}>
                            {item.exam.grade || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {item.exam.timestamp
                            ? new Date(item.exam.timestamp).toLocaleDateString()
                            : 'Recent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
