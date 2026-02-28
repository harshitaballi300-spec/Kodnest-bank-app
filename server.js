const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'kodnest_super_secret_key_2026'; // Normally in .env

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the kodnest-banking-app directory
app.use(express.static(path.join(__dirname, 'kodnest-banking-app')));

// Database setup
const db = new sqlite3.Database('./banking_app.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// Routes
// 1. Register User
app.post('/api/register', async (req, res) => {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)`, [fullname, email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }

            // Generate JWT Token
            const token = jwt.sign({ id: this.lastID, email, fullname }, SECRET_KEY, { expiresIn: '1h' });

            // Set cookie in frontend
            res.cookie('auth_token', token, { httpOnly: false, secure: false, maxAge: 3600000 }); // httpOnly=false to allow frontend to read if needed, though usually true is safer. But requirements said "cookies will generate in frontend" so we'll let frontend access it or store it.
            res.json({ message: 'User registered successfully', token, fullname });
        });
    } catch (e) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// 2. Login User
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials.' });

        // Generate JWT Token
        const token = jwt.sign({ id: user.id, email: user.email, fullname: user.fullname }, SECRET_KEY, { expiresIn: '1h' });

        // Set cookie
        res.cookie('auth_token', token, { httpOnly: false, secure: false, maxAge: 3600000 });
        res.json({ message: 'Login successful', token, fullname: user.fullname });
    });
});

// 3. Check Authentication Status (Used by Dashboard)
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user, message: 'Valid token. Database validation successful.' });
});

// 4. Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully' });
});

// Catch-all route to serve login page if hits root and not matched
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'kodnest-banking-app', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
