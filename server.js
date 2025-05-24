const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Database setup
const db = new sqlite3.Database('finance.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Investments table
        db.run(`CREATE TABLE IF NOT EXISTS investments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            amount_invested REAL NOT NULL,
            current_value REAL NOT NULL,
            date_invested TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Budgets table
        db.run(`CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL UNIQUE,
            amount REAL NOT NULL,
            month TEXT NOT NULL,
            year INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tax records table
        db.run(`CREATE TABLE IF NOT EXISTS tax_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            financial_year TEXT NOT NULL,
            gross_income REAL NOT NULL,
            taxable_income REAL NOT NULL,
            tax_paid REAL NOT NULL,
            regime TEXT NOT NULL,
            deductions REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

// API Endpoints

// Transactions
app.get('/api/transactions', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/transactions', (req, res) => {
    const { date, description, amount, category, type } = req.body;
    db.run(
        'INSERT INTO transactions (date, description, amount, category, type) VALUES (?, ?, ?, ?, ?)',
        [date, description, amount, category, type],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Investments
app.get('/api/investments', (req, res) => {
    db.all('SELECT * FROM investments ORDER BY date_invested DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/investments', (req, res) => {
    const { name, type, amount_invested, current_value, date_invested } = req.body;
    db.run(
        'INSERT INTO investments (name, type, amount_invested, current_value, date_invested) VALUES (?, ?, ?, ?, ?)',
        [name, type, amount_invested, current_value, date_invested],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Budgets
app.get('/api/budgets', (req, res) => {
    const { month, year } = req.query;
    db.all(
        'SELECT * FROM budgets WHERE month = ? AND year = ?',
        [month, year],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

app.post('/api/budgets', (req, res) => {
    const { category, amount, month, year } = req.body;
    db.run(
        'INSERT OR REPLACE INTO budgets (category, amount, month, year) VALUES (?, ?, ?, ?)',
        [category, amount, month, year],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Tax Records
app.get('/api/tax-records', (req, res) => {
    db.all('SELECT * FROM tax_records ORDER BY financial_year DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/tax-records', (req, res) => {
    const { financial_year, gross_income, taxable_income, tax_paid, regime, deductions } = req.body;
    db.run(
        'INSERT INTO tax_records (financial_year, gross_income, taxable_income, tax_paid, regime, deductions) VALUES (?, ?, ?, ?, ?, ?)',
        [financial_year, gross_income, taxable_income, tax_paid, regime, deductions],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        }
    );
});

// Dashboard Summary
app.get('/api/dashboard-summary', (req, res) => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    db.get(`
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance,
            COALESCE(SUM(CASE WHEN type = 'expense' AND strftime('%m', date) = strftime('%m', 'now') THEN amount ELSE 0 END), 0) as monthly_expenses
        FROM transactions
    `, [], (err, balanceRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.get('SELECT COALESCE(SUM(current_value), 0) as total_investments FROM investments', [], (err, investmentRow) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({
                current_balance: balanceRow.current_balance,
                monthly_expenses: Math.abs(balanceRow.monthly_expenses),
                total_investments: investmentRow.total_investments
            });
        });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 