/**
 * Book Cover API utilities using the Open Library Covers API and Google Books API
 */

export function cleanIsbn(isbn: string): string {
  return isbn.replace(/[^0-9X]/gi, '');
}

/**
 * Returns the Open Library cover image URL for a given ISBN
 * @param isbn Book ISBN-10 or ISBN-13
 * @param size 'S' (small thumbnail), 'M' (medium card), 'L' (large modal preview)
 */
export function getOpenLibraryCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
  const cleaned = cleanIsbn(isbn);
  if (!cleaned) return '';
  // default=false returns 404 when no image is found, allowing our onError fallback to trigger cleanly
  return `https://covers.openlibrary.org/b/isbn/${cleaned}-${size}.jpg?default=false`;
}

/**
 * Fallback to Google Books Volume API if needed for cover thumbnail
 */
export async function fetchGoogleBooksCover(isbn: string): Promise<string | null> {
  const cleaned = cleanIsbn(isbn);
  if (!cleaned) return null;

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleaned}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const imageLinks = data.items[0]?.volumeInfo?.imageLinks;
      const thumbnail = imageLinks?.thumbnail || imageLinks?.smallThumbnail;
      if (thumbnail) {
        // Upgrade http to https
        return thumbnail.replace(/^http:\/\//i, 'https://');
      }
    }
    return null;
  } catch (err) {
    console.warn('Error fetching cover from Google Books API', err);
    return null;
  }
}
