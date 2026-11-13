import React from 'react';
import { QrCode, Search, X } from 'lucide-react';
import { SearchFilters } from '../types/library';

interface SearchHeaderProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onOpenScanner?: () => void;
  scannedBookTitle?: string | null;
  onClearScannedBadge?: () => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  filters,
  setFilters,
  onOpenScanner,
  scannedBookTitle,
  onClearScannedBadge,
}) => {
  return (
    <div className="py-10 px-4 sm:px-6 max-w-3xl mx-auto space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Library Catalog</h1>
        <p className="text-xs text-stone-500 mt-1">
          Search by title, author, printing house, or scan a book&apos;s QR code
        </p>
      </div>

      {/* Minimalist Search Bar with Scan QR Action */}
      <div className="relative flex items-center bg-white border border-stone-300 focus-within:border-stone-900 focus-within:ring-1 focus-within:ring-stone-900 rounded-lg shadow-2xs transition-all">
        <div className="pl-4 text-stone-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filters.query}
          onChange={(e) => {
            if (onClearScannedBadge && scannedBookTitle) onClearScannedBadge();
            setFilters((prev) => ({ ...prev, query: e.target.value }));
          }}
          placeholder="Type title, author, or publisher (e.g. Dostoevsky, Watchmen, MIT Press)..."
          className="w-full py-3 px-3 text-sm text-stone-900 bg-transparent placeholder-stone-400 focus:outline-hidden"
          autoFocus
        />

        {filters.query && (
          <button
            onClick={() => {
              if (onClearScannedBadge && scannedBookTitle) onClearScannedBadge();
              setFilters((prev) => ({ ...prev, query: '' }));
            }}
            className="p-1 text-stone-400 hover:text-stone-700 mr-1.5 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Scan QR Button for Students */}
        {onOpenScanner && (
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 mr-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Scan book QR code via camera or saved image"
          >
            <QrCode className="w-3.5 h-3.5 text-stone-800" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>
        )}
      </div>

      {/* Scanned Feedback Badge if detected via QR */}
      {scannedBookTitle && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              QR scanned: filtered to <strong>&ldquo;{scannedBookTitle}&rdquo;</strong>
            </span>
          </div>
          <button
            onClick={onClearScannedBadge}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
