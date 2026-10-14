/**
 * Rutas amigables que entregan las páginas HTML del frontend.
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { FRONTEND_DIR } = require('../config/paths');

const page = (name) => (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'html', name));

router.get('/', page('library.html'));
router.get('/library', page('library.html'));
router.get('/login', page('login.html'));
router.get('/register', page('register.html'));
router.get('/professor-dashboard', page('professor-dashboard.html'));
router.get('/admin-dashboard', page('admin-dashboard.html'));

// Cualquier otra ruta: 404 seco si pide un archivo, o el catálogo si es navegación
router.use((req, res) => {
    if (req.path.includes('.')) return res.status(404).send('Recurso no encontrado');
    res.status(404).sendFile(path.join(FRONTEND_DIR, 'html', 'library.html'));
});

module.exports = router;
