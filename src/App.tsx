import React, { useEffect, useState } from 'react';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { BookCatalog } from './components/BookCatalog';
import { AdminLendingDesk } from './components/AdminLendingDesk';
import { StudentPortal } from './components/StudentPortal';
import { QRCodeModal } from './components/QRCodeModal';
import { QRCodeScannerModal } from './components/QRCodeScannerModal';
import { AuthModal } from './components/AuthModal';
import { NotificationInbox } from './components/NotificationInbox';
import { ReturnCheckModal } from './components/ReturnCheckModal';
import { SearchFilters } from './types/library';

const MainContent: React.FC = () => {
  const { currentUser, resetAllData } = useLibrary();

  const [activeTab, setActiveTab] = useState<'catalog' | 'lending' | 'student'>(() => {
    return currentUser?.role === 'admin' ? 'lending' : 'catalog';
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBookTitle, setScannedBookTitle] = useState<string | null>(null);
  const [returnToast, setReturnToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const handleReturnFeedback = (fb: { message: string; isError?: boolean }) => {
    setReturnToast(fb);
    setTimeout(() => setReturnToast(null), 4500);
  };

  // Minimal Search filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    component: 'all',
    category: '',
    availability: 'all',
  });

  // Guard active tab according to role:
  // - Admins can ONLY access 'lending' (Dashboard)
  // - Students can access 'catalog' (Search) and 'student' (Student Portal)
  // - Unauthenticated users can only access 'catalog' (Search)
  useEffect(() => {
    if (!currentUser) {
      if (activeTab !== 'catalog') setActiveTab('catalog');
    } else if (currentUser.role === 'admin') {
      if (activeTab !== 'lending') setActiveTab('lending');
    } else if (currentUser.role === 'student' && activeTab === 'lending') {
      setActiveTab('student');
    }
  }, [currentUser, activeTab]);

  const handleScanDetected = (result: {
    rawText: string;
    title?: string;
    isbn?: string;
    author?: string;
  }) => {
    const searchTerm = result.title || result.isbn || result.rawText;
    setFilters((prev) => ({ ...prev, query: searchTerm }));
    setScannedBookTitle(result.title || searchTerm);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      {/* Minimal Top Bar with Role Tabs & Inbox */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenInbox={() => setIsInboxOpen(true)}
      />

      {/* Main View */}
      <main className="flex-1">
        {activeTab === 'catalog' && currentUser?.role !== 'admin' && (
          <div>
            <SearchHeader
              filters={filters}
              setFilters={setFilters}
              onOpenScanner={() => setIsScannerOpen(true)}
              scannedBookTitle={scannedBookTitle}
              onClearScannedBadge={() => setScannedBookTitle(null)}
            />
            <BookCatalog filters={filters} onOpenAuth={() => setIsAuthOpen(true)} />
          </div>
        )}

        {activeTab === 'lending' && currentUser?.role === 'admin' && (
          <AdminLendingDesk onOpenInbox={() => setIsInboxOpen(true)} />
        )}

        {activeTab === 'student' && currentUser?.role === 'student' && (
          <StudentPortal
            onBrowseCatalog={() => setActiveTab('catalog')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Minimal Quiet Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>Library Manager</span>
          <button
            onClick={resetAllData}
            className="hover:text-stone-700 underline transition-colors cursor-pointer"
          >
            Reset Demo Data
          </button>
        </div>
      </footer>

      {/* Modals */}
      <QRCodeModal />
      <ReturnCheckModal onFeedback={handleReturnFeedback} />
      {returnToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-2.5 rounded-lg border shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            returnToast.isError
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {returnToast.message}
        </div>
      )}
      <QRCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleScanDetected}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <NotificationInbox isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <LibraryProvider>
      <MainContent />
    </LibraryProvider>
  );
}
