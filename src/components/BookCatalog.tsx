import React, { useState } from 'react';
import { Book, SearchFilters } from '../types/library';
import { useLibrary } from '../context/LibraryContext';
import { BookCoverPreview } from './BookCoverPreview';
import { Bell, QrCode } from 'lucide-react';

interface BookCatalogProps {
  filters: SearchFilters;
  onOpenAuth: () => void;
}

export const BookCatalog: React.FC<BookCatalogProps> = ({ filters, onOpenAuth }) => {
  const {
    books,
    currentUser,
    borrowBook,
    setSelectedQRCopy,
    requestStockNotification,
  } = useLibrary();

  const [feedback, setFeedback] = useState<{ id: string; message: string; isError?: boolean } | null>(null);

  const query = filters.query.toLowerCase().trim();

  // ONLY after typing do we show results
  if (!query) {
    return (
      <div className="max-w-md mx-auto text-center py-16 text-stone-400 text-xs">
        Type a book title, author, or printing house above to view matching books.
      </div>
    );
  }

  // Prefix search algorithm: matches first letters of title, author first/last name, or publishing house
  const matchingBooks = books.filter((book) => {
    const normalizeText = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const normQuery = normalizeText(query);

    // Direct full-field prefix match (e.g. "clean co", "fyodor do", "mit pr")
    if (
      normQuery &&
      (normalizeText(book.title).startsWith(normQuery) ||
        normalizeText(book.author).startsWith(normQuery) ||
        normalizeText(book.printingHouse).startsWith(normQuery))
    ) {
      return true;
    }

    const tokens = query.split(/\s+/).filter(Boolean);

    const wordsStartWith = (text: string, token: string): boolean => {
      if (!text) return false;
      const spaceWords = text.toLowerCase().split(/[\s\-–—,.:;"/\\()\[\]{}]+/);
      const punctWords = text.toLowerCase().split(/[\s\-–—,.:;'"/\\()\[\]{}]+/);
      return [...spaceWords, ...punctWords].some((raw) => {
        const cleaned = raw.replace(/[^a-z0-9]/g, '');
        return cleaned.length > 0 && cleaned.startsWith(token);
      });
    };

    const authorFirstOrLastNameMatches = (authorStr: string, token: string): boolean => {
      if (!authorStr) return false;
      const authors = authorStr.split(/,\s*(?:and\s+)?|\s+and\s+/i);
      for (const author of authors) {
        const parts = author
          .trim()
          .split(/\s+/)
          .map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''))
          .filter(Boolean);
        if (parts.length > 0) {
          const firstName = parts[0];
          const secondName = parts.length > 2 && firstName.length === 1 ? parts[1] : null;
          const lastName = parts[parts.length - 1];
          if (
            firstName.startsWith(token) ||
            (secondName !== null && secondName.startsWith(token)) ||
            lastName.startsWith(token)
          ) {
            return true;
          }
        }
      }
      return false;
    };

    const titleMatches = (title: string, token: string): boolean => {
      if (!title) return false;
      if (normalizeText(title).startsWith(token)) return true;
      return wordsStartWith(title, token);
    };

    const publisherMatches = (publisher: string, token: string): boolean => {
      if (!publisher) return false;
      if (normalizeText(publisher).startsWith(token)) return true;
      return wordsStartWith(publisher, token);
    };

    const isbnMatches = (isbn: string, token: string): boolean => {
      if (!isbn) return false;
      const cleanIsbn = isbn.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanIsbn.startsWith(token);
    };

    return tokens.every((token) => {
      const cleanToken = token.replace(/[^a-z0-9]/g, '');
      if (!cleanToken) return true;

      return (
        titleMatches(book.title, cleanToken) ||
        authorFirstOrLastNameMatches(book.author, cleanToken) ||
        publisherMatches(book.printingHouse, cleanToken) ||
        isbnMatches(book.isbn, cleanToken)
      );
    });
  });

  const handleLend = (bookId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const res = borrowBook(bookId);
    setFeedback({ id: bookId, message: res.message, isError: !res.success });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRequestStockAlert = (bookId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const res = requestStockNotification(bookId);
    setFeedback({ id: bookId, message: res.message, isError: !res.success });
    setTimeout(() => setFeedback(null), 4000);
  };

  if (matchingBooks.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 text-stone-500 text-xs">
        No books found matching &ldquo;<span className="text-stone-800 font-semibold">{filters.query}</span>&rdquo;.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-4">
      <div className="text-xs text-stone-400 pb-1">
        Found {matchingBooks.length} {matchingBooks.length === 1 ? 'book' : 'books'}
      </div>

      {matchingBooks.map((book) => {
        const availableCopies = book.copies.filter((c) => c.status === 'available');
        const availableCount = availableCopies.length;
        const isOutOfStock = availableCount === 0;
        const isWaitlisted = currentUser && (book.waitlistUserIds || []).includes(currentUser.id);

        return (
          <div
            key={book.id}
            className="bg-white border border-stone-200 rounded-lg p-5 shadow-2xs space-y-4"
          >
            {/* Top row: Live Cover Preview + Book Details */}
            <div className="flex items-start gap-4">
              {/* Cover Preview via Open Library / Google Books Covers API */}
              <BookCoverPreview book={book} size="md" allowModalPreview={true} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                  <span>Printing House: <strong className="text-stone-800 font-medium">{book.printingHouse}</strong></span>
                  <span>·</span>
                  <span>{book.publicationYear}</span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">ISBN {book.isbn}</span>
                </div>
                <h2 className="text-base font-bold text-stone-900 mt-1">{book.title}</h2>
                <p className="text-xs text-stone-600 mt-0.5">by {book.author}</p>
                <div className="text-[11px] text-stone-400 mt-1 font-mono">
                  Location: {book.shelfLocation}
                </div>

                {/* Single Lend Action Bar with Available Copies Count & QR Code */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-3 flex-wrap">
                  {/* Single Lend button: stops working when available copies === 0 */}
                  <button
                    disabled={isOutOfStock}
                    onClick={() => handleLend(book.id)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      isOutOfStock
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer shadow-2xs'
                    }`}
                  >
                    Lend
                  </button>

                  {/* Number of copies available next to it */}
                  <span className={`text-xs font-mono font-medium ${isOutOfStock ? 'text-rose-600' : 'text-stone-700'}`}>
                    {availableCount} {availableCount === 1 ? 'copy' : 'copies'} available
                  </span>

                  {/* QR Code button next to it (no copy number and no copy id) */}
                  <button
                    onClick={() => setSelectedQRCopy({ book })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors cursor-pointer"
                    title="View Book QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-stone-800" />
                    <span>QR Code</span>
                  </button>

                  {/* Back-in-stock notification when available count is 0 */}
                  {isOutOfStock && currentUser?.role === 'student' && (
                    <button
                      onClick={() => handleRequestStockAlert(book.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors font-medium cursor-pointer ${
                        isWaitlisted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        {isWaitlisted
                          ? 'Alert Active: You will be notified in Inbox'
                          : 'Notify me when back in stock'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {feedback?.id === book.id && (
              <div
                className={`text-xs p-2 rounded ${
                  feedback.isError ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {feedback.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
