import React, { useEffect, useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { buildQRPayload, generateQRCodeDataUrl } from '../utils/qr';
import { Download, Printer, QrCode, X } from 'lucide-react';

export const QRCodeModal: React.FC = () => {
  const { selectedQRCopy, setSelectedQRCopy, currentUser } = useLibrary();
  const [dataUrl, setDataUrl] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin';
  const adminCopy = isAdmin ? selectedQRCopy?.copy : undefined;

  useEffect(() => {
    if (selectedQRCopy) {
      const payload = buildQRPayload(selectedQRCopy.book, adminCopy);
      generateQRCodeDataUrl(payload, 8).then(setDataUrl);
    } else {
      setDataUrl('');
    }
  }, [selectedQRCopy, adminCopy]);

  if (!selectedQRCopy) return null;

  const { book } = selectedQRCopy;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = adminCopy
      ? `QRCode_${book.title.replace(/\s+/g, '_')}_Exemplaire_${adminCopy.copyNumber}.png`
      : `QRCode_${book.title.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-stone-900" />
            <h2 className="text-sm font-semibold text-stone-900">
              {adminCopy ? `Exemplaire #${adminCopy.copyNumber} QR Tag` : 'Book QR Code'}
            </h2>
          </div>
          <button
            onClick={() => setSelectedQRCopy(null)}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Print Tag Area */}
        <div className="p-5">
          <div className="print-area flex flex-col items-center bg-stone-50 border border-stone-200 rounded-xl p-5 mb-4 text-center">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={
                  adminCopy
                    ? `Exemplaire #${adminCopy.copyNumber} QR code for ${book.title}`
                    : `QR code for ${book.title}`
                }
                className="w-48 h-48 rounded-lg bg-white p-2 shadow-xs border border-stone-200/80 object-contain"
              />
            ) : (
              <div className="w-48 h-48 rounded-lg bg-stone-200 animate-pulse flex items-center justify-center text-stone-400 text-xs">
                Generating QR...
              </div>
            )}

            <div className="mt-3 w-full">
              <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{book.title}</h3>
              <p className="text-xs text-stone-600 mt-0.5">by {book.author}</p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 mt-1.5 font-mono">
                <span>{book.printingHouse}</span>
                <span>·</span>
                <span>{adminCopy ? adminCopy.shelfLocation : book.shelfLocation}</span>
              </div>

              {adminCopy && (
                <div className="mt-2.5 pt-2.5 border-t border-stone-200 flex items-center justify-center gap-2 flex-wrap font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-stone-900 text-white font-semibold">
                    Exemplaire #{adminCopy.copyNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800">
                    {adminCopy.id}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-700">
                    {adminCopy.barcode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
