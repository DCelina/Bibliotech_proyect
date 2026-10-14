const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const uploadMiddleware = require('../config/multerConfig');
const { verifyToken, readAccess, canUpload } = require('../middleware/authMiddleware');

// --- Lectura: pública o con cualquier rol, según PUBLIC_ACCESS ---
router.get('/', readAccess, materialController.list);
router.get('/subjects', readAccess, materialController.subjects);

// --- Professor y Admin ---
// (va antes de '/:id' para que "mine" no se interprete como un id)
router.get('/mine', verifyToken, canUpload, materialController.mine);
router.post('/', verifyToken, canUpload, uploadMiddleware, materialController.upload);

// --- Lectura de un material ---
router.get('/:id', readAccess, materialController.getOne);
router.get('/:id/download', readAccess, materialController.download);

// --- Borrado: el controlador exige ser el dueño o Admin ---
router.delete('/:id', verifyToken, canUpload, materialController.remove);

module.exports = router;
