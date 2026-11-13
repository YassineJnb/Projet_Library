import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { User } from '../types/library';
import { Check, Mail, X } from 'lucide-react';
import { googleSignIn } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, login } = useLibrary();

  const [activeTab, setActiveTab] = useState<'switch' | 'create'>('switch');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    login(user);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      const { user: fbUser } = await googleSignIn();

      if (!fbUser.email) {
        throw new Error('Google account must have an associated email.');
      }

      const googleUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        email: fbUser.email,
        role: fbUser.email.toLowerCase().includes('admin') ? 'admin' : 'student',
      };

      login(googleUser);
      onClose();
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setAuthError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'student', // Register is for students
    };

    login(newUser);
    setName('');
    setEmail('');
    onClose();
  };

  const adminUsers = users.filter((u) => u.role === 'admin');
  const studentUsers = users.filter((u) => u.role === 'student');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Account Access</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Google / Gmail Sign In via Firebase */}
        <div className="px-5 pt-4 pb-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <span>Connecting to Google...</span>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google / Gmail</span>
              </>
            )}
          </button>

          {authError && (
            <div className="mt-2 text-[11px] p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-center">
              {authError}
            </div>
          )}

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-white px-2 text-stone-400">or manual account</span>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-100 px-5 bg-stone-50/40">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-2.5 text-xs font-semibold border-b-2 mr-5 transition-colors cursor-pointer ${
              activeTab === 'switch'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Switch User
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Register
          </button>
        </div>

        <div className="p-5 pt-3">
          {activeTab === 'switch' ? (
            <div className="space-y-4">
              {/* Administrators */}
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Administrators
                </span>
                <div className="space-y-1.5">
                  {adminUsers.map((admin) => {
                    const isCurrent = currentUser?.id === admin.id;
                    return (
                      <button
                        key={admin.id}
                        onClick={() => handleSelectUser(admin)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-900'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold leading-tight">{admin.name}</div>
                          <div className={`text-[11px] ${isCurrent ? 'text-stone-300' : 'text-stone-500'}`}>
                            {admin.email}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Students */}
              <div>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                  Students &amp; Teachers
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {studentUsers.map((stu) => {
                    const isCurrent = currentUser?.id === stu.id;
                    return (
                      <button
                        key={stu.id}
                        onClick={() => handleSelectUser(stu)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isCurrent
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-900'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold leading-tight">{stu.name}</div>
                          <div className={`text-[11px] ${isCurrent ? 'text-stone-300' : 'text-stone-500'}`}>
                            {stu.email}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Register tab: ONLY requires name and email */
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-2xs mt-2 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Register &amp; Sign In</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
