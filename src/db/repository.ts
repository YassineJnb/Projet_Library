import { eq, desc, and } from 'drizzle-orm';
import { db, isSqlConfigured } from './index.ts';
import { books, copies, loans, notifications, users } from './schema.ts';
import { SEED_BOOKS, SEED_USERS } from '../data/seedData.ts';
import { AppNotification, Book, Loan, User } from '../types/library.ts';
import { calculateOverdueStatus } from '../utils/overdue.ts';
import {
  jsonSeedIfEmpty,
  jsonResetToSeed,
  jsonGetSnapshot,
  jsonCreateBook,
  jsonAddCopy,
  jsonBorrowBook,
  jsonReturnLoan,
  jsonReportReturnMismatch,
  jsonExtendLoan,
  jsonNotifyReturn,
  jsonRequestStockAlert,
  jsonMarkNotificationRead,
  jsonDeleteNotification,
  jsonNotifyLateStudents,
  jsonNotifySingleStudentWarning,
  jsonUpsertUser,
} from './jsonStore.ts';

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

export async function seedInitialDatabaseIfEmpty() {
  if (!isSqlConfigured()) {
    return jsonSeedIfEmpty();
  }
  try {
    const existingBooks = await db.select({ id: books.id }).from(books).limit(1);
    if (existingBooks.length > 0) {
      return; // Already seeded
    }

    console.log('Seeding initial library catalog into Cloud SQL database...');

    // 1. Seed Books and Copies
    for (const b of SEED_BOOKS) {
      await db
        .insert(books)
        .values({
          id: b.id,
          title: b.title,
          author: b.author,
          printingHouse: b.printingHouse,
          isbn: b.isbn,
          publicationYear: b.publicationYear,
          category: b.category,
          shelfLocation: b.shelfLocation,
          description: b.description,
          coverAccent: b.coverAccent || 'from-stone-700 to-stone-900',
          waitlistUserIds: b.waitlistUserIds || [],
        })
        .onConflictDoNothing();

      for (const c of b.copies) {
        await db
          .insert(copies)
          .values({
            id: c.id,
            bookId: b.id,
            copyNumber: c.copyNumber,
            barcode: c.barcode,
            status: c.status,
            condition: c.condition,
            shelfLocation: c.shelfLocation,
            currentLoanId: c.currentLoanId,
          })
          .onConflictDoNothing();
      }
    }

    // 2. Seed Initial Users
    for (const u of SEED_USERS) {
      await db
        .insert(users)
        .values({
          uid: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
        })
        .onConflictDoNothing();
    }

    // 3. Seed Initial Realistic Loans (matching borrowed copies in SEED_BOOKS)
    const today = getTodayDate();
    const initialLoans = [
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

    for (const l of initialLoans) {
      await db.insert(loans).values(l).onConflictDoNothing();
    }

    // 4. Seed Initial Notifications
    const initialNotifs = [
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
        message: '"Clean Code" was due on ' + addDays(today, -2) + ' (2 days late). Please return it to the library desk.',
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
        message: '"Structure and Interpretation of Computer Programs" is now available for borrowing.',
        bookId: 'bk-102',
        timestamp: `${addDays(today, -1)} 16:30`,
        read: false,
      },
    ];

    for (const n of initialNotifs) {
      await db.insert(notifications).values(n).onConflictDoNothing();
    }

    console.log('Cloud SQL library database seeded successfully!');
  } catch (error) {
    console.error('Failed to seed Cloud SQL database:', error);
  }
}

export async function resetDatabaseToSeed() {
  if (!isSqlConfigured()) {
    return jsonResetToSeed();
  }
  try {
    await db.delete(notifications);
    await db.delete(loans);
    await db.delete(copies);
    await db.delete(books);
    await seedInitialDatabaseIfEmpty();
    return await getDatabaseSnapshot();
  } catch (error) {
    console.error('Failed to reset Cloud SQL database:', error);
    throw new Error('Failed to reset database.', { cause: error });
  }
}

