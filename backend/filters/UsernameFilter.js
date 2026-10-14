const { Filter } = require('./Filter');

// 3 a 30 caracteres: letras, números, punto, guion y guion bajo
const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;

class UsernameFilter extends Filter {
    constructor(field = 'username') {
        super(field, 'username.invalid');
    }

    evaluate(value) {
        return typeof value === 'string' && USERNAME_REGEX.test(value);
    }
}

module.exports = UsernameFilter;
