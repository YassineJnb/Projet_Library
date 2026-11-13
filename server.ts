import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { isSqlConfigured } from './src/db/index.ts';
import {
  seedInitialDatabaseIfEmpty,
  resetDatabaseToSeed,
  getDatabaseSnapshot,
  createBookRecord,
  addCopyRecord,
  borrowBookRecord,
  returnLoanRecord,
  extendLoanRecord,
  notifyReturnRecord,
  notifyLateStudentsRecord,
  notifySingleStudentWarning,
  requestStockAlertRecord,
  markNotificationReadRecord,
  deleteNotificationRecord,
  upsertUserRecord,
  reportReturnMismatchRecord,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize and seed database on startup if empty
  try {
    await seedInitialDatabaseIfEmpty();
  } catch (err) {
    console.error('Initial database seed notice:', err);
  }

  // --- REST API Endpoints ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      database: isSqlConfigured() ? 'cloudsql-postgresql' : 'local-json-db',
    });
  });

  // Get complete database snapshot
  app.get('/api/database', async (_req: Request, res: Response) => {
    try {
      const data = await getDatabaseSnapshot();
      res.json({
        success: true,
        currentDate: data.currentDate,
        books: data.books,
        loans: data.loans,
        users: data.users,
        notifications: data.notifications,
        database: isSqlConfigured() ? 'cloudsql' : 'json',
      });
    } catch (error: any) {
      console.error('API /api/database failed:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch database snapshot' });
    }
  });

  // Add new book to Cloud SQL catalog
  app.post('/api/books', async (req: Request, res: Response) => {
    try {
      const { id, title, author, printingHouse, isbn, publicationYear, category, shelfLocation, description, copiesCount, copies } = req.body;
      if (!title || !author) {
        res.status(400).json({ success: false, message: 'Title and author are required.' });
        return;
      }

      const result = await createBookRecord({
        id,
        title,
        author,
        printingHouse,
        isbn,
        publicationYear,
        category,
        shelfLocation,
        description,
        copiesCount,
        copies,
      });

      res.json(result);
    } catch (error: any) {
      console.error('API /api/books failed:', error);
      res.status(500).json({ success: false, message: 'Failed to create book in database.' });
    }
  });

  // Add copy to existing book
  app.post('/api/books/:bookId/copies', async (req: Request, res: Response) => {
    try {
      const { bookId } = req.params;
      const { id, copyNumber, barcode } = req.body;
      const result = await addCopyRecord(bookId, { id, copyNumber, barcode });
      res.json(result);
    } catch (error: any) {
      console.error('API /api/books/:bookId/copies failed:', error);
      res.status(500).json({ success: false, message: 'Failed to add copy.' });
    }
  });

  // Lend a book in Cloud SQL
  app.post('/api/loans/borrow', async (req: Request, res: Response) => {
    try {
      const { bookId, userId, loanDays = 14, loanId, copyId, userEmail, userName } = req.body;
      if (!bookId || !userId) {
        res.status(400).json({ success: false, message: 'bookId and userId are required.' });
        return;
      }

      const result = await borrowBookRecord(bookId, userId, loanDays, loanId, copyId, userEmail, userName);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/borrow failed:', error);
      res.status(500).json({ success: false, message: 'Failed to process loan in database.' });
    }
  });

  // Return a loan in Cloud SQL (with optional exemplaire verification)
  app.post('/api/loans/return', async (req: Request, res: Response) => {
    try {
      const { loanId, verifiedCopyId, returnCondition } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: 'loanId is required.' });
        return;
      }

      const result = await returnLoanRecord(loanId, verifiedCopyId, returnCondition);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/return failed:', error);
      res.status(500).json({ success: false, message: 'Failed to return loan in database.' });
    }
  });

  // Report returned exemplaire mismatch to student
  app.post('/api/loans/report-mismatch', async (req: Request, res: Response) => {
    try {
      const { loanId, notificationId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: 'loanId is required.' });
        return;
      }

      const result = await reportReturnMismatchRecord(loanId, notificationId);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/report-mismatch failed:', error);
      res.status(500).json({ success: false, message: 'Failed to report return mismatch.' });
    }
  });

  // Extend loan in Cloud SQL
  app.post('/api/loans/extend', async (req: Request, res: Response) => {
    try {
      const { loanId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: 'loanId is required.' });
        return;
      }

      const result = await extendLoanRecord(loanId);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/extend failed:', error);
      res.status(500).json({ success: false, message: 'Failed to extend loan in database.' });
    }
  });

  // Student notifies return
  app.post('/api/loans/notify-return', async (req: Request, res: Response) => {
    try {
      const { loanId, notificationId } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: 'loanId is required.' });
        return;
      }

      const result = await notifyReturnRecord(loanId, notificationId);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/notify-return failed:', error);
      res.status(500).json({ success: false, message: 'Failed to notify return in database.' });
    }
  });

  // Admin sends warning/reminder notice to a specific student (via app inbox and Gmail)
  app.post('/api/loans/notify-student', async (req: Request, res: Response) => {
    try {
      const { loanId, notificationId, overrideEmail, fallbackLoan } = req.body;
      if (!loanId) {
        res.status(400).json({ success: false, message: 'loanId is required.' });
        return;
      }

      const authHeader = req.headers.authorization;
      const accessToken =
        authHeader && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : undefined;

      const result = await notifySingleStudentWarning(
        loanId,
        notificationId,
        accessToken,
        overrideEmail,
        fallbackLoan
      );
      res.json(result);
    } catch (error: any) {
      console.error('API /api/loans/notify-student failed:', error);
      res.status(500).json({ success: false, message: 'Failed to send student warning notice.' });
    }
  });

  // Student requests back-in-stock alert
  app.post('/api/notifications/stock-alert', async (req: Request, res: Response) => {
    try {
      const { bookId, userId } = req.body;
      if (!bookId || !userId) {
        res.status(400).json({ success: false, message: 'bookId and userId are required.' });
        return;
      }
      const result = await requestStockAlertRecord(bookId, userId);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/notifications/stock-alert failed:', error);
      res.status(500).json({ success: false, message: 'Failed to set stock alert.' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
    try {
      const result = await markNotificationReadRecord(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/notifications/:id/read failed:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notification read.' });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteNotificationRecord(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/notifications/:id failed:', error);
      res.status(500).json({ success: false, message: 'Failed to delete notification.' });
    }
  });

  // Admin notifies late students
  app.post('/api/notifications/notify-late', async (_req: Request, res: Response) => {
    try {
      const result = await notifyLateStudentsRecord();
      res.json(result);
    } catch (error: any) {
      console.error('API /api/notifications/notify-late failed:', error);
      res.status(500).json({ success: false, message: 'Failed to notify late students.' });
    }
  });

  // Reset demo data
  app.post('/api/reset', async (_req: Request, res: Response) => {
    try {
      const data = await resetDatabaseToSeed();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('API /api/reset failed:', error);
      res.status(500).json({ success: false, message: 'Failed to reset database.' });
    }
  });

  // User synchronization with Cloud SQL
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const { uid, id, name, email, role, photoUrl } = req.body;
      if (!email || !name) {
        res.status(400).json({ success: false, message: 'Name and email are required.' });
        return;
      }

      const user = await upsertUserRecord({
        uid: uid || id || `user-${Date.now()}`,
        email,
        name,
        role,
        photoUrl,
      });

      res.json({ success: true, user, message: 'User synchronized with database.' });
    } catch (error: any) {
      console.error('API /api/users failed:', error);
      res.status(500).json({ success: false, message: 'Failed to register/sync user.' });
    }
  });

  // --- Vite Dev Server Middleware or Production Static Serving ---
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Library Manager server running on Cloud SQL at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
