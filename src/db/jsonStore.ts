import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_BOOKS, SEED_USERS } from '../data/seedData.ts';
import { AppNotification, Book, BookCopy, Loan, User } from '../types/library.ts';
import { calculateOverdueStatus } from '../utils/overdue.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../data/library-db.json');

interface JsonDbState {
  books: Book[];
  loans: Loan[];
  users: User[];
  notifications: AppNotification[];
  lastUpdated?: string;
}

const getTodayDate = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getNowTimestamp = (): string => {
  const now = new Date();
  const dateStr = getTodayDate();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} ${timeStr}`;
};

function buildSeedState(): JsonDbState {
  const today = getTodayDate();
  const books: Book[] = JSON.parse(JSON.stringify(SEED_BOOKS));
  const users: User[] = JSON.parse(JSON.stringify(SEED_USERS));

  const loans: Loan[] = [
    {
      id: 'loan-101',
      copyId: 'BK-101-C1',
      bookId: 'bk-101',
      bookTitle: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      bookAuthor: 'Robert C. Martin',
      printingHouse: 'Prentice Hall',
      studentId: 'user-stu-1',
      studentName: 'Alex Rivera',
      studentEmail: 'alex.rivera@foliodesk.edu',
      borrowDate: addDays(today, -16),
      dueDate: addDays(today, -2),
      status: 'active',
      returnNotified: true,
      returnNotifiedAt: `${today} 09:15`,
    },
    {
      id: 'loan-102',
      copyId: 'BK-102-C1',
      bookId: 'bk-102',
      bookTitle: 'Structure and Interpretation of Computer Programs',
      bookAuthor: 'Harold Abelson, Gerald Jay Sussman',
      printingHouse: 'MIT Press',
      studentId: 'user-stu-3',
      studentName: 'Liam Patel',
      studentEmail: 'liam.patel@foliodesk.edu',
      borrowDate: addDays(today, -22),
      dueDate: addDays(today, -8),
      status: 'active',
    },
    {
      id: 'loan-103',
      copyId: 'BK-103-C1',
      bookId: 'bk-103',
      bookTitle: 'Dune',
      bookAuthor: 'Frank Herbert',
      printingHouse: 'Chilton Books',
      studentId: 'user-stu-4',
      studentName: 'Zoe Washington',
      studentEmail: 'zoe.w@foliodesk.edu',
      borrowDate: addDays(today, -36),
      dueDate: addDays(today, -22),
      status: 'active',
    },
    {
      id: 'loan-104',
      copyId: 'BK-104-C1',
      bookId: 'bk-104',
      bookTitle: 'To Kill a Mockingbird',
      bookAuthor: 'Harper Lee',
      printingHouse: 'J. B. Lippincott & Co.',
      studentId: 'user-stu-2',
      studentName: 'Maya Chen',
      studentEmail: 'maya.chen@foliodesk.edu',
      borrowDate: addDays(today, -7),
      dueDate: addDays(today, 7),
      status: 'active',
    },
    {
      id: 'loan-105',
      copyId: 'BK-105-C1',
      bookId: 'bk-105',
      bookTitle: 'Introduction to Algorithms (Fourth Edition)',
      bookAuthor: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      printingHouse: 'MIT Press & McGraw-Hill',
      studentId: 'user-stu-1',
      studentName: 'Alex Rivera',
      studentEmail: 'alex.rivera@foliodesk.edu',
      borrowDate: addDays(today, -15),
      dueDate: addDays(today, -1),
      status: 'active',
    },
    {
      id: 'loan-107',
      copyId: 'BK-107-C2',
      bookId: 'bk-107',
      bookTitle: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      bookAuthor: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      printingHouse: 'Addison-Wesley Professional',
      studentId: 'user-stu-3',
      studentName: 'Liam Patel',
      studentEmail: 'liam.patel@foliodesk.edu',
      borrowDate: addDays(today, -3),
      dueDate: addDays(today, 11),
      status: 'active',
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      recipientRole: 'admin',
      type: 'return_notified',
      title: 'Return Notice',
      message: 'Alex Rivera notified return of "Clean Code". Pending admin check-in.',
      bookId: 'bk-101',
      copyId: 'BK-101-C1',
      loanId: 'loan-101',
      timestamp: `${today} 09:15`,
      read: false,
    },
    {
      id: 'notif-2',
      recipientRole: 'student',
      recipientUserId: 'user-stu-1',
      type: 'overdue_alert',
      title: 'Overdue Alert',
      message:
        '"Clean Code" was due on ' +
        addDays(today, -2) +
        ' (2 days late). Please return it to the library desk.',
      severity: 'slightly_late',
      bookId: 'bk-101',
      copyId: 'BK-101-C1',
      loanId: 'loan-101',
      timestamp: `${today} 08:00`,
      read: false,
    },
    {
      id: 'notif-3',
      recipientRole: 'student',
      recipientUserId: 'user-stu-2',
      type: 'book_back_in_stock',
      title: 'Back in Stock',
      message:
        '"Structure and Interpretation of Computer Programs" is now available for borrowing.',
      bookId: 'bk-102',
      timestamp: `${addDays(today, -1)} 16:30`,
      read: false,
    },
    {
      id: 'notif-4',
      recipientRole: 'student',
      recipientUserId: 'user-stu-4',
      type: 'overdue_alert',
      title: 'Overly Late Return Notice',
      message:
        '"Dune" is overly late (> 14 days). Extensions are blocked. Return immediately to the desk.',
      severity: 'overly_late',
      bookId: 'bk-103',
      copyId: 'BK-103-C1',
      loanId: 'loan-103',
      timestamp: `${today} 07:30`,
      read: false,
    },
  ];

  return {
    books,
    loans,
    users,
    notifications,
    lastUpdated: new Date().toISOString(),
  };
}

function readDb(): JsonDbState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<JsonDbState>;
      if (
        Array.isArray(parsed.books) &&
        parsed.books.length > 0 &&
        Array.isArray(parsed.loans) &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.notifications)
      ) {
        return {
          books: parsed.books.map((b) => ({
            ...b,
            copies: [...(b.copies || [])].sort((a, c) => a.copyNumber - c.copyNumber),
            waitlistUserIds: b.waitlistUserIds || [],
          })),
          loans: parsed.loans,
          users: parsed.users,
          notifications: parsed.notifications,
          lastUpdated: parsed.lastUpdated,
        };
      }
    }
  } catch (err) {
    console.warn('Could not read local JSON DB, re-seeding:', err);
  }

  const seeded = buildSeedState();
  writeDb(seeded);
  return seeded;
}

function writeDb(state: JsonDbState): void {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const payload: JsonDbState = {
    ...state,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

export async function jsonSeedIfEmpty() {
  readDb();
}

export async function jsonResetToSeed() {
  const seeded = buildSeedState();
  writeDb(seeded);
  return await jsonGetSnapshot();
}

export async function jsonGetSnapshot(): Promise<{
  books: Book[];
  loans: Loan[];
  users: User[];
  notifications: AppNotification[];
  currentDate: string;
}> {
  const state = readDb();
  return {
    books: state.books,
    loans: state.loans,
    users: state.users,
    notifications: state.notifications,
    currentDate: getTodayDate(),
  };
}

export async function jsonCreateBook(bookData: {
  id?: string;
  title: string;
  author: string;
  printingHouse: string;
  isbn?: string;
  publicationYear?: number;
  category?: string;
  shelfLocation?: string;
  description?: string;
  copiesCount?: number;
  copies?: Array<{
    id: string;
    copyNumber: number;
    barcode: string;
    status?: string;
    condition?: string;
    shelfLocation?: string;
  }>;
}) {
  const state = readDb();
  const bookId = bookData.id || `bk-${Date.now()}`;
  const copiesNum = Math.max(1, bookData.copiesCount || bookData.copies?.length || 1);

  if (!state.books.some((b) => b.id === bookId)) {
    const bookCopies: BookCopy[] =
      bookData.copies && bookData.copies.length > 0
        ? bookData.copies.map((c) => ({
            id: c.id,
            bookId,
            copyNumber: c.copyNumber,
            barcode: c.barcode,
            status: (c.status as BookCopy['status']) || 'available',
            condition: (c.condition as BookCopy['condition']) || 'mint',
            shelfLocation: c.shelfLocation || bookData.shelfLocation || 'General Stacks',
          }))
        : Array.from({ length: copiesNum }, (_, i) => ({
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
      copies: bookCopies,
      waitlistUserIds: [],
    };

    state.books = [newBook, ...state.books];
    writeDb(state);
  }

  return { success: true, bookId, message: `Added "${bookData.title}" with ${copiesNum} copies.` };
}

export async function jsonAddCopy(
  bookId: string,
  copyData?: { id?: string; copyNumber?: number; barcode?: string }
) {
  const state = readDb();
  const book = state.books.find((b) => b.id === bookId);
  if (!book) {
    return { success: false, message: 'Book not found.' };
  }
  const newCopyNum = copyData?.copyNumber || book.copies.length + 1;
  const newCopyId = copyData?.id || `${bookId}-C${newCopyNum}`;
  const newBarcode = copyData?.barcode || `FD-${Date.now().toString().slice(-4)}-${newCopyNum}`;

  if (!book.copies.some((c) => c.id === newCopyId)) {
    book.copies.push({
      id: newCopyId,
      bookId,
      copyNumber: newCopyNum,
      barcode: newBarcode,
      status: 'available',
      condition: 'mint',
      shelfLocation: book.shelfLocation,
    });
    writeDb(state);
  }

  return { success: true, copyId: newCopyId };
}

export async function jsonBorrowBook(
  bookId: string,
  userId: string,
  loanDays: number = 14,
  customLoanId?: string,
  customCopyId?: string,
  userEmail?: string,
  userName?: string
) {
  const state = readDb();
  const lookupEmail = (userEmail || (userId.includes('@') ? userId : '')).toLowerCase().trim();

  let user = state.users.find((u) => u.id === userId);
  if (!user && lookupEmail) {
    user = state.users.find((u) => u.email.toLowerCase() === lookupEmail);
  }
  if (!user && lookupEmail) {
    user = {
      id: userId,
      email: lookupEmail,
      name: (userName || lookupEmail.split('@')[0]).trim(),
      role: 'student',
    };
    state.users.push(user);
  }
  if (!user) {
    return { success: false, message: 'User account not found in database.' };
  }

  const book = state.books.find((b) => b.id === bookId);
  if (!book) {
    return { success: false, message: 'Book not found.' };
  }

  let copy = customCopyId
    ? book.copies.find((c) => c.id === customCopyId && c.status === 'available')
    : undefined;
  if (!copy) {
    copy = book.copies.find((c) => c.status === 'available');
  }
  if (!copy) {
    return { success: false, message: 'No available copies for this book.' };
  }

  const today = getTodayDate();
  const dueDate = addDays(today, loanDays);
  const newLoanId = customLoanId || `loan-${Date.now()}`;

  copy.status = 'borrowed';
  copy.currentLoanId = newLoanId;

  const newLoan: Loan = {
    id: newLoanId,
    copyId: copy.id,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    printingHouse: book.printingHouse,
    studentId: user.id,
    studentName: user.name,
    studentEmail: user.email,
    borrowDate: today,
    dueDate,
    status: 'active',
  };

  if (!state.loans.some((l) => l.id === newLoanId)) {
    state.loans = [newLoan, ...state.loans];
  }
  writeDb(state);

  return {
    success: true,
    message: `Checked out "${book.title}". Due date is ${dueDate}.`,
    loan: newLoan,
  };
}

export async function jsonReturnLoan(
  loanId: string,
  verifiedCopyId?: string,
  returnCondition?: string
) {
  const state = readDb();
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) {
    return { success: false, message: 'Loan record not found.' };
  }

  if (verifiedCopyId && verifiedCopyId.toLowerCase() !== loan.copyId.toLowerCase()) {
    return {
      success: false,
      message: `Exemplaire mismatch: expected copy ${loan.copyId}, received ${verifiedCopyId}.`,
    };
  }

  const today = getTodayDate();
  loan.status = 'returned';
  loan.returnedDate = today;
  loan.returnNotified = false;

  const book = state.books.find((b) => b.id === loan.bookId);
  if (book) {
    const copy = book.copies.find((c) => c.id === loan.copyId);
    if (copy) {
      copy.status = 'available';
      copy.currentLoanId = undefined;
      if (returnCondition) {
        copy.condition = returnCondition as BookCopy['condition'];
      }
    }

    if (book.waitlistUserIds && book.waitlistUserIds.length > 0) {
      const nowTime = getNowTimestamp();
      const stockNotifs: AppNotification[] = book.waitlistUserIds.map((uid) => ({
        id: `notif-stock-${Date.now()}-${uid}`,
        recipientRole: 'student',
        recipientUserId: uid,
        type: 'book_back_in_stock',
        title: 'Book Back in Stock',
        message: `"${book.title}" (${book.printingHouse}) has a copy back in stock!`,
        timestamp: nowTime,
        read: false,
        bookId: book.id,
      }));
      state.notifications = [...stockNotifs, ...state.notifications];
      book.waitlistUserIds = [];
    }
  }

  state.notifications = state.notifications.map((n) =>
    n.loanId === loanId ? { ...n, read: true } : n
  );

  writeDb(state);
  return { success: true, message: `Checked in "${loan.bookTitle}". Marked as returned.` };
}

export async function jsonReportReturnMismatch(loanId: string, customNotifId?: string) {
  const state = readDb();
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) {
    return { success: false, message: 'Loan record not found.' };
  }

  loan.returnNotified = false;
  const notifId = customNotifId || `notif-mismatch-${Date.now()}`;
  if (!state.notifications.some((n) => n.id === notifId)) {
    state.notifications.unshift({
      id: notifId,
      recipientRole: 'student',
      recipientUserId: loan.studentId,
      type: 'return_mismatch',
      title: 'Returned Copy Mismatch',
      message: `The copy of "${loan.bookTitle}" brought to the desk did not match the copy originally lent to you. Please return the exact physical copy you borrowed.`,
      timestamp: getNowTimestamp(),
      read: false,
      bookId: loan.bookId,
      loanId: loan.id,
    });
  }

  writeDb(state);
  return { success: true, message: 'Mismatch notice sent to student.' };
}

export async function jsonExtendLoan(loanId: string) {
  const state = readDb();
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) {
    return { success: false, message: 'Loan record not found.' };
  }
  if (loan.hasExtended) {
    return { success: false, message: 'This loan has already been extended once.' };
  }

  const newDueDate = addDays(loan.dueDate, 7);
  loan.dueDate = newDueDate;
  loan.hasExtended = true;
  writeDb(state);

  return {
    success: true,
    message: `7-day extension granted. New due date: ${newDueDate}.`,
  };
}

export async function jsonNotifyReturn(loanId: string, customNotifId?: string) {
  const state = readDb();
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan) {
    return { success: false, message: 'Loan record not found.' };
  }

  const nowTime = getNowTimestamp();
  loan.returnNotified = true;
  loan.returnNotifiedAt = nowTime;

  const notifId = customNotifId || `notif-return-${Date.now()}`;
  if (!state.notifications.some((n) => n.id === notifId)) {
    state.notifications.unshift({
      id: notifId,
      recipientRole: 'admin',
      type: 'return_notified',
      title: 'Return Notice',
      message: `${loan.studentName} notified return of "${loan.bookTitle}". Pending desk confirmation.`,
      bookId: loan.bookId,
      copyId: loan.copyId,
      loanId: loan.id,
      timestamp: nowTime,
      read: false,
    });
  }

  writeDb(state);
  return { success: true, message: 'Library staff notified of return.' };
}

export async function jsonRequestStockAlert(bookId: string, userId: string) {
  const state = readDb();
  const book = state.books.find((b) => b.id === bookId);
  if (!book) {
    return { success: false, message: 'Book not found.' };
  }
  book.waitlistUserIds = book.waitlistUserIds || [];
  if (!book.waitlistUserIds.includes(userId)) {
    book.waitlistUserIds.push(userId);
    writeDb(state);
  }
  return { success: true, message: 'Stock alert registered.' };
}

export async function jsonMarkNotificationRead(notifId: string) {
  const state = readDb();
  state.notifications = state.notifications.map((n) =>
    n.id === notifId ? { ...n, read: true } : n
  );
  writeDb(state);
  return { success: true };
}

export async function jsonDeleteNotification(notifId: string) {
  const state = readDb();
  state.notifications = state.notifications.filter((n) => n.id !== notifId);
  writeDb(state);
  return { success: true };
}

export async function jsonNotifyLateStudents() {
  const state = readDb();
  const today = getTodayDate();
  const todayMidnight = new Date(today).getTime();
  const lateLoans = state.loans.filter(
    (l) => l.status === 'active' && todayMidnight > new Date(l.dueDate).getTime()
  );

  if (lateLoans.length === 0) {
    return { success: true, count: 0, message: 'All student loans are currently on time.' };
  }

  const timestamp = getNowTimestamp();
  lateLoans.forEach((loan, idx) => {
    const diffMs = todayMidnight - new Date(loan.dueDate).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const severity = diffDays <= 2 ? 'slightly_late' : diffDays <= 14 ? 'very_late' : 'overly_late';

    state.notifications.unshift({
      id: `notif-overdue-${Date.now()}-${idx}`,
      recipientRole: 'student',
      recipientUserId: loan.studentId,
      type: 'overdue_alert',
      title: `Overdue Notice (${diffDays}d late)`,
      message: `Your borrowed book "${loan.bookTitle}" was due on ${loan.dueDate} and is now ${diffDays} day${diffDays > 1 ? 's' : ''} overdue. Please return it immediately.`,
      timestamp,
      read: false,
      bookId: loan.bookId,
      loanId: loan.id,
      severity,
    });
  });

  writeDb(state);
  return {
    success: true,
    count: lateLoans.length,
    message: `Overdue notices sent to ${lateLoans.length} student inbox${lateLoans.length > 1 ? 'es' : ''}.`,
  };
}

export async function jsonNotifySingleStudentWarning(
  loanId: string,
  customNotifId?: string,
  accessToken?: string,
  overrideEmail?: string,
  fallbackLoan?: {
    bookId: string;
    copyId: string;
    bookTitle: string;
    bookAuthor?: string;
    printingHouse: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    borrowDate?: string;
    dueDate: string;
  }
) {
  const state = readDb();
  let loan = state.loans.find((l) => l.id === loanId);

  if (!loan) {
    if (!fallbackLoan) {
      return { success: false, emailSent: false, message: 'Loan record not found.' };
    }
    loan = {
      id: loanId,
      copyId: fallbackLoan.copyId,
      bookId: fallbackLoan.bookId,
      bookTitle: fallbackLoan.bookTitle,
      bookAuthor: fallbackLoan.bookAuthor || 'Unknown Author',
      printingHouse: fallbackLoan.printingHouse,
      studentId: fallbackLoan.studentId,
      studentName: fallbackLoan.studentName,
      studentEmail: fallbackLoan.studentEmail,
      borrowDate: fallbackLoan.borrowDate || getTodayDate(),
      dueDate: fallbackLoan.dueDate,
      status: 'active',
    };
    state.loans.unshift(loan);
  }

  const targetEmail = (overrideEmail?.trim() || loan.studentEmail).trim();
  const today = getTodayDate();
  const status = calculateOverdueStatus(loan.dueDate, today);
  const timestamp = getNowTimestamp();

  let title: string;
  let message: string;
  let emailBody: string;

  if (status.isLate) {
    title = `⚠️ Overdue Notice: ${status.comment} (${status.diffDays}d late)`;
    message = `Attention ${loan.studentName}: Your borrowed book "${loan.bookTitle}" (${loan.printingHouse}) was due on ${loan.dueDate} and is now ${status.diffDays} day${status.diffDays > 1 ? 's' : ''} overdue (${status.comment}). Please return it to the library desk immediately.`;
    emailBody = [
      `Hello ${loan.studentName},`,
      '',
      `This is a library notice regarding your borrowed book:`,
      `- Title: ${loan.bookTitle}`,
      `- Author: ${loan.bookAuthor}`,
      `- Printing House: ${loan.printingHouse}`,
      `- Due Date: ${loan.dueDate}`,
      `- Status: ${status.comment} (${status.diffDays} day${status.diffDays > 1 ? 's' : ''} overdue)`,
      '',
      `Please return this book to the library desk as soon as possible.`,
      '',
      `Regards,`,
      `Library Manager`,
    ].join('\n');
  } else {
    const daysRemaining = Math.max(0, -status.diffDays);
    const dayLabel =
      daysRemaining === 0 ? 'Due Today' : `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    title = `⚠️ Return Reminder: ${dayLabel}`;
    message = `Friendly reminder for ${loan.studentName}: Your borrowed book "${loan.bookTitle}" (${loan.printingHouse}) is due on ${loan.dueDate} (${dayLabel}). Please ensure you return or renew it on time.`;
    emailBody = [
      `Hello ${loan.studentName},`,
      '',
      `This is a friendly reminder regarding your active library loan:`,
      `- Title: ${loan.bookTitle}`,
      `- Author: ${loan.bookAuthor}`,
      `- Printing House: ${loan.printingHouse}`,
      `- Due Date: ${loan.dueDate} (${dayLabel})`,
      '',
      `Please ensure you return or extend your loan on time.`,
      '',
      `Regards,`,
      `Library Manager`,
    ].join('\n');
  }

  let emailSent = false;
  let emailError: string | undefined;
  let emailNeedsReauth = false;
  let gmailMessageId: string | undefined;

  if (accessToken) {
    try {
      const subjectEncoded = `=?UTF-8?B?${Buffer.from(title, 'utf8').toString('base64')}?=`;
      const bodyBase64 = Buffer.from(emailBody, 'utf8').toString('base64');
      const bodyWrapped = bodyBase64.match(/.{1,76}/g)?.join('\r\n') || bodyBase64;
      const rawMime = [
        `To: ${targetEmail}`,
        `Subject: ${subjectEncoded}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        bodyWrapped,
      ].join('\r\n');
      const raw = Buffer.from(rawMime, 'utf8').toString('base64url');

      const gmailRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        }
      );

      if (gmailRes.ok) {
        const okJson = await gmailRes.json().catch(() => ({}));
        gmailMessageId = okJson?.id;
        emailSent = true;
      } else {
        const errJson = await gmailRes.json().catch(() => ({}));
        emailError = errJson?.error?.message || `Gmail API returned status ${gmailRes.status}`;
        emailNeedsReauth = gmailRes.status === 401 || gmailRes.status === 403;
      }
    } catch (err: any) {
      emailError = err?.message || 'Network error calling Gmail API';
    }
  } else {
    emailNeedsReauth = true;
    emailError = 'Google / Gmail authorization is required to send emails.';
  }

  const notifId =
    customNotifId || `notif-warn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const notifRecord: AppNotification = {
    id: notifId,
    recipientRole: 'student',
    recipientUserId: loan.studentId,
    type: 'overdue_alert',
    title,
    message,
    timestamp,
    read: false,
    bookId: loan.bookId,
    loanId: loan.id,
    copyId: loan.copyId,
    severity: status.severity,
    sentToEmail: emailSent,
    recipientEmail: targetEmail,
  };

  if (!state.notifications.some((n) => n.id === notifId)) {
    state.notifications.unshift(notifRecord);
  }
  writeDb(state);

  return {
    success: true,
    notificationId: notifId,
    notification: notifRecord,
    emailSent,
    gmailMessageId,
    recipientEmail: targetEmail,
    emailError,
    emailNeedsReauth,
    message: emailSent
      ? `Notice sent to ${loan.studentName}'s Gmail (${targetEmail}) and in-app inbox!`
      : `Notice saved to ${loan.studentName}'s in-app inbox. Email was not sent: ${emailError}`,
  };
}

export async function jsonUpsertUser(userData: {
  uid: string;
  email: string;
  name: string;
  role?: string;
  photoUrl?: string;
}) {
  const state = readDb();
  const cleanEmail = userData.email.toLowerCase().trim();
  const cleanName = userData.name.trim();

  const existingByEmail = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingByEmail) {
    const oldUid = existingByEmail.id;
    let targetUid = userData.uid;
    if (targetUid !== oldUid && state.users.some((u) => u.id === targetUid)) {
      targetUid = oldUid;
    }

    existingByEmail.id = targetUid;
    existingByEmail.name = cleanName;
    if (userData.role === 'admin' || userData.role === 'student') {
      existingByEmail.role = userData.role;
    }

    if (targetUid !== oldUid) {
      state.loans.forEach((l) => {
        if (l.studentId === oldUid) l.studentId = targetUid;
      });
      state.notifications.forEach((n) => {
        if (n.recipientUserId === oldUid) n.recipientUserId = targetUid;
      });
    }

    writeDb(state);
    return {
      uid: existingByEmail.id,
      id: existingByEmail.id,
      email: existingByEmail.email,
      name: existingByEmail.name,
      role: existingByEmail.role,
    };
  }

  const existingByUid = state.users.find((u) => u.id === userData.uid);
  if (existingByUid) {
    existingByUid.email = cleanEmail;
    existingByUid.name = cleanName;
    if (userData.role === 'admin' || userData.role === 'student') {
      existingByUid.role = userData.role;
    }
    writeDb(state);
    return {
      uid: existingByUid.id,
      id: existingByUid.id,
      email: existingByUid.email,
      name: existingByUid.name,
      role: existingByUid.role,
    };
  }

  const role: User['role'] =
    userData.role === 'admin' || userData.role === 'student'
      ? userData.role
      : cleanEmail.includes('admin')
      ? 'admin'
      : 'student';

  const newUser: User = {
    id: userData.uid,
    email: cleanEmail,
    name: cleanName,
    role,
  };
  state.users.push(newUser);
  writeDb(state);

  return {
    uid: newUser.id,
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  };
}