export async function getDatabaseSnapshot(): Promise<{
  books: Book[];
  loans: Loan[];
  users: User[];
  notifications: AppNotification[];
  currentDate: string;
}> {
  if (!isSqlConfigured()) {
    return jsonGetSnapshot();
  }
  try {
    const rawBooks = await db.select().from(books);
    const rawCopies = await db.select().from(copies);
    const rawLoans = await db.select().from(loans).orderBy(desc(loans.createdAt));
    const rawUsers = await db.select().from(users);
    const rawNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt));

    const booksWithCopies: Book[] = rawBooks.map((b) => ({
      ...b,
      copies: rawCopies
        .filter((c) => c.bookId === b.id)
        .sort((a, c) => a.copyNumber - c.copyNumber)
        .map((c) => ({
          id: c.id,
          bookId: c.bookId,
          copyNumber: c.copyNumber,
          barcode: c.barcode,
          status: c.status as any,
          condition: c.condition as any,
          shelfLocation: c.shelfLocation,
          currentLoanId: c.currentLoanId || undefined,
        })),
      waitlistUserIds: b.waitlistUserIds || [],
    }));

    const formattedLoans: Loan[] = rawLoans.map((l) => ({
      id: l.id,
      copyId: l.copyId,
      bookId: l.bookId,
      bookTitle: l.bookTitle,
      bookAuthor: l.bookAuthor,
      printingHouse: l.printingHouse,
      studentId: l.studentId,
      studentName: l.studentName,
      studentEmail: l.studentEmail,
      borrowDate: l.borrowDate,
      dueDate: l.dueDate,
      returnedDate: l.returnedDate || undefined,
      status: l.status as any,
      hasExtended: !!l.hasExtended,
      returnNotified: !!l.returnNotified,
      returnNotifiedAt: l.returnNotifiedAt || undefined,
    }));

    const formattedUsers: User[] = rawUsers.map((u) => ({
      id: u.uid,
      name: u.name,
      email: u.email,
      role: u.role as any,
    }));

    const formattedNotifs: AppNotification[] = rawNotifs.map((n) => ({
      id: n.id,
      recipientRole: n.recipientRole as any,
      recipientUserId: n.recipientUserId || undefined,
      type: n.type as any,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: !!n.read,
      bookId: n.bookId || undefined,
      copyId: n.copyId || undefined,
      loanId: n.loanId || undefined,
      severity: n.severity as any,
      sentToEmail: !!n.sentToEmail,
      recipientEmail: n.recipientEmail || undefined,
    }));

    return {
      books: booksWithCopies,
      loans: formattedLoans,
      users: formattedUsers,
      notifications: formattedNotifs,
      currentDate: getTodayDate(),
    };
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createBookRecord(bookData: {
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
  if (!isSqlConfigured()) {
    return jsonCreateBook(bookData);
  }
  try {
    const bookId = bookData.id || `bk-${Date.now()}`;
    const copiesNum = Math.max(1, bookData.copiesCount || bookData.copies?.length || 1);

    await db
      .insert(books)
      .values({
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
        waitlistUserIds: [],
      })
      .onConflictDoNothing();

    if (bookData.copies && bookData.copies.length > 0) {
      for (const c of bookData.copies) {
        await db
          .insert(copies)
          .values({
            id: c.id,
            bookId,
            copyNumber: c.copyNumber,
            barcode: c.barcode,
            status: c.status || 'available',
            condition: c.condition || 'mint',
            shelfLocation: c.shelfLocation || bookData.shelfLocation || 'General Stacks',
          })
          .onConflictDoNothing();
      }
    } else {
      for (let i = 1; i <= copiesNum; i++) {
        await db
          .insert(copies)
          .values({
            id: `${bookId}-C${i}`,
            bookId,
            copyNumber: i,
            barcode: `FD-${Date.now().toString().slice(-4)}-${i}`,
            status: 'available',
            condition: 'mint',
            shelfLocation: bookData.shelfLocation || 'General Stacks',
          })
          .onConflictDoNothing();
      }
    }

    return { success: true, bookId, message: `Added "${bookData.title}" with ${copiesNum} copies.` };
  } catch (error) {
    console.error('Failed to create book:', error);
    throw new Error('Failed to create book record.', { cause: error });
  }
}

export async function addCopyRecord(
  bookId: string,
  copyData?: { id?: string; copyNumber?: number; barcode?: string }
) {
  if (!isSqlConfigured()) {
    return jsonAddCopy(bookId, copyData);
  }
  try {
    const bookRecords = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRecords.length === 0) {
      return { success: false, message: 'Book not found.' };
    }
    const existingCopies = await db.select().from(copies).where(eq(copies.bookId, bookId));
    const newCopyNum = copyData?.copyNumber || existingCopies.length + 1;
    const newCopyId = copyData?.id || `${bookId}-C${newCopyNum}`;
    const newBarcode = copyData?.barcode || `FD-${Date.now().toString().slice(-4)}-${newCopyNum}`;

    await db
      .insert(copies)
      .values({
        id: newCopyId,
        bookId,
        copyNumber: newCopyNum,
        barcode: newBarcode,
        status: 'available',
        condition: 'mint',
        shelfLocation: bookRecords[0].shelfLocation,
      })
      .onConflictDoNothing();

    return { success: true, copyId: newCopyId };
  } catch (error) {
    console.error('Failed to add copy:', error);
    throw new Error('Failed to add copy record.', { cause: error });
  }
}

