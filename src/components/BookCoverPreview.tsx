import React, { useState, useEffect } from 'react';
import { getOpenLibraryCoverUrl, fetchGoogleBooksCover } from '../utils/bookCoverApi';
import { BookOpen, Expand, X } from 'lucide-react';
import { Book } from '../types/library';

interface BookCoverPreviewProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  allowModalPreview?: boolean;
}

export const BookCoverPreview: React.FC<BookCoverPreviewProps> = ({
  book,
  size = 'md',
  allowModalPreview = true,
}) => {
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);
    setIsLoading(true);

    const openLibraryUrl = getOpenLibraryCoverUrl(book.isbn, size === 'sm' ? 'S' : 'M');
    setCoverUrl(openLibraryUrl);

    // If Open Library fails later via onError, we will try Google Books
    return () => {
      isMounted = false;
    };
  }, [book.isbn, size]);

  const handleImageError = async () => {
    // Try Google Books API as fallback before giving up
    if (!coverUrl.includes('googleapis')) {
      const googleCover = await fetchGoogleBooksCover(book.isbn);
      if (googleCover) {
        setCoverUrl(googleCover);
        setIsLoading(false);
        return;
      }
    }
    setHasError(true);
    setIsLoading(false);
  };

  const dimensions = {
    sm: 'w-10 h-14',
    md: 'w-16 h-22 sm:w-20 sm:h-28',
    lg: 'w-32 h-44',
  }[size];

  return (
    <>
      <div
        className={`relative shrink-0 rounded-md overflow-hidden border border-stone-200/90 shadow-2xs group cursor-pointer bg-stone-100 ${dimensions}`}
        onClick={() => allowModalPreview && setIsModalOpen(true)}
        title={`Preview cover for ${book.title}`}
      >
        {!hasError && coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt={`Cover of ${book.title}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onLoad={() => setIsLoading(false)}
              onError={handleImageError}
            />
            {allowModalPreview && !isLoading && (
              <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Expand className="w-4 h-4 drop-shadow-md" />
              </div>
            )}
          </>
        ) : (
          // Stylized minimalist CSS/SVG Fallback Book Jacket
          <div
            className={`w-full h-full bg-gradient-to-br ${book.coverAccent} text-white p-2 flex flex-col justify-between select-none`}
          >
            <div className="flex items-center justify-between opacity-70">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[8px] font-mono">{book.publicationYear}</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold leading-tight line-clamp-2">{book.title}</p>
              <p className="text-[8px] opacity-80 truncate">{book.author}</p>
            </div>
          </div>
        )}

        {/* Loading shimmer */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-stone-200 animate-pulse" />
        )}
      </div>

      {/* High-Resolution Cover Preview Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Close cover preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* High-res cover from API */}
              <div className="w-44 h-64 shrink-0 rounded-lg overflow-hidden border border-stone-200 shadow-md bg-stone-100 relative">
                {!hasError ? (
                  <img
                    src={getOpenLibraryCoverUrl(book.isbn, 'L') || coverUrl}
                    alt={`High resolution cover for ${book.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to the working thumbnail URL if large fails
                      (e.target as HTMLImageElement).src = coverUrl;
                    }}
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${book.coverAccent} text-white p-4 flex flex-col justify-between`}
                  >
                    <BookOpen className="w-6 h-6 opacity-60" />
                    <div>
                      <h4 className="text-sm font-bold leading-snug">{book.title}</h4>
                      <p className="text-xs opacity-80 mt-1">by {book.author}</p>
                      <p className="text-[10px] font-mono opacity-70 mt-2">{book.printingHouse}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Book Details */}
              <div className="space-y-2 text-left flex-1">
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                  <span>Cover Preview API</span>
                  <span>·</span>
                  <span>Open Library</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 leading-tight">{book.title}</h3>
                <p className="text-xs text-stone-700">by <strong className="font-semibold text-stone-900">{book.author}</strong></p>

                <div className="pt-2 text-xs font-mono text-stone-600 space-y-1">
                  <div>Printing House: <strong className="text-stone-800">{book.printingHouse}</strong></div>
                  <div>ISBN: <strong className="text-stone-800">{book.isbn}</strong></div>
                  <div>Year: <strong className="text-stone-800">{book.publicationYear}</strong></div>
                  <div>Shelf: <strong className="text-stone-800">{book.shelfLocation}</strong></div>
                </div>

                <p className="text-xs text-stone-600 pt-2 border-t border-stone-100 line-clamp-4">
                  {book.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
