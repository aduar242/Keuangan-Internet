import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { z } from 'zod';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('finance.db');

// --- DATABASE MIGRATIONS ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'penagih')) NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    packet TEXT NOT NULL,
    collector_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collector_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_id INTEGER,
    type TEXT CHECK(type IN ('pemasukan', 'pengeluaran')) NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('pending', 'deposited', 'confirmed')) DEFAULT 'confirmed',
    billing_period TEXT, -- Format: YYYY-MM
    transaction_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'RT/RW NET',
    company_address TEXT,
    company_phone TEXT,
    receipt_footer TEXT,
    currency_symbol TEXT DEFAULT 'Rp'
  );
`);

// --- RUNTIME MIGRATIONS ---
try {
  db.prepare("ALTER TABLE transactions ADD COLUMN status TEXT CHECK(status IN ('pending', 'deposited', 'confirmed')) DEFAULT 'confirmed'").run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE transactions ADD COLUMN billing_period TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE customers ADD COLUMN collector_id INTEGER').run();
} catch (e) {}

// Seed default settings if not exists
const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare('INSERT INTO settings (id, company_name, company_address, company_phone, receipt_footer) VALUES (?, ?, ?, ?, ?)').run(1, 'RT/RW NET', 'Jln. Kebon Jeruk No. 88, Jakarta Selatan', '0812-XXXX-XXXX', 'Terima kasih telah berlangganan.');
}

// Seed default users if not exists
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('admin', 'admin123', 'admin', 'System Admin');
  db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run('penagih1', 'penagih123', 'penagih', 'Collector Budi');
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
  });

  // Helper to broadcast updates
  const broadcast = (event: string, data: any) => {
    io.emit(event, data);
  };

  app.use(cors());
  app.use(express.json());

  // --- MIDDLEWARES ---
  const authMiddleware = (req: any, res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  };

  const adminOnly = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access only' });
    }
    next();
  };

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/me', authMiddleware, (req: any, res) => {
    try {
      res.json(req.user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  app.post('/api/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare('SELECT id, username, role, name FROM users WHERE username = ? AND password = ?').get(username, password) as any;
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Login service unavailable' });
    }
  });

  // Dashboard Stats
  app.get('/api/stats', authMiddleware, adminOnly, (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT 
          SUM(CASE WHEN type = 'pemasukan' AND status = 'confirmed' THEN amount ELSE 0 END) as totalIncome,
          SUM(CASE WHEN type = 'pengeluaran' THEN amount ELSE 0 END) as totalExpense
        FROM transactions
      `).get() as { totalIncome: number; totalExpense: number };

      const pendingDeposits = db.prepare(`
        SELECT SUM(amount) as pendingAmount FROM transactions 
        WHERE status IN ('pending', 'deposited') AND type = 'pemasukan'
      `).get() as { pendingAmount: number };

      res.json({
        totalIncome: stats.totalIncome || 0,
        totalExpense: stats.totalExpense || 0,
        balance: (stats.totalIncome || 0) - (stats.totalExpense || 0),
        pendingAmount: pendingDeposits.pendingAmount || 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // Transactions
  app.get('/api/transactions', authMiddleware, (req: any, res) => {
    try {
      let transactions;
      if (req.user.role === 'admin') {
        transactions = db.prepare(`
          SELECT t.*, u.name as collector_name, c.name as customer_name 
          FROM transactions t 
          JOIN users u ON t.user_id = u.id 
          LEFT JOIN customers c ON t.customer_id = c.id
          ORDER BY t.transaction_date DESC, t.id DESC
        `).all();
      } else {
        transactions = db.prepare(`
          SELECT t.*, c.name as customer_name 
          FROM transactions t
          LEFT JOIN customers c ON t.customer_id = c.id
          WHERE t.user_id = ? 
          ORDER BY t.transaction_date DESC, t.id DESC
        `).all(req.user.id);
      }
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/transactions', authMiddleware, (req: any, res) => {
    const schema = z.object({
      type: z.enum(['pemasukan', 'pengeluaran']),
      category: z.string().min(1),
      amount: z.number().positive(),
      description: z.string().optional(),
      transaction_date: z.string(),
      billing_period: z.string().optional(),
      customer_id: z.number().nullable().optional()
    });

    try {
      const data = schema.parse(req.body);
      if (req.user.role === 'penagih' && data.type !== 'pemasukan') {
        return res.status(403).json({ error: 'Collectors can only input income' });
      }

      // Check for duplicate billing period for the same customer
      if (data.type === 'pemasukan' && data.category === 'Tagihan Bulanan' && data.customer_id && data.billing_period) {
        const existing = db.prepare(`
          SELECT id FROM transactions 
          WHERE customer_id = ? AND billing_period = ? AND category = 'Tagihan Bulanan'
        `).get(data.customer_id, data.billing_period);
        
        if (existing) {
          return res.status(400).json({ error: `Tagihan untuk bulan ${data.billing_period} sudah dibayar.` });
        }
      }

      const status = req.user.role === 'admin' ? 'confirmed' : 'pending';
      const stmt = db.prepare(`
        INSERT INTO transactions (user_id, customer_id, type, category, amount, description, transaction_date, status, billing_period)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(req.user.id, data.customer_id || null, data.type, data.category, data.amount, data.description || '', data.transaction_date, status, data.billing_period || null);
      const newTransaction = { id: result.lastInsertRowid, ...data, status, user_id: req.user.id };
      broadcast('transaction:created', newTransaction);
      res.json(newTransaction);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error: ' + err.issues.map(e => e.message).join(', ') });
      }
      res.status(500).json({ error: err.message || 'Failed to save transaction' });
    }
  });

  app.get('/api/transactions/:id', authMiddleware, (req, res) => {
    try {
      const transaction = db.prepare(`
        SELECT t.*, c.name as customer_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.id = ?
      `).get(req.params.id);
      if (transaction) res.json(transaction);
      else res.status(404).json({ error: 'Transaction not found' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
  });

  app.delete('/api/transactions/:id', authMiddleware, adminOnly, (req, res) => {
    try {
      const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
      if (result.changes > 0) {
        broadcast('transaction:deleted', { id: req.params.id });
        res.json({ success: true });
      }
      else res.status(404).json({ error: 'Transaction not found' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  app.get('/api/customers/:id/payments', authMiddleware, (req, res) => {
    try {
      const payments = db.prepare(`
        SELECT billing_period, status, amount, transaction_date 
        FROM transactions 
        WHERE customer_id = ? AND category = 'Tagihan Bulanan'
        ORDER BY billing_period DESC
      `).all(req.params.id);
      res.json(payments);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // Deposit Management
  app.get('/api/deposits/pending', authMiddleware, adminOnly, (req, res) => {
    try {
      const deposits = db.prepare(`
        SELECT u.name as collector_name, u.id as collector_id, SUM(t.amount) as totalAmount, COUNT(t.id) as transactionCount
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.status = 'deposited'
        GROUP BY u.id
      `).all();
      res.json(deposits);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch pending deposits' });
    }
  });

  app.post('/api/deposits/submit', authMiddleware, (req: any, res) => {
    try {
      if (req.user.role !== 'penagih') return res.status(403).json({ error: 'Only collectors can submit deposits' });
      db.prepare("UPDATE transactions SET status = 'deposited' WHERE user_id = ? AND status = 'pending'").run(req.user.id);
      broadcast('deposit:updated', { collector_id: req.user.id, status: 'deposited' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit deposit' });
    }
  });

  app.post('/api/deposits/confirm', authMiddleware, adminOnly, (req, res) => {
    try {
      const { collector_id } = req.body;
      db.prepare("UPDATE transactions SET status = 'confirmed' WHERE user_id = ? AND status = 'deposited'").run(collector_id);
      broadcast('deposit:updated', { collector_id, status: 'confirmed' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to confirm deposit' });
    }
  });

  // Packets
  app.get('/api/packets', authMiddleware, (req, res) => {
    try {
      const packets = db.prepare('SELECT * FROM packets ORDER BY price ASC').all();
      res.json(packets);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch packets' });
    }
  });

  app.post('/api/packets', authMiddleware, adminOnly, (req, res) => {
    try {
      const { name, price } = req.body;
      const result = db.prepare('INSERT INTO packets (name, price) VALUES (?, ?)').run(name, price);
      broadcast('packet:updated', { id: result.lastInsertRowid, name, price, action: 'created' });
      res.json({ id: result.lastInsertRowid, name, price });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create packet' });
    }
  });

  app.delete('/api/packets/:id', authMiddleware, adminOnly, (req, res) => {
    try {
      db.prepare('DELETE FROM packets WHERE id = ?').run(req.params.id);
      broadcast('packet:updated', { id: req.params.id, action: 'deleted' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete packet' });
    }
  });

  // Customers
  app.get('/api/customers', authMiddleware, (req, res) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const customers = db.prepare(`
        SELECT c.*, u.name as collector_name,
               (SELECT COUNT(*) FROM transactions t 
                WHERE t.customer_id = c.id 
                AND t.billing_period = ? 
                AND t.category = 'Tagihan Bulanan') > 0 as is_paid,
               (SELECT MAX(transaction_date) FROM transactions t 
                WHERE t.customer_id = c.id) as last_payment_date,
               (SELECT group_concat(billing_period) FROM transactions t 
                WHERE t.customer_id = c.id 
                AND t.category = 'Tagihan Bulanan') as paid_months
        FROM customers c 
        LEFT JOIN users u ON c.collector_id = u.id
        ORDER BY name ASC
      `).all(currentMonth);
      res.json(customers);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch customer list' });
    }
  });

  app.post('/api/customers', authMiddleware, (req, res) => {
    try {
      const { name, address, phone, packet, created_at, collector_id } = req.body;
      const finalCreatedAt = created_at ? `${created_at}-01T00:00:00Z` : new Date().toISOString();
      const result = db.prepare('INSERT INTO customers (name, address, phone, packet, created_at, collector_id) VALUES (?, ?, ?, ?, ?, ?)').run(name, address, phone, packet, finalCreatedAt, collector_id || null);
      const newCustomer = { id: result.lastInsertRowid, name, address, phone, packet, created_at: finalCreatedAt, collector_id };
      broadcast('customer:updated', { customer: newCustomer, action: 'created' });
      res.json(newCustomer);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create customer' });
    }
  });

  app.put('/api/customers/:id', authMiddleware, (req, res) => {
    try {
      const { name, address, phone, packet, created_at, collector_id } = req.body;
      let finalCreatedAt = created_at;
      if (created_at && created_at.length === 7) {
        finalCreatedAt = `${created_at}-01T00:00:00Z`;
      }
      
      if (finalCreatedAt) {
        db.prepare('UPDATE customers SET name = ?, address = ?, phone = ?, packet = ?, created_at = ?, collector_id = ? WHERE id = ?').run(name, address, phone, packet, finalCreatedAt, collector_id || null, req.params.id);
      } else {
        db.prepare('UPDATE customers SET name = ?, address = ?, phone = ?, packet = ?, collector_id = ? WHERE id = ?').run(name, address, phone, packet, collector_id || null, req.params.id);
      }
      broadcast('customer:updated', { id: req.params.id, name, address, phone, packet, created_at: finalCreatedAt, collector_id, action: 'updated' });
      res.json({ id: req.params.id, name, address, phone, packet, created_at: finalCreatedAt, collector_id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update customer' });
    }
  });

  app.delete('/api/customers/:id', authMiddleware, adminOnly, (req, res) => {
    try {
      db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
      broadcast('customer:updated', { id: req.params.id, action: 'deleted' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  });

  app.get('/api/reports/payments', authMiddleware, adminOnly, (req, res) => {
    try {
      const summary = db.prepare(`
        SELECT c.name as customer_name, t.billing_period, t.status, t.amount
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE t.billing_period IS NOT NULL
        ORDER BY c.name ASC, t.billing_period DESC
      `).all();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate payment report' });
    }
  });

  // User Management
  app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
    try {
      res.json(db.prepare('SELECT id, username, role, name FROM users').all());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user list' });
    }
  });

  // Settings
  app.get('/api/settings', authMiddleware, (req, res) => {
    try {
      res.json(db.prepare('SELECT * FROM settings WHERE id = 1').get() || {});
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings', authMiddleware, adminOnly, (req, res) => {
    try {
      const { company_name, company_address, company_phone, receipt_footer, currency_symbol } = req.body;
      db.prepare(`
        UPDATE settings 
        SET company_name = ?, company_address = ?, company_phone = ?, receipt_footer = ?, currency_symbol = ? 
        WHERE id = 1
      `).run(company_name, company_address, company_phone, receipt_footer, currency_symbol);
      broadcast('settings:updated', req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
    try {
      const { username, password, role, name } = req.body;
      const result = db.prepare('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)').run(username, password, role, name);
      res.json({ id: result.lastInsertRowid, username, role, name });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.get('/api/invoices/:transactionId', authMiddleware, (req, res) => {
    try {
      const transaction = db.prepare(`
        SELECT t.*, u.name as collector_name, 
               c.name as customer_name, c.address as customer_address, c.packet as customer_packet, 
               c.phone as customer_phone, c.created_at as customer_created_at
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.id = ?
      `).get(req.params.transactionId) as any;

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch invoice data' });
    }
  });

  // Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