export async function borrowBookRecord(
  bookId: string,
  userId: string,
  loanDays: number = 14,
  customLoanId?: string,
  customCopyId?: string,
  userEmail?: string,
  userName?: string
) {
  if (!isSqlConfigured()) {
    return jsonBorrowBook(bookId, userId, loanDays, customLoanId, customCopyId, userEmail, userName);
  }
  try {
    let userRecords = await db.select().from(users).where(eq(users.uid, userId)).limit(1);
    const lookupEmail = (userEmail || (userId.includes('@') ? userId : '')).toLowerCase().trim();

    if (userRecords.length === 0 && lookupEmail) {
      userRecords = await db.select().from(users).where(eq(users.email, lookupEmail)).limit(1);
    }

    if (userRecords.length === 0 && lookupEmail) {
      await db
        .insert(users)
        .values({
          uid: userId,
          email: lookupEmail,
          name: (userName || lookupEmail.split('@')[0]).trim(),
          role: 'student',
        })
        .onConflictDoNothing();
      userRecords = await db.select().from(users).where(eq(users.email, lookupEmail)).limit(1);
    }

    if (userRecords.length === 0) {
      return { success: false, message: 'User account not found in database.' };
    }
    const user = userRecords[0];

    const bookRecords = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRecords.length === 0) {
      return { success: false, message: 'Book not found.' };
    }
    const book = bookRecords[0];

    let availableCopies = customCopyId
      ? await db
          .select()
          .from(copies)
          .where(and(eq(copies.id, customCopyId), eq(copies.status, 'available')))
          .limit(1)
      : [];

    if (availableCopies.length === 0) {
      availableCopies = await db
        .select()
        .from(copies)
        .where(and(eq(copies.bookId, bookId), eq(copies.status, 'available')))
        .limit(1);
    }

    if (availableCopies.length === 0) {
      return { success: false, message: 'No available copies for this book.' };
    }
    const copy = availableCopies[0];

    const today = getTodayDate();
    const dueDate = addDays(today, loanDays);
    const newLoanId = customLoanId || `loan-${Date.now()}`;

    // Update copy status
    await db
      .update(copies)
      .set({ status: 'borrowed', currentLoanId: newLoanId })
      .where(eq(copies.id, copy.id));

    // Create loan
    const newLoan: Loan = {
      id: newLoanId,
      copyId: copy.id,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      printingHouse: book.printingHouse,
      studentId: user.uid,
      studentName: user.name,
      studentEmail: user.email,
      borrowDate: today,
      dueDate,
      status: 'active',
    };

    await db.insert(loans).values(newLoan).onConflictDoNothing();

    return {
      success: true,
      message: `Checked out "${book.title}". Due date is ${dueDate}.`,
      loan: newLoan,
    };
  } catch (error) {
    console.error('Borrow failed:', error);
    throw new Error('Failed to record borrow.', { cause: error });
  }
}

