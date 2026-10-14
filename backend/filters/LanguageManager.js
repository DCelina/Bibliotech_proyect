/**
 * LanguageManager: entrega los mensajes de los filtros en el idioma pedido.
 * Los textos viven en backend/locales/<idioma>.json (es, en, ...). Para agregar
 * un idioma alcanza con sumar un archivo JSON nuevo.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const DEFAULT_LANGUAGE = 'es';

// Los archivos se leen una sola vez y se comparten entre todas las instancias
let localesCache = null;

class LanguageManager {
    constructor(lang = DEFAULT_LANGUAGE) {
        this._locales = {};
        this._language = DEFAULT_LANGUAGE;
        this._loadLocales();
        this.setLanguage(lang);
    }

    /** Privado (por convención): carga los JSON de la carpeta locales. */
    _loadLocales() {
        if (!localesCache) {
            localesCache = {};
            for (const file of fs.readdirSync(LOCALES_DIR)) {
                if (path.extname(file) !== '.json') continue;
                const code = path.basename(file, '.json');
                localesCache[code] = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
            }
        }
        this._locales = localesCache;
    }

    /** Acepta 'es', 'en', 'es-AR', 'en_US'... @throws {RangeError} si el idioma no existe. */
    setLanguage(lang) {
        const code = String(lang ?? '').toLowerCase().split(/[-_]/)[0];
        if (!this._locales[code]) throw new RangeError(`Idioma no soportado: ${lang}`);
        this._language = code;
    }

    getLanguage() {
        return this._language;
    }

    /** Mensaje en el idioma actual; si falta, en el idioma por defecto; si falta, la propia clave. */
    getThisMessage(messageName) {
        return this._locales[this._language][messageName]
            ?? this._locales[DEFAULT_LANGUAGE][messageName]
            ?? messageName;
    }

    /** Elige el mejor idioma soportado a partir del header Accept-Language. */
    static fromAcceptLanguage(header) {
        if (!localesCache) new LanguageManager(); // fuerza la carga
        const candidates = String(header ?? '')
            .split(',')
            .map(part => {
                const [tag, q] = part.trim().split(';q=');
                return { code: tag.toLowerCase().split(/[-_]/)[0], q: q === undefined ? 1 : Number(q) || 0 };
            })
            .filter(c => c.code)
            .sort((a, b) => b.q - a.q);
        const match = candidates.find(c => localesCache[c.code]);
        return match ? match.code : DEFAULT_LANGUAGE;
    }
}

module.exports = LanguageManager;
