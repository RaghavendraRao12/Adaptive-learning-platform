const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Resource mapping helper for actual external links based on Topic ID and Performance Tier
function getTopicResources(topicId, tier) {
    const resourceMap = {
        1: { // Database Normalization
            Remedial: '<a href="https://www.geeksforgeeks.org/dbms/what-is-data-normalization-and-why-is-it-important/" target="_blank">GeeksforGeeks: Basics of DBMS Normalization</a>',
            Intermediate: '<a href="https://www.w3schools.com/sql/sql_intro.asp" target="_blank">W3Schools: Database Design & Normalization Rules</a>',
            Advanced: '<a href="https://www.geeksforgeeks.org/boyce-codd-normal-form-bcnf-in-dbms/" target="_blank">GeeksforGeeks: BCNF and Higher Normal Forms (4NF, 5NF)</a>'
        },
        2: { // SQL Queries & Joins
            Remedial: '<a href="https://www.w3schools.com/sql/sql_join.asp" target="_blank">W3Schools: Visual Guide to SQL Joins</a>',
            Intermediate: '<a href="https://www.geeksforgeeks.org/sql-join-set-1-inner-left-right-and-full-joins/" target="_blank">GeeksforGeeks: Comprehensive SQL Queries & Group By</a>',
            Advanced: '<a href="https://mode.com/sql-tutorial/sql-subqueries/" target="_blank">Mode SQL Tutorial: Advanced Subqueries & Window Functions</a>'
        },
        3: { // RESTful API Design
            Remedial: '<a href="https://developer.mozilla.org/en-US/docs/Glossary/REST" target="_blank">MDN Web Docs: REST Architecture Fundamentals</a>',
            Intermediate: '<a href="https://restfulapi.net/" target="_blank">RESTfulAPI.net: HTTP Methods, Status Codes & Best Practices</a>',
            Advanced: '<a href="https://restfulapi.net/hateoas/" target="_blank">RESTfulAPI.net: HATEOAS & Microservice API Standards</a>'
        },
        4: { // Express.js Middleware
            Remedial: '<a href="https://expressjs.com/en/starter/basic-routing.html" target="_blank">Express.js Docs: Routing & Basic Usage</a>',
            Intermediate: '<a href="https://expressjs.com/en/guide/using-middleware.html" target="_blank">Express.js Official Guide: Writing & Using Middleware</a>',
            Advanced: '<a href="https://expressjs.com/en/guide/error-handling.html" target="_blank">Express.js Official Guide: Advanced Error Handling & Async Patterns</a>'
        },
        5: { // Arrays & Linked Lists
            Remedial: '<a href="https://www.freecodecamp.org/news/data-structures-101-arrays-a-beginners-guide/" target="_blank">FreeCodeCamp: Beginner Guide to Arrays & Pointers</a>',
            Intermediate: '<a href="https://www.geeksforgeeks.org/singly-linked-list-tutorial/" target="_blank">GeeksforGeeks: Singly & Doubly Linked List Operations</a>',
            Advanced: '<a href="https://leetcode.com/explore/learn/card/linked-list/" target="_blank">LeetCode Explore: Advanced Two-Pointer Techniques & Cycle Detection</a>'
        },
        6: { // Binary Search Trees
            Remedial: '<a href="https://www.geeksforgeeks.org/binary-tree-data-structure/" target="_blank">GeeksforGeeks: Introduction to Trees & Binary Trees</a>',
            Intermediate: '<a href="https://www.geeksforgeeks.org/binary-search-tree-data-structure/" target="_blank">GeeksforGeeks: BST Traversals & Insertion Rules</a>',
            Advanced: '<a href="https://www.geeksforgeeks.org/avl-tree-set-1-insertion/" target="_blank">GeeksforGeeks: Self-Balancing Trees (AVL & Red-Black Trees)</a>'
        }
    };

    const topicResources = resourceMap[topicId] || {
        Remedial: '<a href="https://www.geeksforgeeks.org/" target="_blank">GeeksforGeeks General CS Tutorials</a>',
        Intermediate: '<a href="https://developer.mozilla.org/" target="_blank">MDN Web Docs</a>',
        Advanced: '<a href="https://leetcode.com/" target="_blank">LeetCode Problem Solving</a>'
    };

    return topicResources[tier] || topicResources.Intermediate;
}

// 1. Get distinct subjects for dropdown selection
router.get('/subjects', async (req, res) => {
    try {
        const [subjects] = await db.query('SELECT DISTINCT subject_name FROM Topics');
        res.json({ success: true, subjects: subjects.map(s => s.subject_name) });
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ error: 'Error fetching subjects.' });
    }
});

// 2. Get topics filtered by selected subject name
router.get('/topics/:subjectName', async (req, res) => {
    const { subjectName } = req.params;
    try {
        const [topics] = await db.query('SELECT * FROM Topics WHERE subject_name = ?', [subjectName]);
        res.json({ success: true, topics });
    } catch (err) {
        console.error('Error fetching topics:', err);
        res.status(500).json({ error: 'Error fetching topics.' });
    }
});

