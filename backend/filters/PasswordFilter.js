const { Filter } = require('./Filter');

/**
 * Contraseña aceptable: 8 a 72 bytes, con al menos una minúscula, una mayúscula y un número.
 * El máximo es 72 BYTES porque BCrypt ignora todo lo que exceda ese largo.
 */
class PasswordFilter extends Filter {
    constructor(field = 'password') {
        super(field, 'password.weak');
    }

    evaluate(value) {
        if (typeof value !== 'string') return false;
        const bytes = Buffer.byteLength(value, 'utf8');
        return bytes >= 8 && bytes <= 72
            && /[a-z]/.test(value)
            && /[A-Z]/.test(value)
            && /[0-9]/.test(value);
    }
}

module.exports = PasswordFilter;
