const test = require('node:test');
const assert = require('node:assert/strict');
const {
    Filter, FilterError, FilterHandler, LanguageManager,
    EmailFilter, PasswordFilter, UsernameFilter, MimeTypeFilter, FileSignatureFilter
} = require('../filters');

test('Filter es abstracta', () => {
    assert.throws(() => new Filter('x', 'k'), TypeError);
});

test('EmailFilter reconoce el formato de email', () => {
    const f = new EmailFilter();
    for (const ok of ['a@b.com', 'ana.perez+lib@uni.edu.ar', 'admin@biblioteca.local']) assert.equal(f.evaluate(ok), true, ok);
    for (const bad of ['', 'sin-arroba', 'a@b', 'a b@c.com', '@c.com', 'a@.com', null, 42, {}]) assert.equal(f.evaluate(bad), false, String(bad));
    assert.equal(f.evaluate('a'.repeat(250) + '@b.com'), false); // más de 254 caracteres
});

test('validate() lanza FilterError con la clave del mensaje y el campo', () => {
    assert.doesNotThrow(() => new EmailFilter().validate('a@b.com'));
    assert.throws(() => new EmailFilter().validate('nope'), (e) =>
        e instanceof FilterError && e.messageKey === 'email.invalid' && e.field === 'email');
});

test('PasswordFilter exige largo, mayúscula, minúscula y número', () => {
    const f = new PasswordFilter();
    assert.equal(f.evaluate('Clave1234'), true);
    for (const bad of ['corta1A', 'sinmayuscula1', 'SINMINUSCULA1', 'SinNumeros', '', undefined, 12345678]) assert.equal(f.evaluate(bad), false, String(bad));
    assert.equal(f.evaluate('Aa1' + 'x'.repeat(70)), false); // 73 bytes: BCrypt los ignoraría
    assert.equal(f.evaluate('Aa1' + 'x'.repeat(69)), true);  // 72 bytes
});

test('UsernameFilter acepta 3-30 caracteres seguros', () => {
    const f = new UsernameFilter();
    assert.equal(f.evaluate('ana_perez-1.0'), true);
    for (const bad of ['ab', 'a'.repeat(31), 'con espacio', '<script>', 'ñandú']) assert.equal(f.evaluate(bad), false, bad);
});

test('MimeTypeFilter acepta documentos y rechaza ejecutables', () => {
    const f = new MimeTypeFilter();
    assert.equal(f.evaluate('application/pdf'), true);
    assert.equal(f.evaluate('text/plain'), true);
    for (const bad of ['text/html', 'application/x-msdownload', 'application/octet-stream', undefined]) assert.equal(f.evaluate(bad), false, String(bad));
});

test('FileSignatureFilter verifica el contenido real contra el MIME declarado', () => {
    assert.equal(new FileSignatureFilter('application/pdf').evaluate(Buffer.from('%PDF-1.7 ...')), true);
    assert.equal(new FileSignatureFilter('application/pdf').evaluate(Buffer.from('MZ\x90\x00 ejecutable')), false);
    assert.equal(new FileSignatureFilter('image/png').evaluate(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0])), true);
    assert.equal(new FileSignatureFilter('image/jpeg').evaluate(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])), true);
    // un PNG que dice ser PDF
    assert.equal(new FileSignatureFilter('application/pdf').evaluate(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), false);
    // docx = zip
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    assert.equal(new FileSignatureFilter(docx).evaluate(Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14])), true);
    // texto: sin bytes nulos
    assert.equal(new FileSignatureFilter('text/plain').evaluate(Buffer.from('hola mundo')), true);
    assert.equal(new FileSignatureFilter('text/plain').evaluate(Buffer.from([0x68, 0x00, 0x6f])), false);
    // vacío y MIME desconocido
    assert.equal(new FileSignatureFilter('application/pdf').evaluate(Buffer.alloc(0)), false);
    assert.equal(new FileSignatureFilter('video/mp4').evaluate(Buffer.from('....')), false);
});

test('LanguageManager: idioma por defecto, cambio y fallbacks', () => {
    const lm = new LanguageManager();
    assert.equal(lm.getLanguage(), 'es');
    assert.match(lm.getThisMessage('email.invalid'), /email/i);

    lm.setLanguage('en-US');
    assert.equal(lm.getLanguage(), 'en');
    assert.match(lm.getThisMessage('email.invalid'), /not valid/);

    assert.equal(lm.getThisMessage('clave.inexistente'), 'clave.inexistente');
    assert.throws(() => lm.setLanguage('fr'), RangeError);
    assert.equal(lm.getLanguage(), 'en'); // un intento fallido no cambia el idioma
});

test('LanguageManager.fromAcceptLanguage elige el mejor idioma soportado', () => {
    assert.equal(LanguageManager.fromAcceptLanguage('en-US,en;q=0.9,es;q=0.8'), 'en');
    assert.equal(LanguageManager.fromAcceptLanguage('fr-FR,fr;q=0.9,es;q=0.5'), 'es');
    assert.equal(LanguageManager.fromAcceptLanguage('es;q=0.2,en;q=0.9'), 'en');
    assert.equal(LanguageManager.fromAcceptLanguage('fr'), 'es'); // ninguno soportado -> por defecto
    assert.equal(LanguageManager.fromAcceptLanguage(undefined), 'es');
});

test('FilterHandler junta los errores traducidos y se puede encadenar', () => {
    const handler = new FilterHandler('en').with(new UsernameFilter()).with(new EmailFilter()).with(new PasswordFilter());

    const ok = handler.filterThis({ username: 'ana', email: 'ana@uni.edu', password: 'Clave1234' });
    assert.deepEqual(ok, { valid: true, errors: [] });

    const bad = handler.filterThis({ username: 'a', email: 'x', password: 'debil' });
    assert.equal(bad.valid, false);
    assert.deepEqual(bad.errors.map(e => e.field), ['username', 'email', 'password']);
    assert.match(bad.errors[1].message, /not valid/); // inglés

    // objeto vacío o nulo: cada campo falta, no hay excepciones
    assert.equal(handler.filterThis({}).errors.length, 3);
    assert.equal(handler.filterThis(null).errors.length, 3);

    // filterObject aplica un único filtro
    const single = new FilterHandler('es').filterObject({ email: 'x' }, new EmailFilter());
    assert.equal(single.valid, false);
    assert.match(single.errors[0].message, /formato/);

    assert.throws(() => handler.with({ evaluate() {} }), TypeError);
});
