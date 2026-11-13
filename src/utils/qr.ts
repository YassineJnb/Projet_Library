import QRCode from 'qrcode';
import { Book, BookCopy } from '../types/library';

const qrCache = new Map<string, string>();

export interface QRPayload {
  system: 'LibraryManager';
  title: string;
  author: string;
  printingHouse: string;
  isbn: string;
  shelfLocation: string;
  copyId?: string;
  copyNumber?: number;
  barcode?: string;
}

/**
 * Builds QR payload.
 * When `copy` is omitted (student view), no copy number or copy ID is included.
 * When `copy` is provided (admin exemplaire tag), includes copyId, copyNumber, and barcode for return verification.
 */
export function buildQRPayload(book: Book, copy?: BookCopy): string {
  const payload: QRPayload = {
    system: 'LibraryManager',
    title: book.title,
    author: book.author,
    printingHouse: book.printingHouse,
    isbn: book.isbn,
    shelfLocation: copy ? copy.shelfLocation : book.shelfLocation,
    ...(copy
      ? {
          copyId: copy.id,
          copyNumber: copy.copyNumber,
          barcode: copy.barcode,
        }
      : {}),
  };
  return JSON.stringify(payload);
}

/**
 * Generates high-contrast QR code as PNG data URL
 */
export async function generateQRCodeDataUrl(text: string, scale: number = 6): Promise<string> {
  const cacheKey = `${text}_${scale}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale,
      color: {
        dark: '#1c1917', // stone-900
        light: '#ffffff',
      },
    });
    qrCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}
