/**
 * Construye la aplicación Express (sin ponerla a escuchar, para poder probarla).
 */
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');

const { UPLOAD_DIR, FRONTEND_DIR } = require('./config/paths');
const languageMiddleware = require('./middleware/languageMiddleware');
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const viewRoutes = require('./routes/viewRoutes');

function createApp()
{
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const app = express();
    app.disable('x-powered-by');

    // CORS solo si el frontend se sirve desde otro origen (variable CORS_ORIGIN)
    if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(o => o.trim()) }));

    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: false }));
    app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });
    app.use(languageMiddleware);

    // --- API ---
    // Le dice al frontend si el catálogo es público
    app.get('/api/config', (req, res) => res.json({ publicAccess: process.env.PUBLIC_ACCESS === 'true' }));
    app.use('/api/auth', authRoutes);
    app.use('/api/materials', materialRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta de API inexistente.' }));

    // --- Frontend (los archivos subidos NO se sirven como estáticos: se descargan por la API con control de acceso) ---
    app.use(express.static(FRONTEND_DIR));
    app.use('/', viewRoutes);

    // --- Manejo de errores global ---
    app.use((err, req, res, next) => {
        if (res.headersSent) return next(err);

        if (err instanceof multer.MulterError)
        {
            if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'El archivo supera el tamaño máximo permitido.' });
            return res.status(400).json({ message: 'Error al recibir el archivo (usar un solo campo llamado "file").' });
        }
        if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'El cuerpo del pedido no es un JSON válido.' });
        if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });

        console.error(err.stack || err.message);
        res.status(500).json({ message: 'Error en el servidor.' }); // sin detalles internos
    });

    return app;
}

module.exports = createApp;
