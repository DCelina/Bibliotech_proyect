/** Convierte un parámetro de ruta en un id entero positivo, o null si no es válido. */
module.exports = function parseId(value) {
    return /^\d{1,10}$/.test(String(value)) && Number(value) > 0 ? Number(value) : null;
};