// 3. Get adaptive questions for a specific topic and user tier (Strictly limited to 10 questions)
router.get('/questions/:topicId/:userId', async (req, res) => {
    const { topicId, userId } = req.params;
    try {
        // Check user's previous tier for this topic
        const [perfRows] = await db.query(
            'SELECT current_tier FROM Performance WHERE user_id = ? AND topic_id = ? ORDER BY performance_id DESC LIMIT 1',
            [userId, topicId]
        );

        let targetDifficulty = 'Easy'; // First-time users default to Easy

        if (perfRows.length > 0) {
            const tier = perfRows[0].current_tier;
            if (tier === 'Remedial') targetDifficulty = 'Easy';
            else if (tier === 'Intermediate') targetDifficulty = 'Medium';
            else if (tier === 'Advanced') targetDifficulty = 'Hard';
        }

        // Fetch strictly 10 randomized questions matching the target difficulty tier
        const [questions] = await db.query(
            'SELECT * FROM Questions WHERE topic_id = ? AND difficulty_level = ? ORDER BY RAND() LIMIT 10',
            [topicId, targetDifficulty]
        );

        let finalQuestions = questions;
        if (finalQuestions.length === 0) {
            // Fallback if specific tier has fewer than 10 questions
            const [fallback] = await db.query('SELECT * FROM Questions WHERE topic_id = ? ORDER BY RAND() LIMIT 10', [topicId]);
            finalQuestions = fallback;
        }

        res.json({ success: true, difficulty: targetDifficulty, questions: finalQuestions });
    } catch (err) {
        console.error('Error fetching adaptive questions:', err);
        res.status(500).json({ error: 'Error fetching questions.' });
    }
});

// 4. Get overall aggregate statistics for a user
router.get('/overall/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) as total_quizzes, AVG(accuracy_pct) as avg_accuracy 
            FROM Performance WHERE user_id = ?
        `, [userId]);
        
        res.json({ 
            success: true, 
            totalQuizzes: rows[0].total_quizzes || 0,
            avgAccuracy: rows[0].avg_accuracy ? Math.round(rows[0].avg_accuracy) : 0
        });
    } catch (err) {
        console.error('Error fetching overall performance:', err);
        res.status(500).json({ error: 'Server error fetching overall performance.' });
    }
});

// 5. Get complete quiz history for a user with actual timestamps and links
router.get('/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT p.*, t.subject_name, t.topic_name 
            FROM Performance p
            JOIN Topics t ON p.topic_id = t.topic_id
            WHERE p.user_id = ?
            ORDER BY p.performance_id DESC
        `;
        const [rows] = await db.query(query, [userId]);
        
        if (rows.length === 0) {
            return res.json({ success: false, message: 'No quiz history found.' });
        }

        const history = rows.map(item => {
            let recommendationText = 'Good effort! Focus on reviewing standard study resources to improve your accuracy.';
            if (item.current_tier === 'Advanced') {
                recommendationText = 'Outstanding work! You have mastered the basics and are ready for advanced concepts.';
            } else if (item.current_tier === 'Remedial') {
                recommendationText = 'We recommend taking a quick moment to review the fundamentals below before your next attempt.';
            }

            const learningMaterial = getTopicResources(item.topic_id, item.current_tier);
            const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString() : new Date().toLocaleString();

            return {
                subject: item.subject_name,
                topic: item.topic_name,
                accuracy: item.accuracy_pct,
                tier: item.current_tier,
                date: formattedDate,
                recommendation: recommendationText,
                material: learningMaterial
            };
        });

        res.json({ success: true, history });
    } catch (err) {
        console.error('Error fetching quiz history:', err);
        res.status(500).json({ error: 'Server error fetching quiz history.' });
    }
});

// 6. Submit quiz and evaluate result
router.post('/evaluate', async (req, res) => {
    const { userId, topicId, scorePercentage } = req.body;

    let currentTier = 'Intermediate';
    let actionRecommendation = 'Good effort! Focus on reviewing standard study resources to improve your accuracy.';

    if (scorePercentage > 80) {
        currentTier = 'Advanced';
        actionRecommendation = 'Outstanding work! You have mastered the basics and are ready for advanced concepts.';
    } else if (scorePercentage < 50) {
        currentTier = 'Remedial';
        actionRecommendation = 'We recommend taking a quick moment to review the fundamentals below before your next attempt.';
    }

    const learningMaterial = getTopicResources(topicId, currentTier);

    try {
        const query = `
            INSERT INTO Performance (user_id, topic_id, accuracy_pct, current_tier, timestamp)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE accuracy_pct = ?, current_tier = ?, timestamp = NOW()
        `;
        await db.query(query, [userId, topicId, scorePercentage, currentTier, scorePercentage, currentTier]);

        res.json({ 
            success: true, 
            tier: currentTier, 
            recommendation: actionRecommendation,
            material: learningMaterial
        });
    } catch (err) {
        console.error('Error during adaptation evaluation:', err);
        res.status(500).json({ error: 'Server error during adaptation evaluation.' });
    }
});

module.exports = router;