export async function returnLoanRecord(
  loanId: string,
  verifiedCopyId?: string,
  returnCondition?: string
) {
  if (!isSqlConfigured()) {
    return jsonReturnLoan(loanId, verifiedCopyId, returnCondition);
  }
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: 'Loan record not found.' };
    }
    const loan = loanRecords[0];

    if (verifiedCopyId && verifiedCopyId.toLowerCase() !== loan.copyId.toLowerCase()) {
      return {
        success: false,
        message: `Exemplaire mismatch: expected copy ${loan.copyId}, received ${verifiedCopyId}.`,
      };
    }

    const today = getTodayDate();

    // Mark loan returned
    await db
      .update(loans)
      .set({ status: 'returned', returnedDate: today, returnNotified: false })
      .where(eq(loans.id, loanId));

    // Release copy and optionally update physical condition
    await db
      .update(copies)
      .set({
        status: 'available',
        currentLoanId: null,
        ...(returnCondition ? { condition: returnCondition } : {}),
      })
      .where(eq(copies.id, loan.copyId));

    // Check waitlist
    const bookRecords = await db.select().from(books).where(eq(books.id, loan.bookId)).limit(1);
    if (bookRecords.length > 0 && bookRecords[0].waitlistUserIds && bookRecords[0].waitlistUserIds.length > 0) {
      const waitlist = bookRecords[0].waitlistUserIds;
      for (const uid of waitlist) {
        await db.insert(notifications).values({
          id: `notif-stock-${Date.now()}-${uid}`,
          recipientRole: 'student',
          recipientUserId: uid,
          type: 'book_back_in_stock',
          title: 'Book Back in Stock',
          message: `"${bookRecords[0].title}" (${bookRecords[0].printingHouse}) has a copy back in stock!`,
          timestamp: getNowTimestamp(),
          read: false,
          bookId: bookRecords[0].id,
        });
      }
      await db.update(books).set({ waitlistUserIds: [] }).where(eq(books.id, bookRecords[0].id));
    }

    // Dismiss return notice
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.loanId, loanId));

    return { success: true, message: `Checked in "${loan.bookTitle}". Marked as returned.` };
  } catch (error) {
    console.error('Return failed:', error);
    throw new Error('Failed to process return.', { cause: error });
  }
}

export async function reportReturnMismatchRecord(loanId: string, customNotifId?: string) {
  if (!isSqlConfigured()) {
    return jsonReportReturnMismatch(loanId, customNotifId);
  }
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: 'Loan record not found.' };
    }
    const loan = loanRecords[0];
    const nowTime = getNowTimestamp();

    await db
      .update(loans)
      .set({ returnNotified: false })
      .where(eq(loans.id, loanId));

    await db
      .insert(notifications)
      .values({
        id: customNotifId || `notif-mismatch-${Date.now()}`,
        recipientRole: 'student',
        recipientUserId: loan.studentId,
        type: 'return_mismatch',
        title: 'Returned Copy Mismatch',
        message: `The copy of "${loan.bookTitle}" brought to the desk did not match the copy originally lent to you. Please return the exact physical copy you borrowed.`,
        timestamp: nowTime,
        read: false,
        bookId: loan.bookId,
        loanId: loan.id,
      })
      .onConflictDoNothing();

    return { success: true, message: 'Mismatch notice sent to student.' };
  } catch (error) {
    console.error('Report return mismatch failed:', error);
    throw new Error('Failed to report return mismatch.', { cause: error });
  }
}

export async function extendLoanRecord(loanId: string) {
  if (!isSqlConfigured()) {
    return jsonExtendLoan(loanId);
  }
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: 'Loan record not found.' };
    }
    const loan = loanRecords[0];
    if (loan.hasExtended) {
      return { success: false, message: 'This loan has already been extended once.' };
    }

    const newDueDate = addDays(loan.dueDate, 7);
    await db
      .update(loans)
      .set({ dueDate: newDueDate, hasExtended: true })
      .where(eq(loans.id, loanId));

    return {
      success: true,
      message: `7-day extension granted. New due date: ${newDueDate}.`,
    };
  } catch (error) {
    console.error('Extension failed:', error);
    throw new Error('Failed to extend loan.', { cause: error });
  }
}

export async function notifyReturnRecord(loanId: string, customNotifId?: string) {
  if (!isSqlConfigured()) {
    return jsonNotifyReturn(loanId, customNotifId);
  }
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: 'Loan record not found.' };
    }
    const loan = loanRecords[0];
    const nowTime = getNowTimestamp();

    await db
      .update(loans)
      .set({ returnNotified: true, returnNotifiedAt: nowTime })
      .where(eq(loans.id, loanId));

    await db
      .insert(notifications)
      .values({
        id: customNotifId || `notif-return-${Date.now()}`,
        recipientRole: 'admin',
        type: 'return_notified',
        title: 'Return Notice',
        message: `${loan.studentName} notified return of "${loan.bookTitle}". Pending desk confirmation.`,
        bookId: loan.bookId,
        copyId: loan.copyId,
        loanId: loan.id,
        timestamp: nowTime,
        read: false,
      })
      .onConflictDoNothing();

    return { success: true, message: 'Library staff notified of return.' };
  } catch (error) {
    console.error('Notify return failed:', error);
    throw new Error('Failed to notify return.', { cause: error });
  }
}

