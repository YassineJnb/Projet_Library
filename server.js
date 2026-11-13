var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// src/db/repository.ts
import { eq, desc, and } from "drizzle-orm";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  books: () => books,
  booksRelations: () => booksRelations,
  copies: () => copies,
  copiesRelations: () => copiesRelations,
  loans: () => loans,
  loansRelations: () => loansRelations,
  notifications: () => notifications,
  users: () => users
});
import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  // Firebase Auth UID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("student"),
  // 'student' | 'admin'
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow()
});
var books = pgTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  printingHouse: text("printing_house").notNull(),
  isbn: text("isbn").notNull(),
  publicationYear: integer("publication_year").notNull(),
  category: text("category").notNull(),
  shelfLocation: text("shelf_location").notNull(),
  description: text("description").notNull(),
  coverAccent: text("cover_accent").notNull().default("from-stone-700 to-stone-900"),
  waitlistUserIds: text("waitlist_user_ids").array(),
  createdAt: timestamp("created_at").defaultNow()
});
var copies = pgTable("copies", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => books.id),
  copyNumber: integer("copy_number").notNull(),
  barcode: text("barcode").notNull(),
  status: text("status").notNull().default("available"),
  // 'available' | 'borrowed' | 'maintenance'
  condition: text("condition").notNull().default("good"),
  shelfLocation: text("shelf_location").notNull(),
  currentLoanId: text("current_loan_id")
});
var loans = pgTable("loans", {
  id: text("id").primaryKey(),
  copyId: text("copy_id").notNull(),
  bookId: text("book_id").notNull().references(() => books.id),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  printingHouse: text("printing_house").notNull(),
  studentId: text("student_id").notNull(),
  // User UID or ID
  studentName: text("student_name").notNull(),
  studentEmail: text("student_email").notNull(),
  borrowDate: text("borrow_date").notNull(),
  // YYYY-MM-DD
  dueDate: text("due_date").notNull(),
  // YYYY-MM-DD
  returnedDate: text("returned_date"),
  status: text("status").notNull().default("active"),
  // 'active' | 'returned'
  hasExtended: boolean("has_extended").default(false),
  returnNotified: boolean("return_notified").default(false),
  returnNotifiedAt: text("return_notified_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  recipientRole: text("recipient_role"),
  // 'admin' | 'student'
  recipientUserId: text("recipient_user_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").default(false),
  bookId: text("book_id"),
  copyId: text("copy_id"),
  loanId: text("loan_id"),
  severity: text("severity"),
  createdAt: timestamp("created_at").defaultNow()
});
var booksRelations = relations(books, ({ many }) => ({
  copies: many(copies),
  loans: many(loans)
}));
var copiesRelations = relations(copies, ({ one }) => ({
  book: one(books, {
    fields: [copies.bookId],
    references: [books.id]
  })
}));
var loansRelations = relations(loans, ({ one }) => ({
  book: one(books, {
    fields: [loans.bookId],
    references: [books.id]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/data/seedData.ts
var SEED_USERS = [
  {
    id: "user-admin-1",
    name: "Elena Vance",
    email: "elena.vance@foliodesk.edu",
    role: "admin"
  },
  {
    id: "user-admin-2",
    name: "Marcus Holloway",
    email: "marcus.h@foliodesk.edu",
    role: "admin"
  },
  {
    id: "user-stu-1",
    name: "Alex Rivera",
    email: "alex.rivera@foliodesk.edu",
    role: "student"
  },
  {
    id: "user-stu-2",
    name: "Maya Chen",
    email: "maya.chen@foliodesk.edu",
    role: "student"
  },
  {
    id: "user-stu-3",
    name: "Liam Patel",
    email: "liam.patel@foliodesk.edu",
    role: "student"
  },
  {
    id: "user-stu-4",
    name: "Zoe Washington",
    email: "zoe.w@foliodesk.edu",
    role: "student"
  }
];
var SEED_BOOKS = [
  {
    id: "bk-101",
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    printingHouse: "Prentice Hall",
    isbn: "978-0132350884",
    publicationYear: 2008,
    category: "Computer Science",
    shelfLocation: "Stack 4 \xB7 Shelf A-12",
    coverAccent: "from-amber-700 to-amber-900",
    description: "Even bad code can function. But if code isn\u2019t clean, it can bring a development organization to its knees. A practical guide on software design and craft.",
    copies: [
      {
        id: "BK-101-C1",
        bookId: "bk-101",
        copyNumber: 1,
        barcode: "FD-101-01",
        status: "borrowed",
        condition: "good",
        shelfLocation: "Stack 4 \xB7 Shelf A-12",
        currentLoanId: "loan-101"
      },
      {
        id: "BK-101-C2",
        bookId: "bk-101",
        copyNumber: 2,
        barcode: "FD-101-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 4 \xB7 Shelf A-12"
      },
      {
        id: "BK-101-C3",
        bookId: "bk-101",
        copyNumber: 3,
        barcode: "FD-101-03",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 4 \xB7 Shelf A-12"
      }
    ]
  },
  {
    id: "bk-102",
    title: "Structure and Interpretation of Computer Programs",
    author: "Harold Abelson, Gerald Jay Sussman",
    printingHouse: "MIT Press",
    isbn: "978-0262510875",
    publicationYear: 1996,
    category: "Computer Science",
    shelfLocation: "Stack 4 \xB7 Shelf B-03",
    coverAccent: "from-emerald-800 to-teal-950",
    description: 'The legendary "Wizard Book" introducing abstraction, recursion, interpreters, and metalinguistic programming with Lisp/Scheme.',
    copies: [
      {
        id: "BK-102-C1",
        bookId: "bk-102",
        copyNumber: 1,
        barcode: "FD-102-01",
        status: "borrowed",
        condition: "good",
        shelfLocation: "Stack 4 \xB7 Shelf B-03",
        currentLoanId: "loan-102"
      },
      {
        id: "BK-102-C2",
        bookId: "bk-102",
        copyNumber: 2,
        barcode: "FD-102-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 4 \xB7 Shelf B-03"
      }
    ]
  },
  {
    id: "bk-103",
    title: "Dune",
    author: "Frank Herbert",
    printingHouse: "Chilton Books",
    isbn: "978-0441172719",
    publicationYear: 1965,
    category: "Science Fiction",
    shelfLocation: "Stack 2 \xB7 Shelf F-18",
    coverAccent: "from-orange-800 to-amber-950",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.",
    copies: [
      {
        id: "BK-103-C1",
        bookId: "bk-103",
        copyNumber: 1,
        barcode: "FD-103-01",
        status: "borrowed",
        condition: "fair",
        shelfLocation: "Stack 2 \xB7 Shelf F-18",
        currentLoanId: "loan-103"
      },
      {
        id: "BK-103-C2",
        bookId: "bk-103",
        copyNumber: 2,
        barcode: "FD-103-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 2 \xB7 Shelf F-18"
      },
      {
        id: "BK-103-C3",
        bookId: "bk-103",
        copyNumber: 3,
        barcode: "FD-103-03",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 2 \xB7 Shelf F-18"
      }
    ]
  },
  {
    id: "bk-104",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    printingHouse: "J. B. Lippincott & Co.",
    isbn: "978-0061120084",
    publicationYear: 1960,
    category: "Classic Literature",
    shelfLocation: "Stack 1 \xB7 Shelf C-08",
    coverAccent: "from-stone-700 to-stone-900",
    description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it, exploring compassion and justice.",
    copies: [
      {
        id: "BK-104-C1",
        bookId: "bk-104",
        copyNumber: 1,
        barcode: "FD-104-01",
        status: "borrowed",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf C-08",
        currentLoanId: "loan-104"
      },
      {
        id: "BK-104-C2",
        bookId: "bk-104",
        copyNumber: 2,
        barcode: "FD-104-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf C-08"
      },
      {
        id: "BK-104-C3",
        bookId: "bk-104",
        copyNumber: 3,
        barcode: "FD-104-03",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf C-08"
      },
      {
        id: "BK-104-C4",
        bookId: "bk-104",
        copyNumber: 4,
        barcode: "FD-104-04",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf C-08"
      }
    ]
  },
  {
    id: "bk-105",
    title: "Introduction to Algorithms (Fourth Edition)",
    author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
    printingHouse: "MIT Press & McGraw-Hill",
    isbn: "978-0262046305",
    publicationYear: 2022,
    category: "Computer Science",
    shelfLocation: "Stack 4 \xB7 Shelf A-01",
    coverAccent: "from-cyan-900 to-blue-950",
    description: "A comprehensive textbook covering the modern study of computer algorithms, from data structures to graph algorithms and NP-completeness.",
    copies: [
      {
        id: "BK-105-C1",
        bookId: "bk-105",
        copyNumber: 1,
        barcode: "FD-105-01",
        status: "borrowed",
        condition: "mint",
        shelfLocation: "Stack 4 \xB7 Shelf A-01",
        currentLoanId: "loan-105"
      },
      {
        id: "BK-105-C2",
        bookId: "bk-105",
        copyNumber: 2,
        barcode: "FD-105-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 4 \xB7 Shelf A-01"
      },
      {
        id: "BK-105-C3",
        bookId: "bk-105",
        copyNumber: 3,
        barcode: "FD-105-03",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 4 \xB7 Shelf A-01"
      }
    ]
  },
  {
    id: "bk-106",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    printingHouse: "Charles Scribner's Sons",
    isbn: "978-0743273565",
    publicationYear: 1925,
    category: "Classic Literature",
    shelfLocation: "Stack 1 \xB7 Shelf D-14",
    coverAccent: "from-indigo-900 to-slate-900",
    description: "The story of the fabulously wealthy Jay Gatsby and his new love for the beautiful Daisy Buchanan in Jazz Age New York.",
    copies: [
      {
        id: "BK-106-C1",
        bookId: "bk-106",
        copyNumber: 1,
        barcode: "FD-106-01",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf D-14"
      },
      {
        id: "BK-106-C2",
        bookId: "bk-106",
        copyNumber: 2,
        barcode: "FD-106-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf D-14"
      }
    ]
  },
  {
    id: "bk-107",
    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
    author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
    printingHouse: "Addison-Wesley Professional",
    isbn: "978-0201633610",
    publicationYear: 1994,
    category: "Computer Science",
    shelfLocation: "Stack 4 \xB7 Shelf B-10",
    coverAccent: "from-slate-800 to-neutral-900",
    description: "Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple and succinct solutions.",
    copies: [
      {
        id: "BK-107-C1",
        bookId: "bk-107",
        copyNumber: 1,
        barcode: "FD-107-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 4 \xB7 Shelf B-10"
      },
      {
        id: "BK-107-C2",
        bookId: "bk-107",
        copyNumber: 2,
        barcode: "FD-107-02",
        status: "borrowed",
        condition: "good",
        shelfLocation: "Stack 4 \xB7 Shelf B-10",
        currentLoanId: "loan-107"
      }
    ]
  },
  {
    id: "bk-108",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    printingHouse: "T. Egerton, Whitehall",
    isbn: "978-0141439518",
    publicationYear: 1813,
    category: "Classic Literature",
    shelfLocation: "Stack 1 \xB7 Shelf A-04",
    coverAccent: "from-rose-900 to-stone-900",
    description: "A romantic novel following the character development of Elizabeth Bennet, the dynamic protagonist who learns about the repercussions of hasty judgments.",
    copies: [
      {
        id: "BK-108-C1",
        bookId: "bk-108",
        copyNumber: 1,
        barcode: "FD-108-01",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf A-04"
      },
      {
        id: "BK-108-C2",
        bookId: "bk-108",
        copyNumber: 2,
        barcode: "FD-108-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf A-04"
      }
    ]
  },
  {
    id: "bk-109",
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    printingHouse: "Penguin Classics",
    isbn: "978-0140449136",
    publicationYear: 1866,
    category: "Literature",
    shelfLocation: "Stack 1 \xB7 Shelf D-04",
    coverAccent: "from-amber-950 to-stone-900",
    description: "Raskolnikov, an impoverished student in Saint Petersburg, commits murder to test his theory of the extraordinary man who is above moral law, leading to psychological turmoil and redemption.",
    copies: [
      {
        id: "BK-109-C1",
        bookId: "bk-109",
        copyNumber: 1,
        barcode: "FD-109-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf D-04"
      },
      {
        id: "BK-109-C2",
        bookId: "bk-109",
        copyNumber: 2,
        barcode: "FD-109-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf D-04"
      },
      {
        id: "BK-109-C3",
        bookId: "bk-109",
        copyNumber: 3,
        barcode: "FD-109-03",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf D-04"
      }
    ]
  },
  {
    id: "bk-110",
    title: "The Brothers Karamazov",
    author: "Fyodor Dostoevsky",
    printingHouse: "Farrar, Straus and Giroux",
    isbn: "978-0374528379",
    publicationYear: 1880,
    category: "Literature",
    shelfLocation: "Stack 1 \xB7 Shelf D-06",
    coverAccent: "from-stone-800 to-amber-950",
    description: "Dostoevsky's crowning masterpiece delving into the spiritual, moral, and psychological dilemmas of four brothers accused of patricide in 19th-century Russia.",
    copies: [
      {
        id: "BK-110-C1",
        bookId: "bk-110",
        copyNumber: 1,
        barcode: "FD-110-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf D-06"
      },
      {
        id: "BK-110-C2",
        bookId: "bk-110",
        copyNumber: 2,
        barcode: "FD-110-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf D-06"
      }
    ]
  },
  {
    id: "bk-111",
    title: "The Metamorphosis",
    author: "Franz Kafka",
    printingHouse: "Schocken Books",
    isbn: "978-0805210576",
    publicationYear: 1915,
    category: "Literature",
    shelfLocation: "Stack 1 \xB7 Shelf K-02",
    coverAccent: "from-stone-900 to-zinc-800",
    description: "Gregor Samsa awakes one morning from uneasy dreams to find himself transformed in his bed into a monstrous insect, exploring themes of alienation and family guilt.",
    copies: [
      {
        id: "BK-111-C1",
        bookId: "bk-111",
        copyNumber: 1,
        barcode: "FD-111-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 1 \xB7 Shelf K-02"
      },
      {
        id: "BK-111-C2",
        bookId: "bk-111",
        copyNumber: 2,
        barcode: "FD-111-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 1 \xB7 Shelf K-02"
      }
    ]
  },
  {
    id: "bk-112",
    title: "The Story of Art",
    author: "E. H. Gombrich",
    printingHouse: "Phaidon Press",
    isbn: "978-0714832470",
    publicationYear: 1950,
    category: "Art & Visual Studies",
    shelfLocation: "Stack 3 \xB7 Shelf A-01",
    coverAccent: "from-amber-800 to-stone-900",
    description: "One of the most famous and popular introductions to visual arts ever written, offering an accessible narrative of human creativity from cave paintings to experimental modernism.",
    copies: [
      {
        id: "BK-112-C1",
        bookId: "bk-112",
        copyNumber: 1,
        barcode: "FD-112-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 3 \xB7 Shelf A-01"
      },
      {
        id: "BK-112-C2",
        bookId: "bk-112",
        copyNumber: 2,
        barcode: "FD-112-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 3 \xB7 Shelf A-01"
      },
      {
        id: "BK-112-C3",
        bookId: "bk-112",
        copyNumber: 3,
        barcode: "FD-112-03",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 3 \xB7 Shelf A-01"
      }
    ]
  },
  {
    id: "bk-113",
    title: "Ways of Seeing",
    author: "John Berger",
    printingHouse: "Penguin Books",
    isbn: "978-0140135152",
    publicationYear: 1972,
    category: "Art & Visual Studies",
    shelfLocation: "Stack 3 \xB7 Shelf A-05",
    coverAccent: "from-yellow-900 to-stone-900",
    description: "Based on the BBC television series, this landmark critique examines visual culture, Renaissance oil painting, female portraiture, and modern publicity images.",
    copies: [
      {
        id: "BK-113-C1",
        bookId: "bk-113",
        copyNumber: 1,
        barcode: "FD-113-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 3 \xB7 Shelf A-05"
      },
      {
        id: "BK-113-C2",
        bookId: "bk-113",
        copyNumber: 2,
        barcode: "FD-113-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 3 \xB7 Shelf A-05"
      }
    ]
  },
  {
    id: "bk-114",
    title: "The Rest Is Noise: Listening to the Twentieth Century",
    author: "Alex Ross",
    printingHouse: "Farrar, Straus and Giroux",
    isbn: "978-0312427719",
    publicationYear: 2007,
    category: "Music & Sonic Arts",
    shelfLocation: "Stack 3 \xB7 Shelf M-01",
    coverAccent: "from-blue-900 to-stone-900",
    description: "A vivid, sweeping chronicle of 20th-century classical, modern, and avant-garde music, tracing the soundtrack of world politics from Mahler and Stravinsky to Philip Glass.",
    copies: [
      {
        id: "BK-114-C1",
        bookId: "bk-114",
        copyNumber: 1,
        barcode: "FD-114-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 3 \xB7 Shelf M-01"
      },
      {
        id: "BK-114-C2",
        bookId: "bk-114",
        copyNumber: 2,
        barcode: "FD-114-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 3 \xB7 Shelf M-01"
      }
    ]
  },
  {
    id: "bk-115",
    title: "Musicophilia: Tales of Music and the Brain",
    author: "Oliver Sacks",
    printingHouse: "Vintage Books",
    isbn: "978-1400033539",
    publicationYear: 2007,
    category: "Music & Sonic Arts",
    shelfLocation: "Stack 3 \xB7 Shelf M-04",
    coverAccent: "from-emerald-950 to-stone-900",
    description: "Neurologist Oliver Sacks investigates the profound connection between music, human consciousness, memory, Tourette's syndrome, and amnesia.",
    copies: [
      {
        id: "BK-115-C1",
        bookId: "bk-115",
        copyNumber: 1,
        barcode: "FD-115-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 3 \xB7 Shelf M-04"
      },
      {
        id: "BK-115-C2",
        bookId: "bk-115",
        copyNumber: 2,
        barcode: "FD-115-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 3 \xB7 Shelf M-04"
      }
    ]
  },
  {
    id: "bk-116",
    title: "Watchmen",
    author: "Alan Moore, Dave Gibbons",
    printingHouse: "DC Comics",
    isbn: "978-0930289232",
    publicationYear: 1987,
    category: "Comics & Graphic Novels",
    shelfLocation: "Stack 5 \xB7 Shelf C-01",
    coverAccent: "from-amber-600 to-stone-950",
    description: "A Hugo Award-winning graphic novel masterpiece deconstructing superhero mythology during an alternate Cold War on the brink of nuclear catastrophe.",
    copies: [
      {
        id: "BK-116-C1",
        bookId: "bk-116",
        copyNumber: 1,
        barcode: "FD-116-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 5 \xB7 Shelf C-01"
      },
      {
        id: "BK-116-C2",
        bookId: "bk-116",
        copyNumber: 2,
        barcode: "FD-116-02",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 5 \xB7 Shelf C-01"
      },
      {
        id: "BK-116-C3",
        bookId: "bk-116",
        copyNumber: 3,
        barcode: "FD-116-03",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 5 \xB7 Shelf C-01"
      }
    ]
  },
  {
    id: "bk-117",
    title: "Maus: A Survivor's Tale",
    author: "Art Spiegelman",
    printingHouse: "Pantheon Books",
    isbn: "978-0679406419",
    publicationYear: 1986,
    category: "Comics & Graphic Novels",
    shelfLocation: "Stack 5 \xB7 Shelf C-05",
    coverAccent: "from-stone-700 to-stone-950",
    description: "A Pulitzer Prize-winning graphic biography portraying Jewish mice and German cats, capturing Spiegelman's conversations with his father about the Holocaust.",
    copies: [
      {
        id: "BK-117-C1",
        bookId: "bk-117",
        copyNumber: 1,
        barcode: "FD-117-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 5 \xB7 Shelf C-05"
      },
      {
        id: "BK-117-C2",
        bookId: "bk-117",
        copyNumber: 2,
        barcode: "FD-117-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 5 \xB7 Shelf C-05"
      }
    ]
  },
  {
    id: "bk-118",
    title: "The Sandman: Preludes & Nocturnes",
    author: "Neil Gaiman",
    printingHouse: "DC Comics / Vertigo",
    isbn: "978-1401225759",
    publicationYear: 1989,
    category: "Comics & Graphic Novels",
    shelfLocation: "Stack 5 \xB7 Shelf C-08",
    coverAccent: "from-indigo-950 to-stone-950",
    description: "Morpheus, the King of Dreams, breaks free after seven decades of imprisonment by an English occultist and embarks on a dark journey to recover his sand, helm, and ruby.",
    copies: [
      {
        id: "BK-118-C1",
        bookId: "bk-118",
        copyNumber: 1,
        barcode: "FD-118-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 5 \xB7 Shelf C-08"
      },
      {
        id: "BK-118-C2",
        bookId: "bk-118",
        copyNumber: 2,
        barcode: "FD-118-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 5 \xB7 Shelf C-08"
      }
    ]
  },
  {
    id: "bk-119",
    title: "Persepolis: The Story of a Childhood",
    author: "Marjane Satrapi",
    printingHouse: "Pantheon Books",
    isbn: "978-0375714573",
    publicationYear: 2e3,
    category: "Comics & Graphic Novels",
    shelfLocation: "Stack 5 \xB7 Shelf C-12",
    coverAccent: "from-stone-900 to-black",
    description: "An unforgettable, poignant black-and-white graphic memoir of growing up in Tehran during the Islamic Revolution, the fall of the Shah, and the devastating Iran-Iraq war.",
    copies: [
      {
        id: "BK-119-C1",
        bookId: "bk-119",
        copyNumber: 1,
        barcode: "FD-119-01",
        status: "available",
        condition: "mint",
        shelfLocation: "Stack 5 \xB7 Shelf C-12"
      },
      {
        id: "BK-119-C2",
        bookId: "bk-119",
        copyNumber: 2,
        barcode: "FD-119-02",
        status: "available",
        condition: "good",
        shelfLocation: "Stack 5 \xB7 Shelf C-12"
      }
    ]
  }
];

// src/db/repository.ts
var getTodayDate = () => {
  const now = /* @__PURE__ */ new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
var addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
var getNowTimestamp = () => {
  const now = /* @__PURE__ */ new Date();
  const dateStr = getTodayDate();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} ${timeStr}`;
};
async function seedInitialDatabaseIfEmpty() {
  try {
    const existingBooks = await db.select({ id: books.id }).from(books).limit(1);
    if (existingBooks.length > 0) {
      return;
    }
    console.log("Seeding initial library catalog into Cloud SQL database...");
    for (const b of SEED_BOOKS) {
      await db.insert(books).values({
        id: b.id,
        title: b.title,
        author: b.author,
        printingHouse: b.printingHouse,
        isbn: b.isbn,
        publicationYear: b.publicationYear,
        category: b.category,
        shelfLocation: b.shelfLocation,
        description: b.description,
        coverAccent: b.coverAccent || "from-stone-700 to-stone-900",
        waitlistUserIds: b.waitlistUserIds || []
      });
      for (const c of b.copies) {
        await db.insert(copies).values({
          id: c.id,
          bookId: b.id,
          copyNumber: c.copyNumber,
          barcode: c.barcode,
          status: c.status,
          condition: c.condition,
          shelfLocation: c.shelfLocation,
          currentLoanId: c.currentLoanId
        });
      }
    }
    for (const u of SEED_USERS) {
      await db.insert(users).values({
        uid: u.id,
        email: u.email,
        name: u.name,
        role: u.role
      }).onConflictDoNothing();
    }
    const today = getTodayDate();
    const initialLoans = [
      {
        id: "loan-101",
        copyId: "BK-101-C1",
        bookId: "bk-101",
        bookTitle: "Clean Code: A Handbook of Agile Software Craftsmanship",
        bookAuthor: "Robert C. Martin",
        printingHouse: "Prentice Hall",
        studentId: "user-stu-1",
        studentName: "Alex Rivera",
        studentEmail: "alex.rivera@foliodesk.edu",
        borrowDate: addDays(today, -16),
        dueDate: addDays(today, -2),
        status: "active",
        returnNotified: true,
        returnNotifiedAt: `${today} 09:15`
      },
      {
        id: "loan-102",
        copyId: "BK-102-C1",
        bookId: "bk-102",
        bookTitle: "Structure and Interpretation of Computer Programs",
        bookAuthor: "Harold Abelson, Gerald Jay Sussman",
        printingHouse: "MIT Press",
        studentId: "user-stu-2",
        studentName: "Maya Chen",
        studentEmail: "maya.chen@foliodesk.edu",
        borrowDate: addDays(today, -5),
        dueDate: addDays(today, 9),
        status: "active"
      },
      {
        id: "loan-104",
        copyId: "BK-104-C1",
        bookId: "bk-104",
        bookTitle: "The Pragmatic Programmer: Your Journey to Mastery",
        bookAuthor: "David Thomas, Andrew Hunt",
        printingHouse: "Addison-Wesley",
        studentId: "user-stu-1",
        studentName: "Alex Rivera",
        studentEmail: "alex.rivera@foliodesk.edu",
        borrowDate: addDays(today, -20),
        dueDate: addDays(today, -6),
        status: "active"
      },
      {
        id: "loan-107",
        copyId: "BK-107-C2",
        bookId: "bk-107",
        bookTitle: "Design Patterns: Elements of Reusable Object-Oriented Software",
        bookAuthor: "Erich Gamma, et al.",
        printingHouse: "Addison-Wesley Professional",
        studentId: "user-stu-3",
        studentName: "Liam Patel",
        studentEmail: "liam.patel@foliodesk.edu",
        borrowDate: addDays(today, -3),
        dueDate: addDays(today, 11),
        status: "active"
      }
    ];
    for (const l of initialLoans) {
      await db.insert(loans).values(l);
    }
    const initialNotifs = [
      {
        id: "notif-1",
        recipientRole: "admin",
        type: "return_notified",
        title: "Return Notice",
        message: 'Alex Rivera notified return of "Clean Code". Pending admin check-in.',
        bookId: "bk-101",
        copyId: "BK-101-C1",
        loanId: "loan-101",
        timestamp: `${today} 09:15`,
        read: false
      },
      {
        id: "notif-2",
        recipientRole: "student",
        recipientUserId: "user-stu-1",
        type: "overdue_alert",
        title: "Overdue Alert",
        message: '"Clean Code" was due on ' + addDays(today, -2) + " (2 days late). Please return it to the library desk.",
        severity: "slightly_late",
        bookId: "bk-101",
        copyId: "BK-101-C1",
        loanId: "loan-101",
        timestamp: `${today} 08:00`,
        read: false
      },
      {
        id: "notif-3",
        recipientRole: "student",
        recipientUserId: "user-stu-2",
        type: "book_back_in_stock",
        title: "Back in Stock",
        message: '"Structure and Interpretation of Computer Programs" is now available for borrowing.',
        bookId: "bk-102",
        timestamp: `${addDays(today, -1)} 16:30`,
        read: false
      }
    ];
    for (const n of initialNotifs) {
      await db.insert(notifications).values(n);
    }
    console.log("Cloud SQL library database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed Cloud SQL database:", error);
  }
}
async function getDatabaseSnapshot() {
  try {
    const rawBooks = await db.select().from(books);
    const rawCopies = await db.select().from(copies);
    const rawLoans = await db.select().from(loans).orderBy(desc(loans.createdAt));
    const rawUsers = await db.select().from(users);
    const rawNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    const booksWithCopies = rawBooks.map((b) => ({
      ...b,
      copies: rawCopies.filter((c) => c.bookId === b.id).map((c) => ({
        id: c.id,
        bookId: c.bookId,
        copyNumber: c.copyNumber,
        barcode: c.barcode,
        status: c.status,
        condition: c.condition,
        shelfLocation: c.shelfLocation,
        currentLoanId: c.currentLoanId || void 0
      })),
      waitlistUserIds: b.waitlistUserIds || []
    }));
    const formattedLoans = rawLoans.map((l) => ({
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
      returnedDate: l.returnedDate || void 0,
      status: l.status,
      hasExtended: !!l.hasExtended,
      returnNotified: !!l.returnNotified,
      returnNotifiedAt: l.returnNotifiedAt || void 0
    }));
    const formattedUsers = rawUsers.map((u) => ({
      id: u.uid,
      name: u.name,
      email: u.email,
      role: u.role
    }));
    const formattedNotifs = rawNotifs.map((n) => ({
      id: n.id,
      recipientRole: n.recipientRole,
      recipientUserId: n.recipientUserId || void 0,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: !!n.read,
      bookId: n.bookId || void 0,
      copyId: n.copyId || void 0,
      loanId: n.loanId || void 0,
      severity: n.severity
    }));
    return {
      books: booksWithCopies,
      loans: formattedLoans,
      users: formattedUsers,
      notifications: formattedNotifs,
      currentDate: getTodayDate()
    };
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
async function createBookRecord(bookData) {
  try {
    const bookId = `bk-${Date.now()}`;
    const copiesNum = Math.max(1, bookData.copiesCount || 1);
    await db.insert(books).values({
      id: bookId,
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      printingHouse: (bookData.printingHouse || "General Publishing").trim(),
      isbn: (bookData.isbn || `978-${Math.floor(1e9 + Math.random() * 9e9)}`).trim(),
      publicationYear: bookData.publicationYear || (/* @__PURE__ */ new Date()).getFullYear(),
      category: bookData.category || "General",
      shelfLocation: bookData.shelfLocation || "General Stacks",
      description: bookData.description || `Published by ${bookData.printingHouse || "Library"}.`,
      coverAccent: "from-stone-700 to-stone-900",
      waitlistUserIds: []
    });
    for (let i = 1; i <= copiesNum; i++) {
      await db.insert(copies).values({
        id: `${bookId}-C${i}`,
        bookId,
        copyNumber: i,
        barcode: `FD-${Date.now().toString().slice(-4)}-${i}`,
        status: "available",
        condition: "mint",
        shelfLocation: bookData.shelfLocation || "General Stacks"
      });
    }
    return { success: true, message: `Added "${bookData.title}" with ${copiesNum} copies.` };
  } catch (error) {
    console.error("Failed to create book:", error);
    throw new Error("Failed to create book record.", { cause: error });
  }
}
async function borrowBookRecord(bookId, userId, loanDays = 14) {
  try {
    const userRecords = await db.select().from(users).where(eq(users.uid, userId)).limit(1);
    if (userRecords.length === 0) {
      return { success: false, message: "User account not found in database." };
    }
    const user = userRecords[0];
    const bookRecords = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    if (bookRecords.length === 0) {
      return { success: false, message: "Book not found." };
    }
    const book = bookRecords[0];
    const availableCopies = await db.select().from(copies).where(and(eq(copies.bookId, bookId), eq(copies.status, "available"))).limit(1);
    if (availableCopies.length === 0) {
      return { success: false, message: "No available copies for this book." };
    }
    const copy = availableCopies[0];
    const today = getTodayDate();
    const dueDate = addDays(today, loanDays);
    const newLoanId = `loan-${Date.now()}`;
    await db.update(copies).set({ status: "borrowed", currentLoanId: newLoanId }).where(eq(copies.id, copy.id));
    const newLoan = {
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
      status: "active"
    };
    await db.insert(loans).values(newLoan);
    return {
      success: true,
      message: `Checked out "${book.title}". Due date is ${dueDate}.`,
      loan: newLoan
    };
  } catch (error) {
    console.error("Borrow failed:", error);
    throw new Error("Failed to record borrow.", { cause: error });
  }
}
async function returnLoanRecord(loanId) {
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: "Loan record not found." };
    }
    const loan = loanRecords[0];
    const today = getTodayDate();
    await db.update(loans).set({ status: "returned", returnedDate: today, returnNotified: false }).where(eq(loans.id, loanId));
    await db.update(copies).set({ status: "available", currentLoanId: null }).where(eq(copies.id, loan.copyId));
    const bookRecords = await db.select().from(books).where(eq(books.id, loan.bookId)).limit(1);
    if (bookRecords.length > 0 && bookRecords[0].waitlistUserIds && bookRecords[0].waitlistUserIds.length > 0) {
      const waitlist = bookRecords[0].waitlistUserIds;
      for (const uid of waitlist) {
        await db.insert(notifications).values({
          id: `notif-stock-${Date.now()}-${uid}`,
          recipientRole: "student",
          recipientUserId: uid,
          type: "book_back_in_stock",
          title: "Book Back in Stock",
          message: `"${bookRecords[0].title}" (${bookRecords[0].printingHouse}) has a copy back in stock!`,
          timestamp: getNowTimestamp(),
          read: false,
          bookId: bookRecords[0].id
        });
      }
      await db.update(books).set({ waitlistUserIds: [] }).where(eq(books.id, bookRecords[0].id));
    }
    await db.update(notifications).set({ read: true }).where(eq(notifications.loanId, loanId));
    return { success: true, message: `Checked in "${loan.bookTitle}". Marked as returned.` };
  } catch (error) {
    console.error("Return failed:", error);
    throw new Error("Failed to process return.", { cause: error });
  }
}
async function extendLoanRecord(loanId) {
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: "Loan record not found." };
    }
    const loan = loanRecords[0];
    if (loan.hasExtended) {
      return { success: false, message: "This loan has already been extended once." };
    }
    const newDueDate = addDays(loan.dueDate, 7);
    await db.update(loans).set({ dueDate: newDueDate, hasExtended: true }).where(eq(loans.id, loanId));
    return {
      success: true,
      message: `7-day extension granted. New due date: ${newDueDate}.`
    };
  } catch (error) {
    console.error("Extension failed:", error);
    throw new Error("Failed to extend loan.", { cause: error });
  }
}
async function notifyReturnRecord(loanId) {
  try {
    const loanRecords = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
    if (loanRecords.length === 0) {
      return { success: false, message: "Loan record not found." };
    }
    const loan = loanRecords[0];
    const nowTime = getNowTimestamp();
    await db.update(loans).set({ returnNotified: true, returnNotifiedAt: nowTime }).where(eq(loans.id, loanId));
    await db.insert(notifications).values({
      id: `notif-return-${Date.now()}`,
      recipientRole: "admin",
      type: "return_notified",
      title: "Return Notice",
      message: `${loan.studentName} notified return of "${loan.bookTitle}". Pending desk confirmation.`,
      bookId: loan.bookId,
      copyId: loan.copyId,
      loanId: loan.id,
      timestamp: nowTime,
      read: false
    });
    return { success: true, message: "Library staff notified of return." };
  } catch (error) {
    console.error("Notify return failed:", error);
    throw new Error("Failed to notify return.", { cause: error });
  }
}
async function notifyLateStudentsRecord() {
  try {
    const activeLoans = await db.select().from(loans).where(eq(loans.status, "active"));
    const today = getTodayDate();
    const todayMidnight = new Date(today).getTime();
    const lateLoans = activeLoans.filter((l) => {
      const dueMidnight = new Date(l.dueDate).getTime();
      return todayMidnight > dueMidnight;
    });
    if (lateLoans.length === 0) {
      return { success: true, count: 0, message: "All student loans are currently on time." };
    }
    const timestamp2 = getNowTimestamp();
    for (let idx = 0; idx < lateLoans.length; idx++) {
      const loan = lateLoans[idx];
      const diffMs = todayMidnight - new Date(loan.dueDate).getTime();
      const diffDays = Math.round(diffMs / (1e3 * 60 * 60 * 24));
      const severity = diffDays <= 2 ? "slightly_late" : diffDays <= 14 ? "very_late" : "overly_late";
      await db.insert(notifications).values({
        id: `notif-overdue-${Date.now()}-${idx}`,
        recipientRole: "student",
        recipientUserId: loan.studentId,
        type: "overdue_alert",
        title: `Overdue Notice (${diffDays}d late)`,
        message: `Your borrowed book "${loan.bookTitle}" was due on ${loan.dueDate} and is now ${diffDays} day${diffDays > 1 ? "s" : ""} overdue. Please return it immediately.`,
        timestamp: timestamp2,
        read: false,
        bookId: loan.bookId,
        loanId: loan.id,
        severity
      });
    }
    return {
      success: true,
      count: lateLoans.length,
      message: `Overdue notices sent to ${lateLoans.length} student inbox${lateLoans.length > 1 ? "es" : ""}.`
    };
  } catch (error) {
    console.error("Notify late failed:", error);
    throw new Error("Failed to notify late students.", { cause: error });
  }
}
async function upsertUserRecord(userData) {
  try {
    const result = await db.insert(users).values({
      uid: userData.uid,
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      role: userData.role || (userData.email.toLowerCase().includes("admin") ? "admin" : "student"),
      photoUrl: userData.photoUrl
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email: userData.email.toLowerCase().trim(),
        name: userData.name.trim(),
        photoUrl: userData.photoUrl
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Upsert user failed:", error);
    throw new Error("Failed to upsert user.", { cause: error });
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
async function startServer() {
  const app = express();
  app.use(express.json());
  try {
    await seedInitialDatabaseIfEmpty();
  } catch (err) {
    console.error("Initial Cloud SQL database seed notice:", err);
  }
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "cloudsql-postgresql" });
  });
  app.get("/api/database", async (_req, res) => {
    try {
      const data = await getDatabaseSnapshot();
      res.json({
        success: true,
        currentDate: data.currentDate,
        books: data.books,
        loans: data.loans,
        users: data.users,
        notifications: data.notifications,
        database: "cloudsql"
      });
    } catch (error) {
      console.error("API /api/database failed:", error);
      res.status(500).json({ success: false, error: "Failed to fetch database snapshot" });
    }
  });
  app.post("/api/books", async (req, res) => {
    try {
      const { title, author, printingHouse, isbn, publicationYear, category, shelfLocation, description, copiesCount } = req.body;
      if (!title || !author) {
        res.status(400).json({ success: false, message: "Title and author are required." });
        return;
      }
      const result = await createBookRecord({
        title,
        author,
        printingHouse,
        isbn,
        publicationYear,
        category,
        shelfLocation,
        description,
        copiesCount
      });
      res.json(result);
    } catch (error) {
      console.error("API /api/books failed:", error);
      res.status(500).json({ success: false, message: "Failed to create book in database." });
    }
  });
  app.post("/api/loans/borrow", async (req, res) => {
    try {
      const { bookId, userId, loanDays = 14 } = req.body;
      if (!bookId || !userId) {
        res.status(400).json({ success: false, message: "bookId and userId are required." });
        return;
      }
      const result = await borrowBookRecord(bookId, userId, loanDays);
      res.json(result);
    } catch (error) {
      console.error("API /api/loans/borrow failed:", error);
      res.status(500).json({ success: false, message: "Failed to process loan in database." });
    }
  });
  app.post("/api/loans/return", async (req, res) => {
    try {
      const { loanId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: "loanId is required." });
        return;
      }
      const result = await returnLoanRecord(loanId);
      res.json(result);
    } catch (error) {
      console.error("API /api/loans/return failed:", error);
      res.status(500).json({ success: false, message: "Failed to return loan in database." });
    }
  });
  app.post("/api/loans/extend", async (req, res) => {
    try {
      const { loanId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: "loanId is required." });
        return;
      }
      const result = await extendLoanRecord(loanId);
      res.json(result);
    } catch (error) {
      console.error("API /api/loans/extend failed:", error);
      res.status(500).json({ success: false, message: "Failed to extend loan in database." });
    }
  });
  app.post("/api/loans/notify-return", async (req, res) => {
    try {
      const { loanId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: "loanId is required." });
        return;
      }
      const result = await notifyReturnRecord(loanId);
      res.json(result);
    } catch (error) {
      console.error("API /api/loans/notify-return failed:", error);
      res.status(500).json({ success: false, message: "Failed to notify return in database." });
    }
  });
  app.post("/api/notifications/notify-late", async (_req, res) => {
    try {
      const result = await notifyLateStudentsRecord();
      res.json(result);
    } catch (error) {
      console.error("API /api/notifications/notify-late failed:", error);
      res.status(500).json({ success: false, message: "Failed to notify late students." });
    }
  });
  app.post("/api/users", async (req, res) => {
    try {
      const { uid, name, email, role, photoUrl } = req.body;
      if (!email || !name) {
        res.status(400).json({ success: false, message: "Name and email are required." });
        return;
      }
      const user = await upsertUserRecord({
        uid: uid || `user-${Date.now()}`,
        email,
        name,
        role,
        photoUrl
      });
      res.json({ success: true, user, message: "User synchronized with database." });
    } catch (error) {
      console.error("API /api/users failed:", error);
      res.status(500).json({ success: false, message: "Failed to register/sync user." });
    }
  });
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Library Manager server running on Cloud SQL at http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
