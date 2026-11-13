import React from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Bell, BookOpen, LogOut } from 'lucide-react';

interface NavbarProps {
  activeTab: 'catalog' | 'lending' | 'student';
  setActiveTab: (tab: 'catalog' | 'lending' | 'student') => void;
  onOpenAuth: () => void;
  onOpenInbox: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenInbox,
}) => {
  const { currentUser, logout, notifications } = useLibrary();

  const role = currentUser?.role;

  const relevantNotifs = currentUser
    ? notifications.filter((n) =>
        role === 'admin'
          ? n.recipientRole === 'admin'
          : n.recipientRole === 'student' && n.recipientUserId === currentUser.id
      )
    : [];

  const unreadCount = relevantNotifs.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Wordmark: Library Manager */}
        <button
          onClick={() => setActiveTab(role === 'admin' ? 'lending' : 'catalog')}
          className="flex items-center gap-2 text-left focus:outline-hidden cursor-pointer"
        >
          <BookOpen className="w-5 h-5 text-stone-900" />
          <span className="text-base font-bold tracking-tight text-stone-900">
            Library Manager
          </span>
        </button>

        {/* Navigation: Admin has only one Dashboard tab; Students/Guests have Search & Student Portal */}
        <nav className="flex items-center gap-6 text-xs font-medium text-stone-600">
          {role !== 'admin' && (
            <button
              onClick={() => setActiveTab('catalog')}
              className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'text-stone-950 font-semibold border-b-2 border-stone-900'
                  : 'hover:text-stone-900'
              }`}
            >
              Search
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('lending')}
              className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
                activeTab === 'lending'
                  ? 'text-stone-950 font-semibold border-b-2 border-stone-900'
                  : 'hover:text-stone-900'
              }`}
            >
              Dashboard
            </button>
          )}

          {role === 'student' && (
            <button
              onClick={() => setActiveTab('student')}
              className={`transition-colors whitespace-nowrap py-1 cursor-pointer ${
                activeTab === 'student'
                  ? 'text-stone-950 font-semibold border-b-2 border-stone-900'
                  : 'hover:text-stone-900'
              }`}
            >
              Student Portal
            </button>
          )}
        </nav>

        {/* Controls: Inbox & Account */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={onOpenInbox}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors relative"
              title={role === 'admin' ? 'View Return Notices' : 'View Inbox Alerts'}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 bg-stone-900 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-xs transition-colors"
                title="Switch account (Student / Admin)"
              >
                <span className="font-medium">{currentUser.name}</span>
                <span className="text-stone-500 font-mono text-[10px] ml-1">
                  ({currentUser.role})
                </span>
              </button>
              <button
                onClick={logout}
                className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
