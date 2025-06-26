const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? ':memory:' 
  : path.join(__dirname, 'warehouse.db');
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      user TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    // Add reorder points and forecasting tables
    db.run(`CREATE TABLE IF NOT EXISTS product_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER UNIQUE,
      reorder_point INTEGER DEFAULT 10,
      max_stock INTEGER DEFAULT 100,
      supplier_id INTEGER,
      category TEXT,
      sku TEXT UNIQUE,
      cost_price REAL,
      selling_price REAL,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      status TEXT DEFAULT 'pending',
      total_amount REAL,
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      expected_delivery TEXT,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      type TEXT DEFAULT 'warehouse'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS inventory_by_location (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      location_id INTEGER,
      quantity INTEGER DEFAULT 0,
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(location_id) REFERENCES locations(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT,
      customer_type TEXT DEFAULT 'regular',
      credit_limit REAL DEFAULT 0,
      payment_terms TEXT DEFAULT 'net_30',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sales_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      order_number TEXT UNIQUE,
      status TEXT DEFAULT 'pending',
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      expected_delivery TEXT,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sales_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      total_price REAL,
      FOREIGN KEY(sales_order_id) REFERENCES sales_orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )`);
  }
});

// Log helper
function logAction(action, entity, entity_id, user, details) {
  db.run('INSERT INTO audit_logs (action, entity, entity_id, user, details) VALUES (?, ?, ?, ?, ?)',
    [action, entity, entity_id, user, JSON.stringify(details)]);
}

// Email config (replace with your real email and password or use env vars)
const EMAIL_USER = 'your_email@gmail.com';
const EMAIL_PASS = 'your_password';
const EMAIL_TO = 'recipient_email@gmail.com';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});
function sendLowStockEmail(product) {
  const mailOptions = {
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: `Low Stock Alert: ${product.name}`,
    text: `Product ${product.name} is low on stock. Only ${product.quantity} left.`
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('Email error:', err);
    else console.log('Low stock email sent:', info.response);
  });
}

// API routes
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, quantity } = req.body;
  db.run('INSERT INTO products (name, quantity) VALUES (?, ?)', [name, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('add', 'product', this.lastID, req.user?.username || 'anonymous', { name, quantity });
    res.json({ id: this.lastID, name, quantity });
  });
});

// Edit product
app.put('/api/products/:id', (req, res) => {
  const { name, quantity } = req.body;
  db.run('UPDATE products SET name = ?, quantity = ? WHERE id = ?', [name, quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('edit', 'product', req.params.id, req.user?.username || 'anonymous', { name, quantity });
    res.json({ id: req.params.id, name, quantity });
  });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('delete', 'product', req.params.id, req.user?.username || 'anonymous', {});
    res.json({ success: true });
  });
});

app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/orders', (req, res) => {
  const { product_id, quantity } = req.body;
  db.run('INSERT INTO orders (product_id, quantity) VALUES (?, ?)', [product_id, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // Update product quantity
    db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, product_id]);
    logAction('add', 'order', this.lastID, req.user?.username || 'anonymous', { product_id, quantity });
    res.json({ id: this.lastID, product_id, quantity });
  });
});

// Edit order
app.put('/api/orders/:id', (req, res) => {
  const { product_id, quantity } = req.body;
  db.run('UPDATE orders SET product_id = ?, quantity = ? WHERE id = ?', [product_id, quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('edit', 'order', req.params.id, req.user?.username || 'anonymous', { product_id, quantity });
    res.json({ id: req.params.id, product_id, quantity });
  });
});

// Delete order
app.delete('/api/orders/:id', (req, res) => {
  db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('delete', 'order', req.params.id, req.user?.username || 'anonymous', {});
    res.json({ success: true });
  });
});

// Register
app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role || 'user'], function(err) {
    if (err) return res.status(400).json({ error: 'Username already exists' });
    res.json({ id: this.lastID, username, role: role || 'user' });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role });
  });
});

// Auth middleware
function auth(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET);
      if (requiredRole && decoded.role !== requiredRole) return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// Get audit logs
