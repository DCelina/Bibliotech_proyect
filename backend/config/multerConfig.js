/**
 * Multer: middleware de Express para recibir archivos (multipart/form-data).
 *  - El nombre en disco lo genera el servidor (UUID + extensión según el MIME):
 *    nunca se usa el nombre que manda el cliente.
 *  - Solo pasan los tipos MIME permitidos (MimeTypeFilter) y hasta MAX_UPLOAD_MB.
 *  - La firma real del archivo se verifica después, en el controlador.
 */
const multer = require('multer');
const crypto = require('crypto');
const { UPLOAD_DIR } = require('./paths');
const { MimeTypeFilter, FILE_TYPES } = require('../filters');

const mimeFilter = new MimeTypeFilter();
const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 20) * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + (FILE_TYPES[file.mimetype]?.ext ?? ''))
});

const fileFilter = (req, file, cb) => {
    if (mimeFilter.evaluate(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('El tipo de archivo no está permitido.'), { status: 415 }), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    defParamCharset: 'utf8' // nombres con tildes y ñ
});

// 'file' es el nombre del campo en el FormData del frontend
module.exports = upload.single('file');
