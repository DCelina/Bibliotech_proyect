/**
 * Filter (antes "Validation"): detecta si un valor cumple o no un patrón.
 *
 *  - evaluate(value): boolean -> solo responde sí/no. No lanza errores.
 *  - validate(value): void    -> lanza FilterError si evaluate() da false.
 *
 * Un Filter NO aplica reglas de negocio (eso es responsabilidad de los
 * controladores): solo reconoce formatos como un email o una contraseña.
 *
 * Cada filtro conoce el nombre del campo que filtra (field) para que
 * FilterHandler pueda aplicarlo sobre un objeto completo (por ejemplo req.body).
 */
class FilterError extends Error {
    constructor(messageKey, field) {
        super(messageKey);
        this.name = 'FilterError';
        this.messageKey = messageKey; // clave que LanguageManager traduce
        this.field = field;
    }
}

class Filter {
    constructor(field, messageKey) {
        if (new.target === Filter) throw new TypeError('Filter es abstracta: usar una subclase.');
        this.field = field;
        this.messageKey = messageKey;
    }

    /** @returns {boolean} true si el valor cumple el patrón */
    evaluate(value) {
        throw new Error('evaluate() debe implementarse en la subclase');
    }

    /** @throws {FilterError} si el valor no cumple el patrón */
    validate(value) {
        if (!this.evaluate(value)) throw new FilterError(this.messageKey, this.field);
    }
}

module.exports = { Filter, FilterError };
