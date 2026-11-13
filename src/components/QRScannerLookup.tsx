import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { Book, BookCopy } from '../types/library';
import { OverdueMeter } from './OverdueMeter';
import { ArrowRight, CheckCircle, QrCode, ScanLine, Search, UserCheck } from 'lucide-react';

export const QRScannerLookup: React.FC = () => {
  const { books, loans, users, adminReturnCopy, adminCheckout, setSelectedQRCopy, currentUser } =
    useLibrary();

  const [inputCode, setInputCode] = useState('');
  const [matchedItem, setMatchedItem] = useState<{ book: Book; copy: BookCopy } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);
  const [selectedStudentForCheckout, setSelectedStudentForCheckout] = useState(
    users.find((u) => u.role === 'student')?.id || ''
  );

  const handleLookup = (codeToSearch: string) => {
    const q = codeToSearch.trim().toLowerCase();
    if (!q) return;

    let foundBook: Book | undefined;
    let foundCopy: BookCopy | undefined;

    for (const b of books) {
      const c = b.copies.find(
        (copy) => copy.id.toLowerCase() === q || copy.barcode.toLowerCase() === q
      );
      if (c) {
        foundBook = b;
        foundCopy = c;
        break;
      }
    }

    if (foundBook && foundCopy) {
      setMatchedItem({ book: foundBook, copy: foundCopy });
      setFeedback(null);
    } else {
      setMatchedItem(null);
      setFeedback({ message: `No copy found matching "${codeToSearch}".`, isError: true });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(inputCode);
  };

  const handleReturn = (copyId: string) => {
    const res = adminReturnCopy(copyId);
    setFeedback({ message: res.message, isError: !res.success });
    // refresh matched copy
    handleLookup(copyId);
  };

  const handleCheckout = (copyId: string) => {
    if (!selectedStudentForCheckout) return;
    const res = adminCheckout(copyId, selectedStudentForCheckout);
    setFeedback({ message: res.message, isError: !res.success });
    handleLookup(copyId);
  };

  const quickScanSamples = [
    { label: 'BK-101-C1 (Yellow - Slightly Late)', code: 'BK-101-C1' },
    { label: 'BK-102-C1 (Red - Very Late)', code: 'BK-102-C1' },
    { label: 'BK-103-C1 (Black - Overly Late)', code: 'BK-103-C1' },
    { label: 'BK-104-C1 (Green - On Time)', code: 'BK-104-C1' },
    { label: 'BK-101-C2 (Available Copy)', code: 'BK-101-C2' },
  ];

  const activeLoan = matchedItem
    ? loans.find(
        (l) => l.copyId.toLowerCase() === matchedItem.copy.id.toLowerCase() && l.status === 'active'
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
          <ScanLine className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Barcode &amp; QR Code Scanner
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Scan or enter a copy ID / barcode to instantly inspect physical location, borrower information, and overdue return meter.
        </p>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto">
        <div className="flex items-center bg-white border-2 border-stone-300 focus-within:border-stone-900 rounded-xl shadow-xs overflow-hidden">
          <div className="pl-4 text-stone-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Type or scan Copy ID (e.g. BK-101-C1, FD-101-01)..."
            className="w-full py-3.5 px-3 text-sm font-mono text-stone-900 bg-transparent placeholder-stone-400 focus:outline-hidden"
          />
          <button
            type="submit"
            className="m-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            Lookup
          </button>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-stone-500 flex-wrap">
          <span className="text-stone-400">Quick tests:</span>
          {quickScanSamples.map((sample) => (
            <button
              key={sample.code}
              type="button"
              onClick={() => {
                setInputCode(sample.code);
                handleLookup(sample.code);
              }}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-mono text-[11px] transition-colors cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </form>

      {feedback && (
        <div
          className={`max-w-xl mx-auto p-3 text-xs rounded-lg border ${
            feedback.isError
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Matched Copy Details Card */}
      {matchedItem && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900 font-mono">
                  Copy #{matchedItem.copy.copyNumber} · {matchedItem.copy.id}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-mono capitalize ${
                    matchedItem.copy.status === 'available'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {matchedItem.copy.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-stone-900 mt-1">{matchedItem.book.title}</h2>
              <p className="text-xs text-stone-600">by {matchedItem.book.author}</p>
            </div>

            <button
              onClick={() => setSelectedQRCopy(matchedItem)}
              className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <QrCode className="w-4 h-4" />
              <span>Inspect QR</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-400 block font-sans">Printing House</span>
              <strong className="text-stone-800 font-medium">{matchedItem.book.printingHouse}</strong>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-400 block font-sans">Barcode</span>
              <strong className="text-stone-800 font-medium">{matchedItem.copy.barcode}</strong>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg">
              <span className="text-[10px] text-stone-400 block font-sans">Shelf Location</span>
              <strong className="text-stone-800 font-medium">{matchedItem.copy.shelfLocation}</strong>
            </div>
          </div>

          {/* Active Loan Details with Overdue Meter */}
          {activeLoan ? (
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-sans">Current Borrower:</span>
                  <span className="font-semibold text-stone-900 font-sans">
                    {activeLoan.studentName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-500 font-sans">University Email:</span>
                  <span className="text-stone-800">{activeLoan.studentEmail}</span>
                </div>
              </div>

              {/* The Overdue Meter */}
              <div>
                <OverdueMeter
                  dueDate={activeLoan.dueDate}
                  compact={false}
                />
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleReturn(matchedItem.copy.id)}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
                >
                  Confirm Check In / Return This Copy to Shelf
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  This copy is on shelf and available for lending at <strong>{matchedItem.copy.shelfLocation}</strong>.
                </span>
              </div>

              {currentUser?.role === 'admin' && (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold text-stone-900">Check Out to Student</h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStudentForCheckout}
                      onChange={(e) => setSelectedStudentForCheckout(e.target.value)}
                      className="flex-1 text-xs py-2 px-3 bg-white border border-stone-200 rounded-lg focus:outline-hidden"
                    >
                      {users
                        .filter((u) => u.role === 'student')
                        .map((stu) => (
                          <option key={stu.id} value={stu.id}>
                            {stu.name} ({stu.email})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleCheckout(matchedItem.copy.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
                    >
                      Check Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
