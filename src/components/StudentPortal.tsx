import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { calculateOverdueStatus, formatDate } from '../utils/overdue';
import { OverdueMeter } from './OverdueMeter';
import { CheckCircle2, GraduationCap, QrCode } from 'lucide-react';

interface StudentPortalProps {
  onBrowseCatalog: () => void;
  onOpenAuth: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onBrowseCatalog,
  onOpenAuth,
}) => {
  const {
    currentUser,
    loans,
    books,
    setSelectedQRCopy,
    extendLoan,
    notifyReturn,
    currentDate,
  } = useLibrary();

  const [feedback, setFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white border border-stone-200 rounded-lg text-center shadow-2xs">
        <GraduationCap className="w-8 h-8 text-stone-400 mx-auto mb-2" />
        <h2 className="text-base font-bold text-stone-900 mb-1">Student Portal</h2>
        <p className="text-xs text-stone-500 mb-4">
          Please sign in to view your borrowed books and request extensions.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const studentLoans = loans.filter(
    (l) => l.studentId === currentUser.id && l.status === 'active'
  );

  const handleExtend = (loanId: string) => {
    const res = extendLoan(loanId);
    setFeedback({ id: loanId, message: res.message, isError: !res.success });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleNotifyReturn = (loanId: string) => {
    const res = notifyReturn(loanId);
    setFeedback({ id: loanId, message: res.message, isError: !res.success });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Student Profile Header (only name and email, no student IDs or departments) */}
      <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-stone-900">{currentUser.name}</h1>
          <p className="text-xs text-stone-500 mt-0.5 font-mono">
            {currentUser.email}
          </p>
        </div>

        <div>
          <button
            onClick={onBrowseCatalog}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors cursor-pointer"
          >
            Search Catalog
          </button>
        </div>
      </div>

      {/* Borrowed Books List (no copy numbers and no copy IDs) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">
          My Borrowed Books ({studentLoans.length})
        </h2>

        {studentLoans.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-xs text-stone-400">
            You do not currently have any borrowed books. Use the search bar to find and lend books.
          </div>
        ) : (
          <div className="space-y-3">
            {studentLoans.map((loan) => {
              const book = books.find((b) => b.id === loan.bookId);
              const status = calculateOverdueStatus(loan.dueDate, currentDate);
              const isOverlyLate = status.severity === 'overly_late';
              const isExtended = !!loan.hasExtended;

              return (
                <div
                  key={loan.id}
                  className="bg-white border border-stone-200 rounded-lg p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-stone-500">
                        <span>Printing House: {loan.printingHouse}</span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 mt-0.5">
                        {loan.bookTitle}
                      </h3>
                      <p className="text-xs text-stone-600">by {loan.bookAuthor}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Overdue Painted Widget */}
                      <OverdueMeter dueDate={loan.dueDate} compact={true} />

                      {book && (
                        <button
                          onClick={() => setSelectedQRCopy({ book })}
                          className="p-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                          title="Show Book QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {feedback?.id === loan.id && (
                    <div
                      className={`text-xs p-2 rounded ${
                        feedback.isError ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {feedback.message}
                    </div>
                  )}

                  {/* Actions Row: Notify Return & Extension Controls */}
                  <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <span className="text-stone-500 font-mono">
                      Due: <strong>{formatDate(loan.dueDate)}</strong>
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Notify Return button */}
                      {loan.returnNotified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Return Notified (Pending Check-In)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleNotifyReturn(loan.id)}
                          className="px-3 py-1 font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded transition-colors cursor-pointer"
                          title="Notify the library admins that you have returned this book"
                        >
                          Notify Return
                        </button>
                      )}

                      {/* Extension Rules: 7 days only once, reject if overly late */}
                      {isOverlyLate ? (
                        <span className="text-stone-900 font-semibold bg-stone-100 px-2 py-1 rounded text-[11px]">
                          Overly late: extension blocked
                        </span>
                      ) : isExtended ? (
                        <span className="text-stone-400 text-xs italic">
                          7d extended
                        </span>
                      ) : (
                        <button
                          onClick={() => handleExtend(loan.id)}
                          className="px-2.5 py-1 font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded transition-colors cursor-pointer"
                        >
                          Extend +7 Days
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
