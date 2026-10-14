const LanguageManager = require('../filters/LanguageManager');

// Deja en req.lang el idioma elegido por el navegador (Accept-Language) entre los soportados
module.exports = function languageMiddleware(req, res, next)
{
    req.lang = LanguageManager.fromAcceptLanguage(req.headers['accept-language']);
    next();
};
