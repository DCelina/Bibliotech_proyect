const { Filter } = require('./Filter');
const { FILE_TYPES } = require('./fileTypes');

/** Acepta solo los tipos MIME declarados por el navegador que la biblioteca admite. */
class MimeTypeFilter extends Filter {
    constructor(field = 'mimetype', allowed = Object.keys(FILE_TYPES)) {
        super(field, 'mime.notAllowed');
        this.allowed = new Set(allowed);
    }

    evaluate(value) {
        return typeof value === 'string' && this.allowed.has(value);
    }
}

module.exports = MimeTypeFilter;
