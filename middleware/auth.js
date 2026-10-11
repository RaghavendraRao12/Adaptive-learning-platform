const jwt = require('jsonwebtoken');

// Use a secure secret key (store this in an environment variable in production)
const JWT_SECRET = 'your_jwt_secret_key_here';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Attaches user payload (user_id, email) to the request
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = verifyToken;