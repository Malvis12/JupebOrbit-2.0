import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Sun, 
  Moon, 
  Flame, 
  BookOpen, 
  LogOut, 
  User as UserIcon, 
  History as HistoryIcon,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  onOpenFormulaVault?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenFormulaVault }) => {
  const { user, userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Practice', path: '/practice' },
    { name: 'Exam Simulator', path: '/exam' },
    { name: 'Performance Vault', path: '/history' },
  ];

  const avatarUrl = userData?.username
    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=student`;

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
              <img 
                src="/logo.png" 
                alt="JUPEB Orbit Logo" 
                className="w-8 h-8 rounded-xl object-contain shadow-sm group-hover:scale-105 transition-transform" 
                onError={(e) => {
                  // If image fails, fallback to brand icon
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-display font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                JUPEB <span className="text-brand-600 dark:text-brand-400">ORBIT</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Formula Vault Button */}
            {onOpenFormulaVault && (
              <button
                onClick={onOpenFormulaVault}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Formula Vault (V)"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {user ? (
              <>
                {/* Streak Badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-black">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                  <span>{userData?.dailyStreak || 1} Day Streak</span>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <img
                      src={avatarUrl}
                      alt="User avatar"
                      className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/50 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="hidden lg:block text-left pr-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {userData?.username || 'Student'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {userData?.tagline || 'Candidate'}
                      </div>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {userData?.username || user.email}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        Account & Target Course
                      </Link>

                      <Link
                        to="/history"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <HistoryIcon className="w-4 h-4 text-slate-400" />
                        Mock Exam Logs
                      </Link>

                      {userData?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          Admin Command Center
                        </Link>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2 rounded-xl text-xs font-bold ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            {userData?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                Admin Command Center
              </Link>
            )}
          </div>
        )}

      </div>
    </header>
  );
};

