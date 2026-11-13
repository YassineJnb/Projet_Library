import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table linked with Firebase Auth UIDs and Google Gmail accounts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('student'), // 'student' | 'admin'
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Books catalog table
export const books = pgTable('books', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  printingHouse: text('printing_house').notNull(),
  isbn: text('isbn').notNull(),
  publicationYear: integer('publication_year').notNull(),
  category: text('category').notNull(),
  shelfLocation: text('shelf_location').notNull(),
  description: text('description').notNull(),
  coverAccent: text('cover_accent').notNull().default('from-stone-700 to-stone-900'),
  waitlistUserIds: text('waitlist_user_ids').array(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Physical copies of books
export const copies = pgTable('copies', {
  id: text('id').primaryKey(),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id),
  copyNumber: integer('copy_number').notNull(),
  barcode: text('barcode').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'borrowed' | 'maintenance'
  condition: text('condition').notNull().default('good'),
  shelfLocation: text('shelf_location').notNull(),
  currentLoanId: text('current_loan_id'),
});

// Book loans
export const loans = pgTable('loans', {
  id: text('id').primaryKey(),
  copyId: text('copy_id').notNull(),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id),
  bookTitle: text('book_title').notNull(),
  bookAuthor: text('book_author').notNull(),
  printingHouse: text('printing_house').notNull(),
  studentId: text('student_id').notNull(), // User UID or ID
  studentName: text('student_name').notNull(),
  studentEmail: text('student_email').notNull(),
  borrowDate: text('borrow_date').notNull(), // YYYY-MM-DD
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  returnedDate: text('returned_date'),
  status: text('status').notNull().default('active'), // 'active' | 'returned'
  hasExtended: boolean('has_extended').default(false),
  returnNotified: boolean('return_notified').default(false),
  returnNotifiedAt: text('return_notified_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications (inbox notices, return alerts, back-in-stock alerts)
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientRole: text('recipient_role'), // 'admin' | 'student'
  recipientUserId: text('recipient_user_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  read: boolean('read').default(false),
  bookId: text('book_id'),
  copyId: text('copy_id'),
  loanId: text('loan_id'),
  severity: text('severity'),
  sentToEmail: boolean('sent_to_email').default(false),
  recipientEmail: text('recipient_email'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const booksRelations = relations(books, ({ many }) => ({
  copies: many(copies),
  loans: many(loans),
}));

export const copiesRelations = relations(copies, ({ one }) => ({
  book: one(books, {
    fields: [copies.bookId],
    references: [books.id],
  }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  book: one(books, {
    fields: [loans.bookId],
    references: [books.id],
  }),
}));
