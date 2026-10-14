/**
 * Utilidades para el sistema de archivos. Todo se resuelve dentro de UPLOAD_DIR
 * y solo con el NOMBRE del archivo (path.basename), así que una ruta manipulada
 * no puede salir de esa carpeta.
 */
const fs = require('fs/promises');
const path = require('path');
const { UPLOAD_DIR } = require('../config/paths');

const fileHelper = {
    /** Ruta absoluta de un archivo guardado a partir de su stored_name. */
    resolve(storedName) {
        return path.join(UPLOAD_DIR, path.basename(String(storedName)));
    },

    /** Borra un archivo del disco. Devuelve true si lo borró, false si no existía o falló. */
    async deleteFile(storedName) {
        if (!storedName) return false;
        try {
            await fs.unlink(this.resolve(storedName));
            return true;
        } catch (err) {
            if (err.code !== 'ENOENT') console.error(`No se pudo borrar ${storedName}: ${err.message}`);
            return false;
        }
    },

    /** Lee solo los primeros bytes de un archivo (suficiente para reconocer su firma). */
    async readHead(storedName, bytes = 512) {
        const handle = await fs.open(this.resolve(storedName), 'r');
        try {
            const buffer = Buffer.alloc(bytes);
            const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
            return buffer.subarray(0, bytesRead);
        } finally {
            await handle.close();
        }
    }
};

module.exports = fileHelper;
