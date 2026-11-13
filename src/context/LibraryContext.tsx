import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  SEED_BOOKS,
  SEED_LOANS,
  SEED_NOTIFICATIONS,
  SEED_USERS,
} from '../data/seedData';
import { AppNotification, Book, BookCopy, CopyCondition, Loan, User } from '../types/library';
import { calculateOverdueStatus } from '../utils/overdue';
import {
  clearAccessToken,
  firebaseSignOut,
  getAccessToken,
} from '../lib/firebase';

interface LibraryContextType {
  books: Book[];
  loans: Loan[];
  users: User[];
  currentUser: User | null;
  currentDate: string;
  notifications: AppNotification[];
  selectedQRCopy: { book: Book; copy?: BookCopy } | null;
  returnCheckLoanId: string | null;
  isDbSynced: boolean;
  setSelectedQRCopy: (item: { book: Book; copy?: BookCopy } | null) => void;
  setReturnCheckLoanId: (loanId: string | null) => void;
  login: (user: User) => void;
  logout: () => void;
  setCurrentDate: (date: string) => void;
  shiftCurrentDate: (days: number) => void;
  resetSimulatedDate: () => void;
  borrowBook: (bookId: string) => { success: boolean; message: string };
  returnBook: (
    loanId: string,
    options?: { verifiedCopyId?: string; returnCondition?: CopyCondition }
  ) => { success: boolean; message: string };
  reportReturnMismatch: (loanId: string) => { success: boolean; message: string };
  extendLoan: (loanId: string) => { success: boolean; message: string };
  notifyReturn: (loanId: string) => { success: boolean; message: string };
  requestStockNotification: (bookId: string) => { success: boolean; message: string };
  notifyLateStudents: () => { success: boolean; message: string; count: number };
  notifyStudentLoanWarning: (
    loanId: string,
    overrideEmail?: string,
    options?: { skipEmail?: boolean }
  ) => Promise<{
    success: boolean;
    message: string;
    emailSent?: boolean;
    emailError?: string;
    emailNeedsReauth?: boolean;
    gmailMessageId?: string;
    recipientEmail?: string;
  }>;
  markNotificationAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  adminCheckout: (copyId: string, studentId: string, loanDays?: number) => { success: boolean; message: string };
  adminReturnCopy: (copyId: string) => { success: boolean; message: string };
  addNewBook: (
    bookData: {
      title: string;
      author: string;
      printingHouse: string;
      isbn?: string;
      publicationYear?: number;
      category?: string;
      shelfLocation?: string;
      description?: string;
      copiesCount?: number;
      coverAccent?: string;
    },
    numberOfCopies?: number
  ) => { success: boolean; message: string };
  addNewCopy: (bookId: string) => void;
  resetAllData: () => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BOOKS: 'foliodesk_books_v6',
  LOANS: 'foliodesk_loans_v6',
  USERS: 'foliodesk_users_v6',
  CURRENT_USER: 'foliodesk_current_user_v6',
  CURRENT_DATE: 'foliodesk_current_date_v6',
  NOTIFICATIONS: 'foliodesk_notifications_v6',
};

