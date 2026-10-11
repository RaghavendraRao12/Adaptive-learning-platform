const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authroutes');
const quizRoutes = require('./routes/quizroutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});