app.get('/api/audit-logs', (req, res) => {
  db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Check and notify low stock
function checkAndNotifyLowStock(productId) {
  db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
    if (!err && product && product.quantity < 10) {
      sendLowStockEmail(product);
    }
  });
}

// Update product quantity and check for low stock in order creation
app.post('/api/orders', (req, res) => {
  const { product_id, quantity } = req.body;
  db.run('INSERT INTO orders (product_id, quantity) VALUES (?, ?)', [product_id, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // Update product quantity
    db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, product_id], function(err) {
      checkAndNotifyLowStock(product_id);
    });
    logAction('add', 'order', this.lastID, req.user?.username || 'anonymous', { product_id, quantity });
    res.json({ id: this.lastID, product_id, quantity });
  });
});

// Update product quantity and check for low stock in product edit
app.put('/api/products/:id', (req, res) => {
  const { name, quantity } = req.body;
  db.run('UPDATE products SET name = ?, quantity = ? WHERE id = ?', [name, quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('edit', 'product', req.params.id, req.user?.username || 'anonymous', { name, quantity });
    // Check low stock after update
    checkAndNotifyLowStock(req.params.id);
    res.json({ id: req.params.id, name, quantity });
  });
});

// Bulk export products as CSV
app.get('/api/products/export', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const csv = ['id,name,quantity', ...rows.map(r => `${r.id},${r.name},${r.quantity}`)].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('products.csv');
    res.send(csv);
  });
});
// Bulk import products from CSV
app.post('/api/products/import', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const data = fs.readFileSync(file.path, 'utf-8').split('\n').slice(1); // skip header
  data.forEach(line => {
    const [id, name, quantity] = line.split(',');
    if (name && quantity) {
      db.run('INSERT OR REPLACE INTO products (id, name, quantity) VALUES (?, ?, ?)', [id || null, name, quantity]);
    }
  });
  fs.unlinkSync(file.path);
  res.json({ success: true });
});
// Repeat for orders
app.get('/api/orders/export', (req, res) => {
  db.all('SELECT * FROM orders', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const csv = ['id,product_id,quantity,created_at', ...rows.map(r => `${r.id},${r.product_id},${r.quantity},${r.created_at}`)].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('orders.csv');
    res.send(csv);
  });
});
app.post('/api/orders/import', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const data = fs.readFileSync(file.path, 'utf-8').split('\n').slice(1);
  data.forEach(line => {
    const [id, product_id, quantity, created_at] = line.split(',');
    if (product_id && quantity) {
      db.run('INSERT OR REPLACE INTO orders (id, product_id, quantity, created_at) VALUES (?, ?, ?, ?)', [id || null, product_id, quantity, created_at || new Date().toISOString()]);
    }
  });
  fs.unlinkSync(file.path);
  res.json({ success: true });
});

// Advanced API endpoints

// Suppliers
app.get('/api/suppliers', (req, res) => {
  db.all('SELECT * FROM suppliers', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact_email, contact_phone, address } = req.body;
  db.run('INSERT INTO suppliers (name, contact_email, contact_phone, address) VALUES (?, ?, ?, ?)', 
    [name, contact_email, contact_phone, address], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, contact_email, contact_phone, address });
  });
});

