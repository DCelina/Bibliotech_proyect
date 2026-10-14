const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Todo lo de /api/admin exige sesión y rol admin
router.use(verifyToken, isAdmin);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', adminController.updateRole);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
