/**
 * Rutas absolutas del proyecto. Se calculan con __dirname (y no con process.cwd())
 * para que el servidor funcione sin importar desde qué carpeta se lo arranque.
 */
const path = require('path');

module.exports = {
    UPLOAD_DIR: process.env.UPLOAD_DIR
        ? path.resolve(process.env.UPLOAD_DIR)
        : path.join(__dirname, '..', 'uploads'),
    FRONTEND_DIR: path.join(__dirname, '..', '..', 'frontend')
};
