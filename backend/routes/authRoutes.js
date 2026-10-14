const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register  { username, email, password }
router.post('/register', authController.register);

// POST /api/auth/login     { email, password }
router.post('/login', authController.login);

module.exports = router;
