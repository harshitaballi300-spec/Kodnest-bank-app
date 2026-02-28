const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'kodnest_super_secret_key_2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files - fallback for local development
app.use(express.static(path.join(__dirname)));

const dbPath = process.env.VERCEL ? ':memory:' : './banking_app.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
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

const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Access denied.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

app.post('/api/register', async (req, res) => {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) return res.status(400).json({ error: 'Missing fields.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)`, [fullname, email, hashedPassword], function (err) {
            if (err) return res.status(400).json({ error: 'Email exists or DB error.' });
            const token = jwt.sign({ id: this.lastID, email, fullname }, SECRET_KEY, { expiresIn: '1h' });
            res.cookie('auth_token', token, { httpOnly: false, secure: true, sameSite: 'None', maxAge: 3600000 });
            res.json({ message: 'Success', token, fullname });
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error.' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found.' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid.' });
        const token = jwt.sign({ id: user.id, email: user.email, fullname: user.fullname }, SECRET_KEY, { expiresIn: '1h' });
        res.cookie('auth_token', token, { httpOnly: false, secure: true, sameSite: 'None', maxAge: 3600000 });
        res.json({ message: 'Success', token, fullname: user.fullname });
    });
});

app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out' });
});

// Fallback HTML routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.listen(PORT, () => console.log(`Server on ${PORT}`));

module.exports = app;
