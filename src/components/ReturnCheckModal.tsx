import React, { useEffect, useMemo, useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Book, BookCopy, CopyCondition } from '../types/library';
import { formatDate } from '../utils/overdue';
import { OverdueMeter } from './OverdueMeter';
import { QRCodeScannerModal } from './QRCodeScannerModal';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ReturnCheckModalProps {
  onFeedback?: (feedback: { message: string; isError?: boolean }) => void;
}

export const ReturnCheckModal: React.FC<ReturnCheckModalProps> = ({ onFeedback }) => {
  const {
    books,
    loans,
    currentUser,
    returnCheckLoanId,
    setReturnCheckLoanId,
    returnBook,
    reportReturnMismatch,
  } = useLibrary();

  const [checkInput, setCheckInput] = useState('');
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [returnCondition, setReturnCondition] = useState<CopyCondition>('good');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loan = useMemo(
    () => (returnCheckLoanId ? loans.find((l) => l.id === returnCheckLoanId) || null : null),
    [loans, returnCheckLoanId]
  );

  const targetBook = useMemo(
    () => (loan ? books.find((b) => b.id === loan.bookId) || null : null),
    [books, loan]
  );

  const expectedCopy = useMemo(
    () => (targetBook && loan ? targetBook.copies.find((c) => c.id === loan.copyId) || null : null),
    [targetBook, loan]
  );

  useEffect(() => {
    if (returnCheckLoanId) {
      setCheckInput('');
      setScanWarning(null);
      setReturnCondition(expectedCopy?.condition || 'good');
    }
  }, [returnCheckLoanId, expectedCopy?.condition]);

  if (!returnCheckLoanId || currentUser?.role !== 'admin' || !loan) {
    return null;
  }

  // Resolve what the admin entered or scanned
  const trimmedInput = checkInput.trim();
  let matchedCopy: BookCopy | null = null;
  let matchedBook: Book | null = null;

  if (trimmedInput) {
    const q = trimmedInput.toLowerCase();
    for (const b of books) {
      const found = b.copies.find(
        (c) => c.id.toLowerCase() === q || c.barcode.toLowerCase() === q
      );
      if (found) {
        matchedBook = b;
        matchedCopy = found;
        break;
      }
    }
  }

  const isExactMatch = !!matchedCopy && matchedCopy.id.toLowerCase() === loan.copyId.toLowerCase();
  const isWrongCopyOfSameBook =
    !!matchedCopy &&
    !!matchedBook &&
    matchedBook.id === loan.bookId &&
    matchedCopy.id.toLowerCase() !== loan.copyId.toLowerCase();
  const isDifferentBook = !!matchedCopy && !!matchedBook && matchedBook.id !== loan.bookId;
  const isUnrecognized = !!trimmedInput && !matchedCopy;

  const otherLoanForScanned =
    isWrongCopyOfSameBook && matchedCopy
      ? loans.find((l) => l.copyId === matchedCopy!.id && l.status === 'active')
      : undefined;

  const handleClose = () => {
    setReturnCheckLoanId(null);
  };

  const handleConfirmCheckIn = () => {
    if (!isExactMatch || !matchedCopy) return;
    const res = returnBook(loan.id, {
      verifiedCopyId: matchedCopy.id,
      returnCondition,
    });
    onFeedback?.({ message: res.message, isError: !res.success });
    if (res.success) {
      setReturnCheckLoanId(null);
    }
  };

  const handleSendMismatchNotice = () => {
    const res = reportReturnMismatch(loan.id);
    onFeedback?.({ message: res.message, isError: !res.success });
    if (res.success) {
      setReturnCheckLoanId(null);
    }
  };

  const handleQRDetected = (result: {
    rawText: string;
    title?: string;
    isbn?: string;
    copyId?: string;
    copyNumber?: number;
    barcode?: string;
  }) => {
    setScanWarning(null);
    if (result.copyId || result.barcode) {
      setCheckInput(result.copyId || result.barcode || '');
      return;
    }

    // Book-level QR code scanned (lacks exemplaire ID)
    if (result.title || result.isbn) {
      const matchesSameTitle =
        (result.isbn && targetBook?.isbn === result.isbn) ||
        (result.title && targetBook?.title.toLowerCase() === result.title.toLowerCase());
      setScanWarning(
        matchesSameTitle
          ? `Book-level QR scanned for "${result.title || result.isbn}", which does not specify the exemplaire #. Please scan the Exemplaire QR tag or enter/select the physical copy ID/barcode.`
          : `Book-level QR scanned for "${result.title || result.isbn}", which is a different title from "${loan.bookTitle}".`
      );
      setCheckInput('');
      return;
    }

    setCheckInput(result.rawText);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <div
          className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-stone-900" />
              <h2 className="text-sm font-bold text-stone-900">
                Verify Returned Exemplaire
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            {/* Loan Summary */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-stone-900">{loan.bookTitle}</div>
                  <div className="text-stone-600 mt-0.5">
                    by {loan.bookAuthor} · <span className="font-mono">{loan.printingHouse}</span>
                  </div>
                </div>
                <OverdueMeter dueDate={loan.dueDate} compact={true} />
              </div>

              <div className="pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                <span>
                  Borrower: <strong className="text-stone-900">{loan.studentName}</strong> ({loan.studentEmail})
                </span>
                <span className="font-mono">Due {formatDate(loan.dueDate)}</span>
              </div>
            </div>

            {/* Expected Lent Exemplaire */}
            <div className="border border-stone-300 bg-stone-900 text-white rounded-lg p-3.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1.5">
                Expected Lent Exemplaire
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-white text-stone-900 font-bold text-xs">
                    Exemplaire #{expectedCopy?.copyNumber ?? '?'}
                  </span>
                  <span className="text-stone-200 font-semibold">{loan.copyId}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-stone-300">
                  <span>Barcode: {expectedCopy?.barcode ?? 'N/A'}</span>
                  <span>·</span>
                  <span className="capitalize">Cond: {expectedCopy?.condition ?? 'good'}</span>
                </div>
              </div>
            </div>

            {/* Check Input + QR Scanner */}
            <div className="space-y-2">
              <label className="block font-semibold text-stone-800">
                Scan or Enter Returned Book Exemplaire
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={checkInput}
                    onChange={(e) => {
                      setCheckInput(e.target.value);
                      setScanWarning(null);
                    }}
                    placeholder="Enter Copy ID or Barcode (e.g. BK-101-C1, FD-101-01)..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                </button>
              </div>

              {/* Quick physical exemplaire selector for this title */}
              {targetBook && targetBook.copies.length > 0 && (
                <div className="pt-1">
                  <div className="text-[11px] text-stone-500 mb-1.5">
                    Or select the physical exemplaire tag found inside the returned book:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {targetBook.copies.map((copy) => {
                      const isSelected =
                        trimmedInput.toLowerCase() === copy.id.toLowerCase() ||
                        trimmedInput.toLowerCase() === copy.barcode.toLowerCase();
                      const isExpected = copy.id === loan.copyId;
                      return (
                        <button
                          key={copy.id}
                          type="button"
                          onClick={() => {
                            setCheckInput(copy.id);
                            setScanWarning(null);
                          }}
                          className={`px-2.5 py-1.5 rounded-md border font-mono text-[11px] transition-colors cursor-pointer text-left ${
                            isSelected
                              ? isExpected
                                ? 'bg-emerald-900 text-white border-emerald-900'
                                : 'bg-rose-700 text-white border-rose-700'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border-stone-200'
                          }`}
                        >
                          <span className="font-bold">#{copy.copyNumber}</span> · {copy.id} ({copy.barcode})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Result Feedback */}
            {scanWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{scanWarning}</span>
              </div>
            )}

            {isExactMatch && matchedCopy && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-start gap-2 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Exact Exemplaire Match Verified</div>
                    <p className="text-emerald-800 mt-0.5">
                      Returned book is <strong className="font-mono">Exemplaire #{matchedCopy.copyNumber}</strong> ({matchedCopy.id} · {matchedCopy.barcode}), matching the copy lent to {loan.studentName}.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between gap-3">
                  <label className="text-emerald-900 font-medium">
                    Condition on Return:
                  </label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as CopyCondition)}
                    className="px-2.5 py-1 bg-white border border-emerald-300 rounded text-xs font-mono text-stone-900 focus:outline-hidden"
                  >
                    <option value="mint">Mint</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>
              </div>
            )}

            {isWrongCopyOfSameBook && matchedCopy && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2.5 text-rose-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Wrong Exemplaire Returned (Mismatch)</div>
                    <p className="mt-0.5 leading-relaxed">
                      Expected <strong className="font-mono">Exemplaire #{expectedCopy?.copyNumber ?? '?'}</strong> ({loan.copyId}), but checked <strong className="font-mono">Exemplaire #{matchedCopy.copyNumber}</strong> ({matchedCopy.id} · {matchedCopy.barcode}).
                    </p>
                    <p className="text-[11px] text-rose-800 mt-1">
                      {otherLoanForScanned
                        ? `Exemplaire #${matchedCopy.copyNumber} is currently lent to ${otherLoanForScanned.studentName} (${otherLoanForScanned.studentEmail}).`
                        : `Exemplaire #${matchedCopy.copyNumber} is currently recorded as "${matchedCopy.status}" on shelf.`}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-200/70 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendMismatchNotice}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Reject &amp; Notify Student of Mismatch
                  </button>
                </div>
              </div>
            )}

            {isDifferentBook && matchedBook && matchedCopy && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg space-y-2.5 text-rose-900">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Different Book Scanned (Mismatch)</div>
                    <p className="mt-0.5 leading-relaxed">
                      Scanned <strong>&ldquo;{matchedBook.title}&rdquo;</strong> (<span className="font-mono">Exemplaire #{matchedCopy.copyNumber} · {matchedCopy.id}</span>), which is not the lent book <strong>&ldquo;{loan.bookTitle}&rdquo;</strong>.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-200/70 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSendMismatchNotice}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Reject &amp; Notify Student of Mismatch
                  </button>
                </div>
              </div>
            )}

            {isUnrecognized && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>
                  No exemplaire found matching <strong className="font-mono">{trimmedInput}</strong>. Check the Copy ID or barcode inside the book cover.
                </span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-1.5 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isExactMatch}
                onClick={handleConfirmCheckIn}
                className={`px-4 py-1.5 font-semibold rounded-md transition-colors ${
                  isExactMatch
                    ? 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer shadow-2xs'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                Confirm &amp; Check In Exemplaire
              </button>
            </div>
          </div>
        </div>
      </div>

      <QRCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan Returned Exemplaire QR"
        hint="Point your camera at or upload the Exemplaire QR tag from the returned book."
        onDetected={handleQRDetected}
      />
    </>
  );
};
