import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { PlusCircle, X } from 'lucide-react';

interface NewBookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBookModal: React.FC<NewBookModalProps> = ({ isOpen, onClose }) => {
  const { addNewBook } = useLibrary();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [printingHouse, setPrintingHouse] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(2024);
  const [category, setCategory] = useState('Computer Science');
  const [shelfLocation, setShelfLocation] = useState('Stack 3 · Shelf B-05');
  const [description, setDescription] = useState('');
  const [copiesCount, setCopiesCount] = useState<number>(2);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !printingHouse) return;

    addNewBook(
      {
        title,
        author,
        printingHouse,
        isbn: isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        publicationYear: Number(publicationYear) || 2024,
        category,
        shelfLocation: shelfLocation || 'Stack 1 · Shelf A-01',
        description: description || 'Library physical asset registered into catalog.',
        coverAccent: 'from-stone-800 to-stone-950',
      },
      copiesCount
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-stone-900" />
            <h2 className="text-base font-bold text-stone-900">Register New Book into Catalog</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Book Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operating System Concepts"
              className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Author(s) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Abraham Silberschatz"
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Printing House / Publisher <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={printingHouse}
                onChange={(e) => setPrintingHouse(e.target.value)}
                placeholder="e.g. John Wiley & Sons"
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 font-sans">
                ISBN
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-1118063330"
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 font-sans">
                Year
              </label>
              <input
                type="number"
                value={publicationYear}
                onChange={(e) => setPublicationYear(Number(e.target.value))}
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 font-sans">
                Copies to Print
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={copiesCount}
                onChange={(e) => setCopiesCount(Math.max(1, Number(e.target.value)))}
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:border-stone-900 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Classic Literature">Classic Literature</option>
                <option value="Science Fiction">Science Fiction</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Historical Studies">Historical Studies</option>
                <option value="Philosophy">Philosophy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Shelf Location
              </label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="Stack 3 · Shelf B-05"
                className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description / Abstract
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of book topic..."
              className="w-full text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-stone-100 rounded-lg text-xs text-stone-600 font-mono">
            ℹ️ System will automatically generate <strong>{copiesCount} individual copies</strong>, each with its own unique Copy ID, barcode, and QR code sticker.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
            >
              Register Book &amp; Generate QR Codes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
