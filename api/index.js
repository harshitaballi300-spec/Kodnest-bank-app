const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const SECRET_KEY = 'kodnest_super_secret_key_2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- SQLite (uses /tmp on Vercel, a writable directory) ---
let db;
try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = '/tmp/banking_app.db';
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('DB connection error:', err.message);
        } else {
            db.serialize(() => {
                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fullname TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL
                )`);
            });
        }
    });
} catch (e) {
    console.error('sqlite3 module not available:', e.message);
}

// --- Middleware to check auth ---
const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// --- REGISTER ---
app.post('/api/register', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not available.' });
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) return res.status(400).json({ error: 'Missing fields.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            `INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)`,
            [fullname, email, hashedPassword],
            function (err) {
                if (err) return res.status(400).json({ error: 'Email already registered.' });
                res.json({ message: 'Account created successfully. Please login.', fullname });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// --- LOGIN ---
app.post('/api/login', (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not available.' });
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found.' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

        const token = jwt.sign(
            { id: user.id, email: user.email, fullname: user.fullname },
            SECRET_KEY,
            { expiresIn: '1h' }
        );
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 3600000
        });
        res.json({ message: 'Login successful.', fullname: user.fullname });
    });
});

// --- VERIFY TOKEN ---
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user, message: 'Valid token.' });
});

// --- LOGOUT ---
app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully.' });
});

module.exports = app;
