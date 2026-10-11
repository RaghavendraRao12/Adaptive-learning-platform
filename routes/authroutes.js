const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = 'your_jwt_secret_key_here';

// Register Route (Stores plain text password)
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const query = 'INSERT INTO Users (name, email, password_hash) VALUES (?, ?, ?)';
        await db.query(query, [name, email, password]);

        res.status(201).json({ success: true, message: 'User registered successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Email already exists or database error.' });
    }
});

// Login Route (Compares plain text passwords directly)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(0 || 400).json({ error: 'Invalid email or password.' });
        }

        const user = rows[0];
        
        // Direct string comparison instead of bcrypt
        if (password !== user.password_hash) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }

        // Create a JWT token valid for 2 hours
        const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });

        res.json({
            success: true,
            token,
            user: { id: user.user_id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;