const getRealTodayDate = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKS);
      return saved ? JSON.parse(saved) : SEED_BOOKS;
    } catch {
      return SEED_BOOKS;
    }
  });

  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOANS);
      return saved ? JSON.parse(saved) : SEED_LOANS;
    } catch {
      return SEED_LOANS;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      return saved ? JSON.parse(saved) : SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return saved ? JSON.parse(saved) : SEED_USERS[2]; // Default to Student Alex Rivera for immediate testing
    } catch {
      return SEED_USERS[2];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : SEED_NOTIFICATIONS;
    } catch {
      return SEED_NOTIFICATIONS;
    }
  });

  const [currentDate, setCurrentDateState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DATE);
      return saved || getRealTodayDate();
    } catch {
      return getRealTodayDate();
    }
  });

  const [selectedQRCopy, setSelectedQRCopy] = useState<{ book: Book; copy?: BookCopy } | null>(null);
  const [returnCheckLoanId, setReturnCheckLoanId] = useState<string | null>(null);
  const [isDbSynced, setIsDbSynced] = useState<boolean>(false);

  // Sync with full-stack Express server database on initial load
  useEffect(() => {
    let isMounted = true;
    fetch('/api/database')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted || !data.success) return;
        if (data.books && Array.isArray(data.books)) setBooks(data.books);
        if (data.loans && Array.isArray(data.loans)) setLoans(data.loans);
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const dbMatch = (data.users as User[]).find(
              (u) => u.email.toLowerCase() === prev.email.toLowerCase()
            );
            return dbMatch ? { ...prev, id: dbMatch.id, name: dbMatch.name, role: dbMatch.role } : prev;
          });
        }
        if (data.notifications && Array.isArray(data.notifications)) setNotifications(data.notifications);
        if (data.currentDate) setCurrentDateState(data.currentDate);
        setIsDbSynced(true);
      })
      .catch((err) => {
        console.warn('Backend DB initial sync deferred, running with local storage cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    } catch (e) {
      console.error(e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
    } catch (e) {
      console.error(e);
    }
  }, [loans]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_DATE, currentDate);
    } catch (e) {
      console.error(e);
    }
  }, [currentDate]);

  const login = (user: User) => {
    setCurrentUser(user);
    if (!users.some((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())) {
      setUsers((prev) => [...prev, user]);
    }

    // Persist user to backend database
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, uid: user.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user && data.user.uid) {
          const syncedUser: User = {
            id: data.user.uid,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
          };
          setCurrentUser((prev) => (prev && prev.email.toLowerCase() === syncedUser.email.toLowerCase() ? syncedUser : prev));
          setUsers((prev) => {
            const exists = prev.some((u) => u.email.toLowerCase() === syncedUser.email.toLowerCase());
            if (!exists) return [...prev, syncedUser];
            return prev.map((u) => (u.email.toLowerCase() === syncedUser.email.toLowerCase() ? syncedUser : u));
          });
        }
      })
      .catch(console.warn);
  };

  const logout = () => {
    setCurrentUser(null);
    firebaseSignOut().catch(console.warn);
  };

  const setCurrentDate = (date: string) => {
    setCurrentDateState(date);
  };

  const shiftCurrentDate = (days: number) => {
    const cur = new Date(currentDate);
    cur.setDate(cur.getDate() + days);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    setCurrentDateState(`${yyyy}-${mm}-${dd}`);
  };

  const resetSimulatedDate = () => {
    setCurrentDateState(getRealTodayDate());
  };

  // Student borrowing: lends an available copy of the book
  const borrowBook = (bookId: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to lend books.' };
    }
    if (currentUser.role !== 'student') {
      return { success: false, message: 'Only registered students can lend books directly.' };
    }

    const book = books.find((b) => b.id === bookId);
    if (!book) return { success: false, message: 'Book not found.' };

    const copy = book.copies.find((c) => c.status === 'available');
    if (!copy) {
      return { success: false, message: 'No copies currently available to lend.' };
    }

    const borrowDate = currentDate;
    const due = new Date(currentDate);
    due.setDate(due.getDate() + 14);
    const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

    const newLoanId = `loan-${Date.now()}`;
    const newLoan: Loan = {
      id: newLoanId,
      copyId: copy.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      printingHouse: book.printingHouse,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      borrowDate,
      dueDate,
      status: 'active',
    };

    setLoans((prev) => [newLoan, ...prev]);

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          copies: b.copies.map((c) => {
            if (c.id !== copy.id) return c;
            return {
              ...c,
              status: 'borrowed',
              currentLoanId: newLoanId,
            };
          }),
        };
      })
    );

    // Call persistent backend API
    fetch('/api/loans/borrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        loanDays: 14,
        loanId: newLoanId,
        copyId: copy.id,
      }),
    }).catch(console.warn);

    return {
      success: true,
      message: `Checked out "${book.title}". Due date is ${dueDate}.`,
    };
  };

  // Return book: optionally verifies returned exemplaire matches lent copy, releases copy & handles waitlist stock alerts
  const returnBook = (
    loanId: string,
    options?: { verifiedCopyId?: string; returnCondition?: CopyCondition }
  ): { success: boolean; message: string } => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    if (
      options?.verifiedCopyId &&
      options.verifiedCopyId.toLowerCase() !== loan.copyId.toLowerCase()
    ) {
      return {
        success: false,
        message: `Exemplaire mismatch: expected copy ${loan.copyId}, received ${options.verifiedCopyId}.`,
      };
    }

    const nowTimestamp = `${currentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId ? { ...l, status: 'returned', returnedDate: currentDate, returnNotified: false } : l
      )
    );

    // Release copy in books catalog & notify waiting students
    const targetBook = books.find((b) => b.id === loan.bookId);

    if (targetBook && targetBook.waitlistUserIds && targetBook.waitlistUserIds.length > 0) {
      const backInStockNotifs: AppNotification[] = targetBook.waitlistUserIds.map((userId) => ({
        id: `notif-stock-${Date.now()}-${userId}`,
        recipientRole: 'student',
        recipientUserId: userId,
        type: 'book_back_in_stock',
        title: 'Book Back in Stock',
        message: `"${targetBook.title}" (${targetBook.printingHouse}) is now back in stock with an available copy!`,
        timestamp: nowTimestamp,
        read: false,
        bookId: targetBook.id,
      }));

      setNotifications((prev) => [...backInStockNotifs, ...prev]);

      // Clear notified students from waitlist
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== loan.bookId) return b;
          return {
            ...b,
            waitlistUserIds: [],
            copies: b.copies.map((c) => {
              if (c.id !== loan.copyId) return c;
              return {
                ...c,
                status: 'available',
                currentLoanId: undefined,
                ...(options?.returnCondition ? { condition: options.returnCondition } : {}),
              };
            }),
          };
        })
      );
    } else {
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== loan.bookId) return b;
          return {
            ...b,
            copies: b.copies.map((c) => {
              if (c.id !== loan.copyId) return c;
              return {
                ...c,
                status: 'available',
                currentLoanId: undefined,
                ...(options?.returnCondition ? { condition: options.returnCondition } : {}),
              };
            }),
          };
        })
      );
    }

    // Dismiss the admin return notice for this loan if present
    setNotifications((prev) =>
      prev.map((n) => (n.loanId === loanId ? { ...n, read: true } : n))
    );

    // Call persistent backend API
    fetch('/api/loans/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId,
        verifiedCopyId: options?.verifiedCopyId,
        returnCondition: options?.returnCondition,
      }),
    }).catch(console.warn);

    return {
      success: true,
      message: `Book "${loan.bookTitle}" checked in successfully.`,
    };
  };

  // Report wrong exemplaire returned at desk (keeps copy ID opaque to student)
  const reportReturnMismatch = (loanId: string): { success: boolean; message: string } => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    const nowTimestamp = `${currentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const notifId = `notif-mismatch-${Date.now()}`;

    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, returnNotified: false } : l))
    );

    const mismatchNotif: AppNotification = {
      id: notifId,
      recipientRole: 'student',
      recipientUserId: loan.studentId,
      type: 'return_mismatch',
      title: 'Returned Copy Mismatch',
      message: `The copy of "${loan.bookTitle}" brought to the desk did not match the copy originally lent to you. Please return the exact physical copy you borrowed.`,
      timestamp: nowTimestamp,
      read: false,
      bookId: loan.bookId,
      loanId: loan.id,
    };

    setNotifications((prev) => [mismatchNotif, ...prev]);

    fetch('/api/loans/report-mismatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, notificationId: notifId }),
    }).catch(console.warn);

    return {
      success: true,
      message: `Mismatch notice sent to ${loan.studentName}'s inbox. Loan remains active until the correct exemplaire is returned.`,
    };
  };

  // Student notifies return of a borrowed book
  const notifyReturn = (loanId: string): { success: boolean; message: string } => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    const nowTimestamp = `${currentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, returnNotified: true, returnNotifiedAt: nowTimestamp } : l))
    );

    const adminNotif: AppNotification = {
      id: `notif-ret-${Date.now()}`,
      recipientRole: 'admin',
      type: 'return_notified',
      title: 'Return Notice',
      message: `${loan.studentName} notified that they returned "${loan.bookTitle}". Pending desk confirmation.`,
      timestamp: nowTimestamp,
      read: false,
      bookId: loan.bookId,
      copyId: loan.copyId,
      loanId: loan.id,
    };

    setNotifications((prev) => [adminNotif, ...prev]);

    // Call backend API
    fetch('/api/loans/notify-return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, notificationId: adminNotif.id }),
    }).catch(console.warn);

    return {
      success: true,
      message: 'Library staff notified of return. They will confirm once received at the desk.',
    };
  };

  // Request back-in-stock notification
  const requestStockNotification = (bookId: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to set notifications.' };
    }

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        const currentList = b.waitlistUserIds || [];
        if (currentList.includes(currentUser.id)) return b;
        return { ...b, waitlistUserIds: [...currentList, currentUser.id] };
      })
    );

    fetch('/api/notifications/stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, userId: currentUser.id }),
    }).catch(console.warn);

    return {
      success: true,
      message: "Notification set! You'll receive an alert in your inbox as soon as a copy is returned.",
    };
  };

  // Student extends loan
  const extendLoan = (loanId: string): { success: boolean; message: string } => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    if (loan.hasExtended) {
      return { success: false, message: 'This book has already been extended once.' };
    }

    const overdue = calculateOverdueStatus(loan.dueDate, currentDate);
    if (overdue.severity === 'overly_late') {
      return {
        success: false,
        message: 'Loan is overly late (> 14 days overdue). Extensions are blocked by policy.',
      };
    }

    const due = new Date(loan.dueDate);
    due.setDate(due.getDate() + 7);
    const newDueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, dueDate: newDueDate, hasExtended: true } : l))
    );

    fetch('/api/loans/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId }),
    }).catch(console.warn);

    return {
      success: true,
      message: `7-day extension granted. New due date: ${newDueDate}.`,
    };
  };

  // Notify late students about their overdue books
  const notifyLateStudents = (): { success: boolean; message: string; count: number } => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const lateLoans = activeLoans.filter((loan) => {
      const status = calculateOverdueStatus(loan.dueDate, currentDate);
      return status.isLate;
    });

    if (lateLoans.length === 0) {
      return {
        success: true,
        message: 'No overdue books found. All student loans are currently on time.',
        count: 0,
      };
    }

    const nowTimestamp = `${currentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newAlerts: AppNotification[] = lateLoans.map((loan, idx) => {
      const status = calculateOverdueStatus(loan.dueDate, currentDate);
      return {
        id: `notif-overdue-${Date.now()}-${idx}-${loan.id}`,
        recipientRole: 'student',
        recipientUserId: loan.studentId,
        type: 'overdue_alert',
        title: `Overdue Notice: ${status.comment}`,
        message: `Your borrowed book "${loan.bookTitle}" was due on ${loan.dueDate} and is now ${status.diffDays} day${status.diffDays > 1 ? 's' : ''} overdue (${status.comment}). Please return it to the library desk immediately.`,
        timestamp: nowTimestamp,
        read: false,
        bookId: loan.bookId,
        loanId: loan.id,
        severity: status.severity,
      };
    });

    setNotifications((prev) => [...newAlerts, ...prev]);

    fetch('/api/notifications/notify-late', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(console.warn);

    return {
      success: true,
      message: `Overdue notifications sent to ${lateLoans.length} student${lateLoans.length > 1 ? 's' : ''}.`,
      count: lateLoans.length,
    };
  };

  const notifyStudentLoanWarning = async (
    loanId: string,
    overrideEmail?: string,
    options?: { skipEmail?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    emailSent?: boolean;
    emailError?: string;
    emailNeedsReauth?: boolean;
    gmailMessageId?: string;
    recipientEmail?: string;
  }> => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return { success: false, emailSent: false, message: 'Loan not found.' };

    const targetEmail = (overrideEmail?.trim() || loan.studentEmail).trim();
    const status = calculateOverdueStatus(loan.dueDate, currentDate);
    const nowTimestamp = `${currentDate} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let title: string;
    let message: string;

    if (status.isLate) {
      title = `⚠️ Overdue Notice: ${status.comment} (${status.diffDays}d late)`;
      message = `Attention ${loan.studentName}: Your borrowed book "${loan.bookTitle}" (${loan.printingHouse}) was due on ${loan.dueDate} and is now ${status.diffDays} day${status.diffDays > 1 ? 's' : ''} overdue (${status.comment}). Please return it to the library desk immediately.`;
    } else {
      const daysRemaining = Math.max(0, -status.diffDays);
      const dayLabel = daysRemaining === 0 ? 'Due Today' : `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
      title = `⚠️ Return Reminder: ${dayLabel}`;
      message = `Friendly reminder for ${loan.studentName}: Your borrowed book "${loan.bookTitle}" (${loan.printingHouse}) is due on ${loan.dueDate} (${dayLabel}). Please ensure you return or renew it on time.`;
    }

    const notifId = `notif-warn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const accessToken = options?.skipEmail ? null : getAccessToken();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch('/api/loans/notify-student', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          loanId,
          notificationId: notifId,
          overrideEmail: targetEmail,
          fallbackLoan: {
            bookId: loan.bookId,
            copyId: loan.copyId,
            bookTitle: loan.bookTitle,
            bookAuthor: loan.bookAuthor,
            printingHouse: loan.printingHouse,
            studentId: loan.studentId,
            studentName: loan.studentName,
            studentEmail: loan.studentEmail,
            borrowDate: loan.borrowDate,
            dueDate: loan.dueDate,
          },
        }),
      });

      const data = await res.json();
      if (data.emailNeedsReauth && accessToken) {
        clearAccessToken();
      }

      const newAlert: AppNotification = {
        id: data.notificationId || notifId,
        recipientRole: 'student',
        recipientUserId: loan.studentId,
        type: 'overdue_alert',
        title: data.notification?.title || title,
        message: data.notification?.message || message,
        timestamp: data.notification?.timestamp || nowTimestamp,
        read: false,
        bookId: loan.bookId,
        loanId: loan.id,
        copyId: loan.copyId,
        severity: status.severity,
        sentToEmail: !!data.emailSent,
        recipientEmail: data.recipientEmail || targetEmail,
      };

      setNotifications((prev) => [newAlert, ...prev]);

      return {
        success: !!data.success,
        emailSent: !!data.emailSent,
        emailError: data.emailError,
        emailNeedsReauth: !!data.emailNeedsReauth,
        gmailMessageId: data.gmailMessageId,
        recipientEmail: data.recipientEmail || targetEmail,
        message:
          data.message ||
          (data.emailSent
            ? `Notice sent to ${loan.studentName}'s Gmail (${targetEmail}) and in-app inbox!`
            : `Saved to ${loan.studentName}'s in-app inbox.`),
      };
    } catch (err: any) {
      const fallbackAlert: AppNotification = {
        id: notifId,
        recipientRole: 'student',
        recipientUserId: loan.studentId,
        type: 'overdue_alert',
        title,
        message,
        timestamp: nowTimestamp,
        read: false,
        bookId: loan.bookId,
        loanId: loan.id,
        copyId: loan.copyId,
        severity: status.severity,
        sentToEmail: false,
        recipientEmail: targetEmail,
      };
      setNotifications((prev) => [fallbackAlert, ...prev]);
      return {
        success: true,
        emailSent: false,
        emailError: err?.message || 'Failed to reach email server.',
        recipientEmail: targetEmail,
        message: `Saved to ${loan.studentName}'s in-app inbox, but failed to reach email server.`,
      };
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(console.warn);
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(console.warn);
  };

  const adminCheckout = (
    copyId: string,
    studentId: string,
    loanDays = 14
  ): { success: boolean; message: string } => {
    const student = users.find((u) => u.id === studentId);
    if (!student) return { success: false, message: 'Student account not found.' };

    let targetBook: Book | undefined;
    let targetCopy: BookCopy | undefined;

    for (const b of books) {
      const c = b.copies.find(
        (item) => item.id.toLowerCase() === copyId.toLowerCase() || item.barcode.toLowerCase() === copyId.toLowerCase()
      );
      if (c) {
        targetBook = b;
        targetCopy = c;
        break;
      }
    }

    if (!targetBook || !targetCopy) {
      return { success: false, message: `No copy found matching ID "${copyId}".` };
    }

    if (targetCopy.status !== 'available') {
      return { success: false, message: `Copy ${targetCopy.id} is currently ${targetCopy.status}.` };
    }

    const due = new Date(currentDate);
    due.setDate(due.getDate() + loanDays);
    const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;

    const newLoanId = `loan-${Date.now()}`;
    const newLoan: Loan = {
      id: newLoanId,
      copyId: targetCopy.id,
      bookId: targetBook.id,
      bookTitle: targetBook.title,
      bookAuthor: targetBook.author,
      printingHouse: targetBook.printingHouse,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      borrowDate: currentDate,
      dueDate,
      status: 'active',
    };

    setLoans((prev) => [newLoan, ...prev]);

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== targetBook!.id) return b;
        return {
          ...b,
          copies: b.copies.map((c) => {
            if (c.id !== targetCopy!.id) return c;
            return {
              ...c,
              status: 'borrowed',
              currentLoanId: newLoanId,
            };
          }),
        };
      })
    );

    fetch('/api/loans/borrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: targetBook.id,
        userId: student.id,
        userEmail: student.email,
        userName: student.name,
        loanDays,
        loanId: newLoanId,
        copyId: targetCopy.id,
      }),
    }).catch(console.warn);

    return {
      success: true,
      message: `Checked out copy ${targetCopy.id} to ${student.name}.`,
    };
  };

  const adminReturnCopy = (copyId: string): { success: boolean; message: string } => {
    const activeLoan = loans.find((l) => l.copyId === copyId && l.status === 'active');
    if (!activeLoan) return { success: false, message: `No active loan found for copy ${copyId}.` };
    return returnBook(activeLoan.id);
  };

  const addNewBook = (
    bookData: {
      title: string;
      author: string;
      printingHouse: string;
      isbn?: string;
      publicationYear?: number;
      category?: string;
      shelfLocation?: string;
      description?: string;
      copiesCount?: number;
      coverAccent?: string;
    },
    numberOfCopies?: number
  ): { success: boolean; message: string } => {
    const bookId = `bk-${Date.now()}`;
    const copiesNum = Math.max(1, numberOfCopies || bookData.copiesCount || 1);

    const copies: BookCopy[] = Array.from({ length: copiesNum }, (_, i) => ({
      id: `${bookId}-C${i + 1}`,
      bookId,
      copyNumber: i + 1,
      barcode: `FD-${Date.now().toString().slice(-4)}-${i + 1}`,
      status: 'available',
      condition: 'mint',
      shelfLocation: bookData.shelfLocation || 'General Stacks',
    }));

    const newBook: Book = {
      id: bookId,
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      printingHouse: (bookData.printingHouse || 'General Publishing').trim(),
      isbn: (bookData.isbn || `978-${Math.floor(1000000000 + Math.random() * 9000000000)}`).trim(),
      publicationYear: bookData.publicationYear || new Date().getFullYear(),
      category: bookData.category || 'General',
      shelfLocation: bookData.shelfLocation || 'General Stacks',
      description: bookData.description || `Published by ${bookData.printingHouse || 'Library'}.`,
      coverAccent: 'from-stone-700 to-stone-900',
      copies,
      waitlistUserIds: [],
    };

    setBooks((prev) => [newBook, ...prev]);

    fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...bookData,
        id: bookId,
        copiesCount: copiesNum,
        copies,
      }),
    }).catch(console.warn);

    return {
      success: true,
      message: `Added "${newBook.title}" to catalog with ${copiesNum} available copies.`,
    };
  };

  const addNewCopy = (bookId: string) => {
    const target = books.find((b) => b.id === bookId);
    if (!target) return;
    const newCopyNum = target.copies.length + 1;
    const newCopy: BookCopy = {
      id: `${target.id}-C${newCopyNum}`,
      bookId: target.id,
      copyNumber: newCopyNum,
      barcode: `FD-${Date.now().toString().slice(-4)}-${newCopyNum}`,
      status: 'available',
      condition: 'mint',
      shelfLocation: target.shelfLocation,
    };

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        return {
          ...b,
          copies: [...b.copies, newCopy],
        };
      })
    );

    fetch(`/api/books/${bookId}/copies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newCopy.id,
        copyNumber: newCopy.copyNumber,
        barcode: newCopy.barcode,
      }),
    }).catch(console.warn);
  };

  const resetAllData = () => {
    fetch('/api/reset', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setBooks(data.data.books);
          setLoans(data.data.loans);
          setUsers(data.data.users);
          setNotifications(data.data.notifications);
          setCurrentDateState(getRealTodayDate());
        }
      })
      .catch(() => {
        setBooks(SEED_BOOKS);
        setLoans(SEED_LOANS);
        setUsers(SEED_USERS);
        setNotifications(SEED_NOTIFICATIONS);
        setCurrentDateState(getRealTodayDate());
      });
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        loans,
        users,
        currentUser,
        currentDate,
        notifications,
        selectedQRCopy,
        returnCheckLoanId,
        isDbSynced,
        setSelectedQRCopy,
        setReturnCheckLoanId,
        login,
        logout,
        setCurrentDate,
        shiftCurrentDate,
        resetSimulatedDate,
        borrowBook,
        returnBook,
        reportReturnMismatch,
        extendLoan,
        notifyReturn,
        requestStockNotification,
        notifyLateStudents,
        notifyStudentLoanWarning,
        markNotificationAsRead,
        deleteNotification,
        adminCheckout,
        adminReturnCopy,
        addNewBook,
        addNewCopy,
        resetAllData,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