export async function requestStockAlertRecord(bookId: string, userId: string) {
  if (!isSqlConfigured()) {
    return jsonRequestStockAlert(bookId, userId);
  }
  try {
    const bookRecords = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRecords.length === 0) {
      return { success: false, message: 'Book not found.' };
    }
    const existing = bookRecords[0].waitlistUserIds || [];
    if (!existing.includes(userId)) {
      await db
        .update(books)
        .set({ waitlistUserIds: [...existing, userId] })
        .where(eq(books.id, bookId));
    }
    return { success: true, message: 'Stock alert registered.' };
  } catch (error) {
    console.error('Request stock alert failed:', error);
    throw new Error('Failed to register stock alert.', { cause: error });
  }
}

export async function markNotificationReadRecord(notifId: string) {
  if (!isSqlConfigured()) {
    return jsonMarkNotificationRead(notifId);
  }
  try {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, notifId));
    return { success: true };
  } catch (error) {
    console.error('Mark notification read failed:', error);
    throw new Error('Failed to mark notification as read.', { cause: error });
  }
}

export async function deleteNotificationRecord(notifId: string) {
  if (!isSqlConfigured()) {
    return jsonDeleteNotification(notifId);
  }
  try {
    await db.delete(notifications).where(eq(notifications.id, notifId));
    return { success: true };
  } catch (error) {
    console.error('Delete notification failed:', error);
    throw new Error('Failed to delete notification.', { cause: error });
  }
}

export async function notifyLateStudentsRecord() {
  if (!isSqlConfigured()) {
    return jsonNotifyLateStudents();
  }
  try {
    const activeLoans = await db.select().from(loans).where(eq(loans.status, 'active'));
    const today = getTodayDate();
    const todayMidnight = new Date(today).getTime();

    const lateLoans = activeLoans.filter((l) => {
      const dueMidnight = new Date(l.dueDate).getTime();
      return todayMidnight > dueMidnight;
    });

    if (lateLoans.length === 0) {
      return { success: true, count: 0, message: 'All student loans are currently on time.' };
    }

    const timestamp = getNowTimestamp();
    for (let idx = 0; idx < lateLoans.length; idx++) {
      const loan = lateLoans[idx];
      const diffMs = todayMidnight - new Date(loan.dueDate).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const severity = diffDays <= 2 ? 'slightly_late' : diffDays <= 14 ? 'very_late' : 'overly_late';

      await db
        .insert(notifications)
        .values({
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
        })
        .onConflictDoNothing();
    }

    return {
      success: true,
      count: lateLoans.length,
      message: `Overdue notices sent to ${lateLoans.length} student inbox${lateLoans.length > 1 ? 'es' : ''}.`,
    };
  } catch (error) {
    console.error('Notify late failed:', error);
    throw new Error('Failed to notify late students.', { cause: error });
  }
}

