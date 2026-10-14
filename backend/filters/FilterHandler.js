/**
 * FilterHandler: aplica uno o varios Filter sobre un objeto (por ejemplo req.body)
 * y devuelve los mensajes de error ya traducidos.
 *
 *   const handler = new FilterHandler('es').with(new EmailFilter()).with(new PasswordFilter());
 *   const { valid, errors } = handler.filterThis(req.body);
 *
 * Composición: el FilterHandler crea y es dueño de su LanguageManager.
 */
const { Filter } = require('./Filter');
const LanguageManager = require('./LanguageManager');

class FilterHandler {
    constructor(lang) {
        this._filters = [];
        this._languageManager = new LanguageManager(lang);
    }

    /** Registra un filtro. Devuelve this para poder encadenar. */
    with(filter) {
        if (!(filter instanceof Filter)) throw new TypeError('with() espera una instancia de Filter');
        this._filters.push(filter);
        return this;
    }

    /** Aplica UN filtro sobre el campo que le corresponde de target. */
    filterObject(target, filter) {
        const value = target == null ? undefined : target[filter.field];
        if (filter.evaluate(value)) return { valid: true, errors: [] };
        return {
            valid: false,
            errors: [{ field: filter.field, message: this._languageManager.getThisMessage(filter.messageKey) }]
        };
    }

    /** Aplica TODOS los filtros registrados y junta los errores. */
    filterThis(target) {
        const errors = this._filters.flatMap(filter => this.filterObject(target, filter).errors);
        return { valid: errors.length === 0, errors };
    }
}

module.exports = FilterHandler;
