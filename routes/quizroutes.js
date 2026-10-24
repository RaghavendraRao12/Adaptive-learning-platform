const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Points to your config/db.js file

// 1. Get all unique subjects from the topics table using subject_name
router.get('/subjects', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT subject_name FROM topics WHERE subject_name IS NOT NULL');
        const subjects = rows.map(r => ({ subject: r.subject_name }));
        res.json(subjects);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ error: 'Database error fetching subjects' });
    }
});

// 2. Get topics (optionally filtered by subject query parameter)
router.get('/topics', async (req, res) => {
    try {
        const { subject } = req.query;
        let query = 'SELECT *, subject_name AS subject FROM topics';
        let params = [];

        if (subject) {
            query += ' WHERE subject_name = ?';
            params.push(subject);
        }

        const [topics] = await db.query(query, params);
        res.json(topics);
    } catch (err) {
        console.error('Error fetching topics:', err);
        res.status(500).json({ error: 'Database error fetching topics' });
    }
});

// 3. Get adaptive questions strictly matching the target difficulty tier (10 questions per tier)
router.get('/questions/:topicId/:userId', async (req, res) => {
    const { topicId, userId } = req.params;

    try {
        const [performanceRows] = await db.query(
            `SELECT accuracy_pct FROM performance WHERE user_id = ? AND topic_id = ? ORDER BY timestamp DESC LIMIT 1`,
            [userId, topicId]
        );

        let targetDifficulty = 'Easy';
        let timerDuration = 300;

        if (performanceRows.length > 0) {
            const lastScore = Number(performanceRows[0].accuracy_pct) || 0;

            if (lastScore >= 75) {
                targetDifficulty = 'Hard';
                timerDuration = 60;
            } else if (lastScore >= 40) {
                targetDifficulty = 'Medium';
                timerDuration = 180;
            } else {
                targetDifficulty = 'Easy';
                timerDuration = 300;
            }
        }

        // Strictly fetch only the 10 questions for this topic and calculated difficulty level
        let [questions] = await db.query(
            `SELECT * FROM questions WHERE topic_id = ? AND difficulty_level = ?`,
            [topicId, targetDifficulty]
        );

        // Fallback only if no questions exist for that exact difficulty tier
        if (!questions || questions.length === 0) {
            const [fallbackQuestions] = await db.query(
                `SELECT * FROM questions WHERE topic_id = ? LIMIT 10`,
                [topicId]
            );
            questions = fallbackQuestions;
        }

        // Map database columns to match frontend expectations (correct_opt -> correct_answer)
        const formattedQuestions = questions.map(q => {
            let parsedOptions = q.options;
            if (typeof parsedOptions === 'string') {
                try {
                    parsedOptions = JSON.parse(parsedOptions);
                } catch (e) {
                    // keep as is if not valid JSON
                }
            }
            return {
                ...q,
                options: parsedOptions,
                correct_answer: q.correct_answer || q.correct_opt
            };
        });

        res.json({
            difficulty: targetDifficulty,
            timerDuration: timerDuration,
            questions: formattedQuestions
        });

    } catch (err) {
        console.error('Error fetching adaptive questions:', err);
        res.status(500).json({ error: 'Server error while fetching adaptive questions' });
    }
});

// 4. Save quiz performance results with safe tier mapping
router.post('/performance', async (req, res) => {
    const { userId, topicId, score, difficulty } = req.body;
    const accuracy = score !== undefined ? score : 0;
    
    // Normalize tier to ensure it fits safely
    let tier = String(difficulty || 'Easy').trim();
    if (tier.toLowerCase() === 'medium') tier = 'Medium';
    else if (tier.toLowerCase() === 'hard') tier = 'Hard';
    else tier = 'Easy';

    try {
        await db.query(
            `INSERT INTO performance (user_id, topic_id, accuracy_pct, current_tier, timestamp) VALUES (?, ?, ?, ?, NOW())`,
            [userId, topicId, accuracy, tier]
        );
        res.status(201).json({ message: 'Performance saved successfully' });
    } catch (err) {
        console.error('Error saving performance:', err);
        res.status(500).json({ error: 'Server error while saving performance' });
    }
});

// 5. Get overall user stats using accuracy_pct
router.get('/overall/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT COUNT(*) AS totalQuizzes, AVG(accuracy_pct) AS avgScore FROM performance WHERE user_id = ?`,
            [userId]
        );
        res.json({
            totalQuizzes: rows[0]?.totalQuizzes || 0,
            avgScore: Math.round(rows[0]?.avgScore || 0)
        });
    } catch (err) {
        console.error('Error fetching overall stats:', err);
        res.status(500).json({ error: 'Server error while fetching overall stats' });
    }
});

// 6. Get user performance history with correct SQL join using subject_name and topic_name
router.get('/history/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const [history] = await db.query(
            `SELECT p.*, 
                    t.topic_name, 
                    t.subject_name AS subject 
             FROM performance p 
             LEFT JOIN topics t ON p.topic_id = t.topic_id
             WHERE p.user_id = ? 
             ORDER BY p.timestamp DESC`,
            [userId]
        );
        res.json(history);
    } catch (err) {
        console.error('Error fetching user history:', err);
        res.status(500).json({ error: 'Server error while fetching performance history' });
    }
});

module.exports = router;