// Purchase Orders
app.get('/api/purchase-orders', (req, res) => {
  db.all(`SELECT po.*, s.name as supplier_name FROM purchase_orders po 
          LEFT JOIN suppliers s ON po.supplier_id = s.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/purchase-orders', (req, res) => {
  const { supplier_id, items, expected_delivery } = req.body;
  const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  db.run('INSERT INTO purchase_orders (supplier_id, total_amount, expected_delivery) VALUES (?, ?, ?)', 
    [supplier_id, total_amount, expected_delivery], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const po_id = this.lastID;
    
    // Add items
    items.forEach(item => {
      db.run('INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [po_id, item.product_id, item.quantity, item.unit_price]);
    });
    
    res.json({ id: po_id, supplier_id, total_amount, expected_delivery });
  });
});

// Low stock alerts with reorder suggestions
app.get('/api/low-stock-alerts', (req, res) => {
  db.all(`SELECT p.*, ps.reorder_point, ps.max_stock, s.name as supplier_name
          FROM products p 
          LEFT JOIN product_settings ps ON p.id = ps.product_id
          LEFT JOIN suppliers s ON ps.supplier_id = s.id
          WHERE p.quantity <= COALESCE(ps.reorder_point, 10)`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Inventory forecasting (simple calculation based on order history)
app.get('/api/inventory-forecast/:productId', (req, res) => {
  const productId = req.params.productId;
  db.all(`SELECT DATE(created_at) as date, SUM(quantity) as daily_usage 
          FROM orders WHERE product_id = ? AND created_at >= datetime('now', '-30 days')
          GROUP BY DATE(created_at)`, [productId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const avgDailyUsage = rows.length ? rows.reduce((sum, r) => sum + r.daily_usage, 0) / rows.length : 0;
    const daysToStockout = avgDailyUsage > 0 ? Math.floor(30 / avgDailyUsage) : 999; // assuming current stock of 30 days
    
    res.json({ avgDailyUsage, daysToStockout, historicalData: rows });
  });
});

// Product categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM product_settings WHERE category IS NOT NULL', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.category));
  });
});

// Customer Management API
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms } = req.body;
  db.run(`INSERT INTO customers (name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction('add', 'customer', this.lastID, req.user?.username || 'anonymous', { name, email });
      res.json({ id: this.lastID, name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms });
    });
});

app.put('/api/customers/:id', (req, res) => {
  const { name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms } = req.body;
  db.run(`UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, country = ?, customer_type = ?, credit_limit = ?, payment_terms = ? WHERE id = ?`,
    [name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms, req.params.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction('edit', 'customer', req.params.id, req.user?.username || 'anonymous', { name, email });
      res.json({ id: req.params.id, name, email, phone, address, city, state, zip_code, country, customer_type, credit_limit, payment_terms });
    });
});

app.delete('/api/customers/:id', (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('delete', 'customer', req.params.id, req.user?.username || 'anonymous', {});
    res.json({ success: true });
  });
});

// Sales Orders API
app.get('/api/sales-orders', (req, res) => {
  db.all(`SELECT so.*, c.name as customer_name FROM sales_orders so 
          LEFT JOIN customers c ON so.customer_id = c.id 
          ORDER BY so.order_date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/sales-orders/:id/items', (req, res) => {
  db.all(`SELECT soi.*, p.name as product_name FROM sales_order_items soi 
          LEFT JOIN products p ON soi.product_id = p.id 
          WHERE soi.sales_order_id = ?`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/sales-orders', (req, res) => {
  const { customer_id, items, expected_delivery, notes } = req.body;
  const order_number = 'SO-' + Date.now();
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = subtotal * 0.1; // 10% tax
  const total_amount = subtotal + tax_amount;
  
  db.run(`INSERT INTO sales_orders (customer_id, order_number, subtotal, tax_amount, total_amount, expected_delivery, notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [customer_id, order_number, subtotal, tax_amount, total_amount, expected_delivery, notes], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const sales_order_id = this.lastID;
      
      // Add items
      items.forEach(item => {
        const total_price = item.quantity * item.unit_price;
        db.run(`INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, total_price) 
                VALUES (?, ?, ?, ?, ?)`, [sales_order_id, item.product_id, item.quantity, item.unit_price, total_price]);
        
        // Update product quantity
        db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
      });
      
      logAction('add', 'sales_order', sales_order_id, req.user?.username || 'anonymous', { order_number, customer_id, total_amount });
      res.json({ id: sales_order_id, order_number, customer_id, subtotal, tax_amount, total_amount });
    });
});

// Customer order history
app.get('/api/customers/:id/orders', (req, res) => {
  db.all(`SELECT * FROM sales_orders WHERE customer_id = ? ORDER BY order_date DESC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
