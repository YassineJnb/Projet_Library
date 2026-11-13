export type Role = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CopyCondition = 'mint' | 'good' | 'fair';
export type CopyStatus = 'available' | 'borrowed' | 'requested' | 'maintenance';

export interface BookCopy {
  id: string;
  bookId: string;
  copyNumber: number;
  barcode: string;
  status: CopyStatus;
  condition: CopyCondition;
  shelfLocation: string;
  currentLoanId?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  printingHouse: string; // Publisher / Printing House
  isbn: string;
  publicationYear: number;
  category: string;
  description: string;
  coverAccent: string;
  shelfLocation: string;
  copies: BookCopy[];
  waitlistUserIds?: string[];
}

export interface Loan {
  id: string;
  copyId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  printingHouse: string;
  studentId: string; // User ID
  studentName: string;
  studentEmail: string;
  borrowDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnedDate?: string | null;
  status: 'active' | 'returned';
  hasExtended?: boolean;
  returnNotified?: boolean;
  returnNotifiedAt?: string;
}

export type OverdueSeverity = 'on_time' | 'slightly_late' | 'very_late' | 'overly_late';

export interface OverdueCalculation {
  diffDays: number;
  severity: OverdueSeverity;
  comment: string;
  meterColor: string;
  badgeClasses: string;
  percentage: number;
  isLate: boolean;
}

export interface SearchFilters {
  query: string;
  component: 'all' | 'title' | 'author' | 'printingHouse';
  category: string;
  availability: 'all' | 'available' | 'borrowed';
}

export type NotificationType =
  | 'return_notified'
  | 'book_back_in_stock'
  | 'overdue_alert'
  | 'return_mismatch';

export interface AppNotification {
  id: string;
  recipientRole?: Role;
  recipientUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  bookId?: string;
  copyId?: string;
  loanId?: string;
  severity?: OverdueSeverity;
  sentToEmail?: boolean;
  recipientEmail?: string;
}
