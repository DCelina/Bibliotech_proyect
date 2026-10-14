const { Filter } = require('./Filter');

// Formato práctico: usuario@dominio.tld (sin espacios, con al menos un punto en el dominio)
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

class EmailFilter extends Filter {
    constructor(field = 'email') {
        super(field, 'email.invalid');
    }

    evaluate(value) {
        return typeof value === 'string' && value.length <= 254 && EMAIL_REGEX.test(value);
    }
}

module.exports = EmailFilter;
