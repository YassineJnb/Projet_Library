import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { calculateOverdueStatus, formatDate } from '../utils/overdue';
import { OverdueMeter } from './OverdueMeter';
import { Loan } from '../types/library';
import {
  getAccessToken,
  getConnectedGmailEmail,
  googleSignIn,
} from '../lib/firebase';
import {
  AlertTriangle,
  Bell,
  BookMarked,
  BookOpen,
  BookPlus,
  CheckCircle,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  Mail,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AdminLendingDeskProps {
  onOpenInbox?: () => void;
}

export const AdminLendingDesk: React.FC<AdminLendingDeskProps> = ({ onOpenInbox }) => {
  const {
    loans,
    books,
    users,
    currentUser,
    adminCheckout,
    addNewBook,
    addNewCopy,
    setSelectedQRCopy,
    setReturnCheckLoanId,
    notifications,
    notifyStudentLoanWarning,
    currentDate,
    isDbSynced,
  } = useLibrary();

  const [deskTab, setDeskTab] = useState<'loans' | 'inventory'>('loans');
  const [inventorySearch, setInventorySearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [pendingWarnLoan, setPendingWarnLoan] = useState<Loan | null>(null);
  const [warnRecipientEmail, setWarnRecipientEmail] = useState('');
  const [warnModalError, setWarnModalError] = useState<string | null>(null);
  const [isSendingWarn, setIsSendingWarn] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [gmailAuthError, setGmailAuthError] = useState<string | null>(null);
  const [, setTokenVersion] = useState(0);

  // Lend modal state
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [loanDays, setLoanDays] = useState(14);
  const [bookFilter, setBookFilter] = useState('');

  // Add Book modal state
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookPublisher, setNewBookPublisher] = useState('');
  const [newBookIsbn, setNewBookIsbn] = useState('');
  const [newBookYear, setNewBookYear] = useState<number>(new Date().getFullYear());
  const [newBookCategory, setNewBookCategory] = useState('Literature');
  const [newBookShelf, setNewBookShelf] = useState('Stack 1 · Shelf A-01');
  const [newBookCopies, setNewBookCopies] = useState<number>(2);

  const activeLoans = loans.filter((l) => l.status === 'active');
  const returnNotifiedLoans = activeLoans.filter((l) => l.returnNotified);

  // Calculate late loans currently active
  const lateLoans = activeLoans.filter((loan) => {
    const status = calculateOverdueStatus(loan.dueDate, currentDate);
    return status.isLate;
  });

  const adminNotifs = notifications.filter((n) => n.recipientRole === 'admin');
  const unreadNotifs = adminNotifs.filter((n) => !n.read).length;

  const totalAvailableCopies = books.reduce(
    (acc, b) => acc + b.copies.filter((c) => c.status === 'available').length,
    0
  );

  const getCopyForLoan = (loan: Loan) => {
    const book = books.find((b) => b.id === loan.bookId);
    const copy = book?.copies.find((c) => c.id === loan.copyId);
    return { book, copy };
  };

  const displayedLoans = activeLoans.filter((loan) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const { copy } = getCopyForLoan(loan);
    return (
      loan.bookTitle.toLowerCase().includes(q) ||
      loan.studentName.toLowerCase().includes(q) ||
      loan.studentEmail.toLowerCase().includes(q) ||
      loan.printingHouse.toLowerCase().includes(q) ||
      loan.copyId.toLowerCase().includes(q) ||
      (copy?.barcode.toLowerCase().includes(q) ?? false) ||
      (copy ? `exemplaire #${copy.copyNumber}`.includes(q) || `#${copy.copyNumber}`.includes(q) : false)
    );
  });

  const handleOpenReturnCheck = (loanId: string) => {
    setReturnCheckLoanId(loanId);
  };

  const handleWarnStudent = (loanId: string) => {
    const target = loans.find((l) => l.id === loanId) || null;
    setGmailAuthError(null);
    setWarnModalError(null);
    setWarnRecipientEmail(target?.studentEmail || '');
    setPendingWarnLoan(target);
  };

  const handleConnectGmailInModal = async () => {
    setIsConnectingGmail(true);
    setGmailAuthError(null);
    setWarnModalError(null);
    try {
      await googleSignIn();
      setTokenVersion((v) => v + 1);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setGmailAuthError(err?.message || 'Failed to connect Google / Gmail.');
      }
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleConfirmSendWarning = async (options?: { skipEmail?: boolean }) => {
    if (!pendingWarnLoan) return;
    const trimmedEmail = warnRecipientEmail.trim();
    if (!options?.skipEmail && (!trimmedEmail || !trimmedEmail.includes('@'))) {
      setWarnModalError('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingWarn(true);
    setWarnModalError(null);
    setGmailAuthError(null);

    try {
      if (!options?.skipEmail && !getAccessToken()) {
        try {
          await googleSignIn();
          setTokenVersion((v) => v + 1);
        } catch (err: any) {
          if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
            setWarnModalError('Google sign-in popup was closed. Please connect Google to send the email, or choose "App Inbox Only".');
          } else {
            setWarnModalError(err?.message || 'Failed to connect Google / Gmail.');
          }
          return;
        }
      }

      const res = await notifyStudentLoanWarning(
        pendingWarnLoan.id,
        trimmedEmail || pendingWarnLoan.studentEmail,
        options
      );

      if (!options?.skipEmail && !res.emailSent) {
        setTokenVersion((v) => v + 1);
        setWarnModalError(
          res.emailError ||
            res.message ||
            'Email failed to send via Gmail API. Check Gmail authorization and recipient address.'
        );
        return;
      }

      setFeedback({
        message: res.gmailMessageId
          ? `${res.message} (Gmail ID: ${res.gmailMessageId})`
          : res.message,
        isError: !res.success,
      });
      setPendingWarnLoan(null);
      setTimeout(() => setFeedback(null), 6000);
    } finally {
      setIsSendingWarn(false);
    }
  };

  const handleConfirmLend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedStudentId) {
      setFeedback({ message: 'Please select both a book and a student.', isError: true });
      return;
    }

    const book = books.find((b) => b.id === selectedBookId);
    if (!book) return;

    const availableCopy =
      (selectedCopyId
        ? book.copies.find((c) => c.id === selectedCopyId && c.status === 'available')
        : undefined) || book.copies.find((c) => c.status === 'available');

    if (!availableCopy) {
      setFeedback({ message: 'No copies available for this book.', isError: true });
      return;
    }

    const res = adminCheckout(availableCopy.id, selectedStudentId, loanDays);
    setFeedback({ message: res.message, isError: !res.success });
    if (res.success) {
      setIsLendModalOpen(false);
      setSelectedBookId('');
      setSelectedCopyId('');
      setSelectedStudentId('');
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim()) {
      setFeedback({ message: 'Book title and author are required.', isError: true });
      return;
    }

    const res = addNewBook({
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      printingHouse: newBookPublisher.trim() || 'General Publisher',
      isbn: newBookIsbn.trim() || undefined,
      publicationYear: newBookYear,
      category: newBookCategory,
      shelfLocation: newBookShelf,
      copiesCount: newBookCopies,
    });

    setFeedback({ message: res.message, isError: !res.success });
    if (res.success) {
      setIsAddBookModalOpen(false);
      setNewBookTitle('');
      setNewBookAuthor('');
      setNewBookPublisher('');
      setNewBookIsbn('');
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const studentUsers = users.filter((u) => u.role === 'student');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Dashboard
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                isDbSynced
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
              title="Real database persistent storage"
            >
              <Database className="w-2.5 h-2.5" />
              <span>{isDbSynced ? 'Persistent DB' : 'Local DB'}</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Lending desk, inventory management, overdue monitoring, and return processing
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          {/* Add Book to DB Button */}
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-md transition-colors cursor-pointer shadow-2xs"
            title="Add a new book to the database catalog"
          >
            <BookPlus className="w-3.5 h-3.5 text-stone-700" />
            <span>Add Book</span>
          </button>

          {/* Lend Book Button */}
          <button
            onClick={() => setIsLendModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-md transition-colors cursor-pointer shadow-2xs"
            title="Lend a book to a student"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lend Book</span>
          </button>

          {/* Admin Return Notices Button */}
          {onOpenInbox && (
            <button
              onClick={onOpenInbox}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors relative cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-stone-700" />
              <span>Return Notices</span>
              {unreadNotifs > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-stone-900 text-white leading-none">
                  {unreadNotifs}
                </span>
              )}
            </button>
          )}

          {/* Search filter */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active loans..."
              className="w-full py-1.5 pl-8 pr-3 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
            />
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Loans */}
        <div className="bg-white border border-stone-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Active Loans</span>
            <BookMarked className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900">
            {activeLoans.length}
          </div>
        </div>

        {/* Overdue Loans */}
        <div
          className={`border rounded-lg p-3.5 shadow-2xs transition-colors ${
            lateLoans.length > 0
              ? 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={lateLoans.length > 0 ? 'text-amber-900 font-medium' : 'text-stone-500'}>
              Overdue Loans
            </span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                lateLoans.length > 0 ? 'text-amber-600' : 'text-stone-400'
              }`}
            />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              lateLoans.length > 0 ? 'text-amber-900' : 'text-stone-900'
            }`}
          >
            {lateLoans.length}
          </div>
        </div>

        {/* Pending Return Notices */}
        <div
          className={`border rounded-lg p-3.5 shadow-2xs transition-colors ${
            returnNotifiedLoans.length > 0
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span
              className={
                returnNotifiedLoans.length > 0 ? 'text-emerald-900 font-medium' : 'text-stone-500'
              }
            >
              Return Notices
            </span>
            <Clock
              className={`w-3.5 h-3.5 ${
                returnNotifiedLoans.length > 0 ? 'text-emerald-600' : 'text-stone-400'
              }`}
            />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              returnNotifiedLoans.length > 0 ? 'text-emerald-950' : 'text-stone-900'
            }`}
          >
            {returnNotifiedLoans.length}
          </div>
        </div>

        {/* Available Stock */}
        <div className="bg-white border border-stone-200 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Library Stock</span>
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900">
            {totalAvailableCopies}{' '}
            <span className="text-xs font-normal text-stone-500 font-sans">
              / {books.length} titles
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`text-xs p-2.5 rounded-lg border ${
            feedback.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Return Notices Banner if students notified returns */}
      {returnNotifiedLoans.length > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Pending Student Return Notices ({returnNotifiedLoans.length})</span>
          </div>
          <div className="space-y-1.5">
            {returnNotifiedLoans.map((loan) => {
              const { copy } = getCopyForLoan(loan);
              return (
                <div
                  key={loan.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs bg-white/85 p-2.5 rounded border border-emerald-100"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      <span className="font-semibold text-stone-900">{loan.studentName}</span>{' '}
                      reported return of <strong>{loan.bookTitle}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-900 text-white font-mono text-[10px] font-semibold">
                      Exemplaire #{copy?.copyNumber ?? '?'} · {loan.copyId}
                      {copy?.barcode ? ` · ${copy.barcode}` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenReturnCheck(loan.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify &amp; Check In</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desk Sub-Navigation: Active Loans vs Exemplaires Inventory */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDeskTab('loans')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              deskTab === 'loans'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Active Loans ({activeLoans.length})</span>
          </button>
          <button
            onClick={() => setDeskTab('inventory')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              deskTab === 'inventory'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Exemplaires &amp; QR Tags ({books.reduce((acc, b) => acc + b.copies.length, 0)})</span>
          </button>
        </div>
      </div>

      {deskTab === 'loans' ? (
        /* Active Loans Table */
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="text-xs font-bold text-stone-800">
              Active Borrowed Books ({displayedLoans.length})
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          {displayedLoans.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <span>
                {searchQuery
                  ? `No loans match "${searchQuery}".`
                  : 'No active borrowed books found.'}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 font-mono text-[11px]">
                    <th className="py-2.5 px-4 font-medium">Book</th>
                    <th className="py-2.5 px-4 font-medium">Lent Exemplaire</th>
                    <th className="py-2.5 px-4 font-medium">Student</th>
                    <th className="py-2.5 px-4 font-medium">Due Date</th>
                    <th className="py-2.5 px-4 font-medium">Status Widget</th>
                    <th className="py-2.5 px-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedLoans.map((loan) => {
                    const { book: targetBook, copy: targetCopy } = getCopyForLoan(loan);

                    return (
                      <tr
                        key={loan.id}
                        className={`hover:bg-stone-50/50 transition-colors ${
                          loan.returnNotified ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-900 line-clamp-1">
                            {loan.bookTitle}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {loan.printingHouse}
                          </div>
                          {loan.returnNotified && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold text-[10px] mt-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Student Notified Return</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white font-semibold text-[11px]">
                              #{targetCopy?.copyNumber ?? '?'}
                            </span>
                            <span className="text-stone-800 font-medium text-[11px]">
                              {loan.copyId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-stone-500 mt-1">
                            <span>{targetCopy?.barcode ?? 'No barcode'}</span>
                            <span>·</span>
                            <span className="capitalize">{targetCopy?.condition ?? 'good'}</span>
                            {targetBook && (
                              <>
                                <span>·</span>
                                <button
                                  onClick={() =>
                                    setSelectedQRCopy({ book: targetBook, copy: targetCopy })
                                  }
                                  className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 underline transition-colors cursor-pointer"
                                  title="View Exemplaire QR Tag"
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>QR Tag</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-stone-900">{loan.studentName}</div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            {loan.studentEmail}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-stone-700">
                          {formatDate(loan.dueDate)}
                        </td>

                        {/* Painted Widget */}
                        <td className="py-3 px-4">
                          <OverdueMeter dueDate={loan.dueDate} compact={true} />
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleWarnStudent(loan.id)}
                              className="px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-medium transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center"
                              title={`Send warning notice to ${loan.studentName}'s email (${loan.studentEmail}) and in-app inbox`}
                              aria-label={`Send warning notice to ${loan.studentName}`}
                            >
                              <span>⚠️</span>
                            </button>
                            <button
                              onClick={() => handleOpenReturnCheck(loan.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                                loan.returnNotified
                                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                                  : 'text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200'
                              }`}
                              title="Verify returned exemplaire matches the lent copy"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{loan.returnNotified ? 'Verify Return' : 'Check Return'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Exemplaires & QR Tags Inventory */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Filter by title, author, Copy ID, or barcode..."
                className="w-full py-1.5 pl-8 pr-3 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>
            <span className="text-[11px] text-stone-500 font-mono">
              Manager-only exemplaire registry
            </span>
          </div>

          <div className="space-y-3">
            {books
              .filter((book) => {
                if (!inventorySearch.trim()) return true;
                const q = inventorySearch.toLowerCase().trim();
                return (
                  book.title.toLowerCase().includes(q) ||
                  book.author.toLowerCase().includes(q) ||
                  book.printingHouse.toLowerCase().includes(q) ||
                  book.copies.some(
                    (c) =>
                      c.id.toLowerCase().includes(q) || c.barcode.toLowerCase().includes(q)
                  )
                );
              })
              .map((book) => {
                const availCount = book.copies.filter((c) => c.status === 'available').length;
                return (
                  <div
                    key={book.id}
                    className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-stone-900">{book.title}</h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {availCount} / {book.copies.length} available
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {book.author} · {book.printingHouse} ·{' '}
                          <span className="font-mono">{book.shelfLocation}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => addNewCopy(book.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Exemplaire</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {book.copies.map((copy) => {
                        const activeLoanForCopy = activeLoans.find(
                          (l) => l.copyId === copy.id
                        );
                        return (
                          <div
                            key={copy.id}
                            className={`p-2.5 rounded-md border text-xs flex items-center justify-between gap-2 ${
                              copy.status === 'borrowed'
                                ? 'bg-amber-50/50 border-amber-200'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-stone-900">
                                  #{copy.copyNumber}
                                </span>
                                <span className="text-stone-700 truncate">{copy.id}</span>
                              </div>
                              <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                                {copy.barcode} · <span className="capitalize">{copy.condition}</span>
                              </div>
                              {activeLoanForCopy ? (
                                <div className="text-[10px] text-amber-900 font-medium mt-0.5 truncate">
                                  Lent to {activeLoanForCopy.studentName}
                                </div>
                              ) : (
                                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                  Available on shelf
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {activeLoanForCopy && (
                                <button
                                  onClick={() => handleOpenReturnCheck(activeLoanForCopy.id)}
                                  className="p-1.5 rounded bg-stone-900 hover:bg-stone-800 text-white transition-colors cursor-pointer"
                                  title="Check return of this exemplaire"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedQRCopy({ book, copy })}
                                className="p-1.5 rounded bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 transition-colors cursor-pointer"
                                title={`Print / View QR Tag for Exemplaire #${copy.copyNumber}`}
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Lend Book Modal */}
      {isLendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-800" />
                <h2 className="text-sm font-bold text-stone-900">Issue New Book Loan</h2>
              </div>
              <button
                onClick={() => setIsLendModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmLend} className="p-5 space-y-4 text-xs">
              {/* Select Book */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">Select Book</label>
                <input
                  type="text"
                  placeholder="Filter books..."
                  value={bookFilter}
                  onChange={(e) => setBookFilter(e.target.value)}
                  className="w-full px-3 py-1.5 mb-2 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                />
                <select
                  value={selectedBookId}
                  onChange={(e) => {
                    const nextBookId = e.target.value;
                    setSelectedBookId(nextBookId);
                    const book = books.find((b) => b.id === nextBookId);
                    const firstAvail = book?.copies.find((c) => c.status === 'available');
                    setSelectedCopyId(firstAvail?.id || '');
                  }}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  required
                >
                  <option value="">-- Choose a book --</option>
                  {books
                    .filter(
                      (b) =>
                        !bookFilter ||
                        b.title.toLowerCase().includes(bookFilter.toLowerCase()) ||
                        b.author.toLowerCase().includes(bookFilter.toLowerCase())
                    )
                    .map((book) => {
                      const avail = book.copies.filter((c) => c.status === 'available').length;
                      return (
                        <option
                          key={book.id}
                          value={book.id}
                          disabled={avail === 0}
                        >
                          {book.title} ({book.printingHouse}) — {avail} available
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Select Specific Exemplaire (Admin only) */}
              {selectedBookId && (() => {
                const selectedBook = books.find((b) => b.id === selectedBookId);
                const availableCopies =
                  selectedBook?.copies.filter((c) => c.status === 'available') || [];
                if (availableCopies.length === 0) return null;
                return (
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      Exemplaire to Lend (Manager Assignment)
                    </label>
                    <select
                      value={selectedCopyId}
                      onChange={(e) => setSelectedCopyId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-stone-900"
                    >
                      {availableCopies.map((copy) => (
                        <option key={copy.id} value={copy.id}>
                          Exemplaire #{copy.copyNumber} · {copy.id} ({copy.barcode} · {copy.condition})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* Select Student */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Borrowing Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  required
                >
                  <option value="">-- Choose a registered student --</option>
                  {studentUsers.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.name} ({stu.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Loan Duration */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Loan Duration (Days)
                </label>
                <select
                  value={loanDays}
                  onChange={(e) => setLoanDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days (Standard)</option>
                  <option value={21}>21 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLendModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-md cursor-pointer shadow-2xs"
                >
                  Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Book Modal */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2">
                <BookPlus className="w-4 h-4 text-stone-800" />
                <h2 className="text-sm font-bold text-stone-900">Add Book to Catalog</h2>
              </div>
              <button
                onClick={() => setIsAddBookModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBookSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., The Brothers Karamazov"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Fyodor Dostoevsky"
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Publisher / Printing House
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Penguin Classics"
                    value={newBookPublisher}
                    onChange={(e) => setNewBookPublisher(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    ISBN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 978-0140449242"
                    value={newBookIsbn}
                    onChange={(e) => setNewBookIsbn(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={newBookYear}
                    onChange={(e) => setNewBookYear(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newBookCopies}
                    onChange={(e) => setNewBookCopies(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newBookCategory}
                    onChange={(e) => setNewBookCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                  >
                    <option value="Literature">Literature</option>
                    <option value="Art & Design">Art & Design</option>
                    <option value="Comics & Graphic Novels">Comics</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Shelf Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., Stack 2 · Shelf C-08"
                  value={newBookShelf}
                  onChange={(e) => setNewBookShelf(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-md cursor-pointer shadow-2xs"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Warning Email & In-App Notice Modal */}
      {pendingWarnLoan && (() => {
        const connectedEmail = getConnectedGmailEmail();
        const quickEmail =
          connectedEmail ||
          (currentUser && !currentUser.email.endsWith('@foliodesk.edu')
            ? currentUser.email
            : null);
        const isDemoPlaceholder = warnRecipientEmail.trim().toLowerCase().endsWith('@foliodesk.edu');
        const hasToken = !!getAccessToken();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <div
              className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-amber-50/70">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <h2 className="text-sm font-bold text-stone-900">
                    Confirm Student Notice &amp; Email
                  </h2>
                </div>
                <button
                  onClick={() => !isSendingWarn && setPendingWarnLoan(null)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-stone-700 leading-relaxed">
                  Are you sure you want to send a{' '}
                  {calculateOverdueStatus(pendingWarnLoan.dueDate, currentDate).isLate
                    ? 'overdue warning'
                    : 'return reminder'}{' '}
                  to <strong>{pendingWarnLoan.studentName}</strong>?
                </p>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label
                        htmlFor="warn-recipient-email"
                        className="text-stone-600 font-medium"
                      >
                        Recipient Email:
                      </label>
                      {quickEmail &&
                        quickEmail.toLowerCase() !== warnRecipientEmail.trim().toLowerCase() && (
                          <button
                            type="button"
                            onClick={() => {
                              setWarnRecipientEmail(quickEmail);
                              setWarnModalError(null);
                            }}
                            className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline cursor-pointer"
                          >
                            Use my Gmail ({quickEmail})
                          </button>
                        )}
                    </div>
                    <input
                      id="warn-recipient-email"
                      type="email"
                      value={warnRecipientEmail}
                      onChange={(e) => {
                        setWarnRecipientEmail(e.target.value);
                        setWarnModalError(null);
                      }}
                      placeholder="student@gmail.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md font-mono text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                    {isDemoPlaceholder && (
                      <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                        <code>@foliodesk.edu</code> is a demo placeholder domain and will not reach a real inbox. Edit the address above to test real Gmail delivery.
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-stone-200/70">
                    <span className="text-stone-500">Book:</span>
                    <span className="font-semibold text-stone-900 text-right">
                      {pendingWarnLoan.bookTitle}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Due Date:</span>
                    <span className="font-mono text-stone-800">
                      {formatDate(pendingWarnLoan.dueDate)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Channels:</span>
                    <span className="font-medium text-stone-800">
                      Gmail Email + Student App Inbox
                    </span>
                  </div>
                </div>

                {/* Gmail Authorization Status */}
                {hasToken ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Sending via Gmail: <strong>{connectedEmail || 'Connected account'}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectGmailInModal}
                      disabled={isConnectingGmail || isSendingWarn}
                      className="text-[11px] underline text-emerald-800 hover:text-emerald-950 cursor-pointer shrink-0"
                    >
                      Switch
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-amber-900 leading-relaxed">
                      Google / Gmail authorization is needed for this session so the app can send real emails via your Gmail account.
                    </p>
                    {gmailAuthError && (
                      <p className="text-[11px] text-rose-700 font-medium">{gmailAuthError}</p>
                    )}
                  </div>
                )}

                {warnModalError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 leading-relaxed">
                    <strong>Email Error:</strong> {warnModalError}
                  </div>
                )}

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isSendingWarn}
                    onClick={() => setPendingWarnLoan(null)}
                    className="px-3 py-1.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    {!hasToken && (
                      <button
                        type="button"
                        disabled={isSendingWarn || isConnectingGmail}
                        onClick={() => handleConfirmSendWarning({ skipEmail: true })}
                        className="px-3 py-1.5 text-stone-700 hover:text-stone-950 border border-stone-300 bg-stone-50 hover:bg-stone-100 rounded-md cursor-pointer disabled:opacity-50"
                      >
                        App Inbox Only
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSendingWarn || isConnectingGmail}
                      onClick={() => handleConfirmSendWarning()}
                      className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-md cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isSendingWarn
                        ? 'Sending...'
                        : hasToken
                        ? 'Confirm & Send Email + Notice'
                        : 'Connect Google & Send Email'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