export async function notifySingleStudentWarning(
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
  if (!isSqlConfigured()) {
    return jsonNotifySingleStudentWarning(loanId, customNotifId, accessToken, overrideEmail, fallbackLoan);
  }
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    let loan = loanRecords[0];

    if (!loan) {
      if (!fallbackLoan) {
        return { success: false, emailSent: false, message: 'Loan record not found.' };
      }
      const today = getTodayDate();
      const insertedLoan = {
        id: loanId,
        copyId: fallbackLoan.copyId,
        bookId: fallbackLoan.bookId,
        bookTitle: fallbackLoan.bookTitle,
        bookAuthor: fallbackLoan.bookAuthor || 'Unknown Author',
        printingHouse: fallbackLoan.printingHouse,
        studentId: fallbackLoan.studentId,
        studentName: fallbackLoan.studentName,
        studentEmail: fallbackLoan.studentEmail,
        borrowDate: fallbackLoan.borrowDate || today,
        dueDate: fallbackLoan.dueDate,
        status: 'active',
        hasExtended: false,
        returnNotified: false,
        returnNotifiedAt: null,
        returnedDate: null,
        createdAt: new Date(),
      };
      await db
        .insert(loans)
        .values({
          id: insertedLoan.id,
          copyId: insertedLoan.copyId,
          bookId: insertedLoan.bookId,
          bookTitle: insertedLoan.bookTitle,
          bookAuthor: insertedLoan.bookAuthor,
          printingHouse: insertedLoan.printingHouse,
          studentId: insertedLoan.studentId,
          studentName: insertedLoan.studentName,
          studentEmail: insertedLoan.studentEmail,
          borrowDate: insertedLoan.borrowDate,
          dueDate: insertedLoan.dueDate,
          status: 'active',
        })
        .onConflictDoNothing();
      loan = insertedLoan;
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
      const dayLabel = daysRemaining === 0 ? 'Due Today' : `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
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
          console.log(
            `[GMAIL SENT] Email delivered to <${targetEmail}> for loan ${loan.id} (messageId=${gmailMessageId || 'unknown'})`
          );
        } else {
          const errJson = await gmailRes.json().catch(() => ({}));
          emailError =
            errJson?.error?.message || `Gmail API returned status ${gmailRes.status}`;
          emailNeedsReauth = gmailRes.status === 401 || gmailRes.status === 403;
          console.warn(
            `[GMAIL ERROR] Failed sending to <${targetEmail}> (status ${gmailRes.status}):`,
            JSON.stringify(errJson)
          );
        }
      } catch (err: any) {
        emailError = err?.message || 'Network error calling Gmail API';
        console.warn('[GMAIL ERROR]', emailError);
      }
    } else {
      emailNeedsReauth = true;
      emailError = 'Google / Gmail authorization is required to send emails.';
    }

    const notifId = customNotifId || `notif-warn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const notifRecord = {
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

    await db.insert(notifications).values(notifRecord).onConflictDoNothing();

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
  } catch (error) {
    console.error('Notify single student warning failed:', error);
    throw new Error('Failed to send notice.', { cause: error });
  }
}

export async function upsertUserRecord(userData: {
  uid: string;
  email: string;
  name: string;
  role?: string;
  photoUrl?: string;
}) {
  if (!isSqlConfigured()) {
    return jsonUpsertUser(userData);
  }
  try {
    const cleanEmail = userData.email.toLowerCase().trim();
    const cleanName = userData.name.trim();

    // Check if user exists by email first (avoids duplicate email constraint error)
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const existingUser = existingByEmail[0];
      const oldUid = existingUser.uid;
      let targetUid = userData.uid;

      if (targetUid !== oldUid) {
        // Ensure targetUid does not collide with another user row
        const uidCollision = await db
          .select()
          .from(users)
          .where(eq(users.uid, targetUid))
          .limit(1);
        if (uidCollision.length > 0) {
          targetUid = oldUid;
        }
      }

      const updated = await db
        .update(users)
        .set({
          uid: targetUid,
          name: cleanName,
          photoUrl: userData.photoUrl || existingUser.photoUrl,
          role: userData.role || existingUser.role,
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      // Keep loans and notifications linked if UID updated (e.g. Firebase sign-in matching email)
      if (targetUid !== oldUid) {
        await db.update(loans).set({ studentId: targetUid }).where(eq(loans.studentId, oldUid));
        await db
          .update(notifications)
          .set({ recipientUserId: targetUid })
          .where(eq(notifications.recipientUserId, oldUid));
      }

      return updated[0];
    }

    // Check if user exists by uid
    const existingByUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, userData.uid))
      .limit(1);

    if (existingByUid.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email: cleanEmail,
          name: cleanName,
          photoUrl: userData.photoUrl || existingByUid[0].photoUrl,
          role: userData.role || existingByUid[0].role,
        })
        .where(eq(users.id, existingByUid[0].id))
        .returning();

      return updated[0];
    }

    // Brand new user insert
    const result = await db
      .insert(users)
      .values({
        uid: userData.uid,
        email: cleanEmail,
        name: cleanName,
        role: userData.role || (cleanEmail.includes('admin') ? 'admin' : 'student'),
        photoUrl: userData.photoUrl,
      })
      .onConflictDoNothing()
      .returning();

    if (result.length > 0) {
      return result[0];
    }

    const fallback = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    return fallback[0];
  } catch (error) {
    console.error('Upsert user failed:', error);
    throw new Error('Failed to upsert user.', { cause: error });
  }
}
