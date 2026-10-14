/**
 * Pruebas de integración HTTP: se levanta la app real (Express + JWT + Multer + filtros)
 * y se reemplazan solo los repositorios por versiones en memoria (no hace falta MariaDB).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcrypt');

// La configuración debe estar lista ANTES de cargar la app
process.env.JWT_SECRET = 'clave-de-prueba';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'biblioteca-'));
process.env.PUBLIC_ACCESS = 'false';

const createApp = require('../app');
const userRepo = require('../repositories/userRepo');
const materialRepo = require('../repositories/materialRepo');

// ---------- repositorios en memoria ----------
const users = [];
const materials = [];
let nextUserId = 1, nextMaterialId = 1;

userRepo.findByEmail = async (email) => users.find(u => u.email === email);
userRepo.findById = async (id) => users.find(u => u.id === id);
userRepo.create = async (username, email, password, role) => {
    if (users.some(u => u.email === email || u.username === username)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY', errno: 1062 });
    users.push({ id: nextUserId, username, email, password, role, created_at: new Date() });
    return nextUserId++;
};
userRepo.findAll = async () => users.map(({ password, ...u }) => u);
userRepo.updateRole = async (id, role) => { users.find(u => u.id === id).role = role; return true; };
userRepo.delete = async (id) => {
    const i = users.findIndex(u => u.id === id);
    if (i < 0) return false;
    users.splice(i, 1);
    for (let j = materials.length - 1; j >= 0; j--) if (materials[j].user_id === id) materials.splice(j, 1);
    return true;
};
const withUploader = (m) => ({ ...m, uploaded_by: users.find(u => u.id === m.user_id)?.username });
materialRepo.create = async (m) => { materials.push({ id: nextMaterialId, created_at: new Date(), ...m }); return nextMaterialId++; };
materialRepo.findAll = async ({ q = '', subject = '' } = {}) => materials
    .filter(m => (!subject || m.subject === subject) && (!q || m.title.includes(q)))
    .map(withUploader);
materialRepo.findSubjects = async () => [...new Set(materials.map(m => m.subject))].sort();
materialRepo.findById = async (id) => { const m = materials.find(x => x.id === id); return m && withUploader(m); };
materialRepo.findByUserId = async (uid) => materials.filter(m => m.user_id === uid).map(withUploader);
materialRepo.delete = async (id) => { const i = materials.findIndex(m => m.id === id); if (i < 0) return false; materials.splice(i, 1); return true; };

// ---------- servidor de prueba ----------
let server, base;
const tokens = {};

test.before(async () => {
    for (const [username, role, pass] of [['admin', 'admin', 'Admin1234'], ['profe', 'professor', 'Profesor1234'], ['alumno', 'student', 'Alumno1234']]) {
        await userRepo.create(username, `${username}@biblioteca.local`, await bcrypt.hash(pass, 4), role);
        const res = await call('POST', '/api/auth/login', { email: `${username}@biblioteca.local`, password: pass }, null, true);
        tokens[role] = res.body.token;
    }
});

function listen() {
    return new Promise(resolve => {
        const s = createApp().listen(0, () => { base = `http://127.0.0.1:${s.address().port}`; resolve(s); });
    });
}

async function call(method, url, body, token, skipStart = false) {
    if (!server && !skipStart) server = await listen();
    if (!server) server = await listen();
    const headers = {};
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + url, { method, headers, body: payload });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
}

function uploadForm({ title = 'Apunte de Álgebra', subject = 'Matemática', content = '%PDF-1.7 contenido', type = 'application/pdf', name = 'álgebra.pdf', field = 'file' } = {}) {
    const form = new FormData();
    if (title !== null) form.append('title', title);
    if (subject !== null) form.append('subject', subject);
    form.append('description', 'Unidad 1');
    form.append(field, new Blob([content], { type }), name);
    return form;
}

test.after(() => {
    server?.close();
    fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

// ---------- autenticación ----------
test('registro: siempre crea Student, aunque el pedido intente elegir rol', async () => {
    const res = await call('POST', '/api/auth/register', { username: 'nuevo', email: 'Nuevo@Uni.edu', password: 'Clave1234', role: 'admin' });
    assert.equal(res.status, 201);
    const created = users.find(u => u.username === 'nuevo');
    assert.equal(created.role, 'student');
    assert.equal(created.email, 'nuevo@uni.edu'); // normalizado a minúsculas
    assert.notEqual(created.password, 'Clave1234'); // se guarda el hash BCrypt
    assert.match(created.password, /^\$2[aby]\$/);
});

test('registro: los filtros rechazan datos inválidos con mensajes localizados', async () => {
    let res = await call('POST', '/api/auth/register', { username: 'x', email: 'malo', password: 'debil' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors.length, 3);
    assert.match(res.body.message, /usuario/i); // español por defecto

    const en = await fetch(base + '/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en-US,en;q=0.9' },
        body: JSON.stringify({ username: 'okname', email: 'malo', password: 'Clave1234' })
    });
    assert.match((await en.json()).message, /not valid/);

    res = await call('POST', '/api/auth/register', { username: 'okname', email: 'a@b.com', password: { toString: () => 'Clave1234' } });
    assert.equal(res.status, 400); // la clave debe ser string
});

test('registro: usuario o email duplicado -> 409', async () => {
    const res = await call('POST', '/api/auth/register', { username: 'otro', email: 'alumno@biblioteca.local', password: 'Clave1234' });
    assert.equal(res.status, 409);
});

test('login: credenciales correctas devuelven token y rol; incorrectas 401', async () => {
    let res = await call('POST', '/api/auth/login', { email: 'profe@biblioteca.local', password: 'Profesor1234' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'professor');
    assert.ok(res.body.token.split('.').length === 3);

    res = await call('POST', '/api/auth/login', { email: 'profe@biblioteca.local', password: 'incorrecta' });
    assert.equal(res.status, 401);
    res = await call('POST', '/api/auth/login', { email: 'nadie@biblioteca.local', password: 'Profesor1234' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Credenciales inválidas.'); // mismo mensaje: no revela si el email existe
    res = await call('POST', '/api/auth/login', { email: 'profe@biblioteca.local' });
    assert.equal(res.status, 400);
});

// ---------- autorización por rol ----------
test('sin token o con token falso: 401', async () => {
    assert.equal((await call('GET', '/api/materials')).status, 401);
    assert.equal((await call('GET', '/api/materials', null, 'basura.falsa.token')).status, 401);
    assert.equal((await call('GET', '/api/admin/users')).status, 401);
});

test('token firmado con otra clave o con alg none: 401', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: 1, role: 'admin' }, 'otra-clave');
    assert.equal((await call('GET', '/api/admin/users', null, forged)).status, 401);
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"id":1,"role":"admin"}').toString('base64url') + '.';
    assert.equal((await call('GET', '/api/admin/users', null, none)).status, 401);
});

test('Student no puede subir ni administrar; Professor no es Admin', async () => {
    assert.equal((await call('POST', '/api/materials', uploadForm(), tokens.student)).status, 403);
    assert.equal((await call('GET', '/api/materials/mine', null, tokens.student)).status, 403);
    assert.equal((await call('GET', '/api/admin/users', null, tokens.student)).status, 403);
    assert.equal((await call('GET', '/api/admin/users', null, tokens.professor)).status, 403);
    assert.equal((await call('PATCH', '/api/admin/users/3/role', { role: 'admin' }, tokens.professor)).status, 403);
});

// ---------- materiales (Multer + filtros) ----------
let pdfId;
test('Professor sube un PDF; el archivo se guarda con nombre generado por el servidor', async () => {
    const res = await call('POST', '/api/materials', uploadForm(), tokens.professor);
    assert.equal(res.status, 201);
    pdfId = res.body.id;

    const saved = materials.find(m => m.id === pdfId);
    assert.equal(saved.original_name, 'álgebra.pdf'); // tilde preservada
    assert.match(saved.stored_name, /^[0-9a-f-]{36}\.pdf$/);
    assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, saved.stored_name)));
    assert.equal(saved.user_id, users.find(u => u.username === 'profe').id);
});

test('subida: se rechazan MIME no permitido, firma falsa, falta de datos y falta de archivo', async () => {
    const before = fs.readdirSync(process.env.UPLOAD_DIR).length;

    let res = await call('POST', '/api/materials', uploadForm({ type: 'text/html', content: '<script>alert(1)</script>', name: 'x.html' }), tokens.professor);
    assert.equal(res.status, 415);

    res = await call('POST', '/api/materials', uploadForm({ content: 'MZ\x90 esto es un exe', type: 'application/pdf', name: 'virus.pdf' }), tokens.professor);
    assert.equal(res.status, 415); // dice ser PDF pero no lo es

    res = await call('POST', '/api/materials', uploadForm({ title: '   ' }), tokens.professor);
    assert.equal(res.status, 400);
    res = await call('POST', '/api/materials', uploadForm({ subject: null }), tokens.professor);
    assert.equal(res.status, 400);

    res = await call('POST', '/api/materials', uploadForm({ field: 'otro' }), tokens.professor);
    assert.equal(res.status, 400); // campo de archivo inesperado

    assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, before, 'no deben quedar archivos huérfanos en disco');
});

test('subida: el nombre original no puede escapar de la carpeta', async () => {
    const res = await call('POST', '/api/materials', uploadForm({ name: '../../etc/passwd.pdf' }), tokens.professor);
    assert.equal(res.status, 201);
    const saved = materials.find(m => m.id === res.body.id);
    assert.ok(!saved.original_name.includes('/') && !saved.original_name.includes('..'.concat('/')));
    assert.match(saved.stored_name, /^[0-9a-f-]{36}\.pdf$/);
    await call('DELETE', `/api/materials/${res.body.id}`, null, tokens.professor);
});

test('Student (autenticado) consulta y descarga; no se expone stored_name', async () => {
    const list = await call('GET', '/api/materials', null, tokens.student);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].uploaded_by, 'profe');
    assert.equal('stored_name' in list.body[0], false);

    const filtered = await call('GET', '/api/materials?subject=Historia', null, tokens.student);
    assert.deepEqual(filtered.body, []);
    assert.deepEqual((await call('GET', '/api/materials/subjects', null, tokens.student)).body, ['Matemática']);

    const dl = await call('GET', `/api/materials/${pdfId}/download`, null, tokens.student);
    assert.equal(dl.status, 200);
    assert.match(dl.headers.get('content-disposition'), /^attachment;/);
    assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(dl.body.toString(), '%PDF-1.7 contenido');
});

test('ids inválidos o inexistentes', async () => {
    assert.equal((await call('GET', '/api/materials/abc', null, tokens.student)).status, 400);
    assert.equal((await call('GET', '/api/materials/999', null, tokens.student)).status, 404);
    assert.equal((await call('GET', '/api/materials/999/download', null, tokens.student)).status, 404);
});

test('PUBLIC_ACCESS=true: el visitante sin token consulta; con token vencido/falso sigue siendo 401', async () => {
    process.env.PUBLIC_ACCESS = 'true';
    try {
        assert.equal((await call('GET', '/api/materials')).status, 200);
        assert.equal((await call('GET', `/api/materials/${pdfId}/download`)).status, 200);
        assert.equal((await call('GET', '/api/materials', null, 'falso')).status, 401);
        // público NO significa que pueda subir o administrar
        assert.equal((await call('POST', '/api/materials', uploadForm())).status, 401);
        assert.equal((await call('GET', '/api/admin/users')).status, 401);
        assert.equal((await call('GET', '/api/config')).body.publicAccess, true);
    } finally { process.env.PUBLIC_ACCESS = 'false'; }
    assert.equal((await call('GET', '/api/config')).body.publicAccess, false);
});

test('borrado: Professor solo borra lo suyo; Admin borra cualquiera', async () => {
    // otro profesor
    await userRepo.create('profe2', 'profe2@biblioteca.local', await bcrypt.hash('Profesor1234', 4), 'professor');
    const login = await call('POST', '/api/auth/login', { email: 'profe2@biblioteca.local', password: 'Profesor1234' });

    assert.equal((await call('DELETE', `/api/materials/${pdfId}`, null, login.body.token)).status, 403);
    assert.equal((await call('DELETE', `/api/materials/${pdfId}`, null, tokens.student)).status, 403);

    const stored = materials.find(m => m.id === pdfId).stored_name;
    assert.equal((await call('DELETE', `/api/materials/${pdfId}`, null, tokens.admin)).status, 200);
    assert.equal(fs.existsSync(path.join(process.env.UPLOAD_DIR, stored)), false, 'el archivo físico también se borra');
});

// ---------- administración ----------
test('Admin lista usuarios (sin hash) y cambia roles con reglas de negocio', async () => {
    const list = await call('GET', '/api/admin/users', null, tokens.admin);
    assert.equal(list.status, 200);
    assert.ok(list.body.length >= 3);
    assert.ok(list.body.every(u => !('password' in u)));

    const studentId = users.find(u => u.username === 'alumno').id;
    const adminId = users.find(u => u.username === 'admin').id;

    assert.equal((await call('PATCH', `/api/admin/users/${studentId}/role`, { role: 'superusuario' }, tokens.admin)).status, 400);
    assert.equal((await call('PATCH', `/api/admin/users/${adminId}/role`, { role: 'student' }, tokens.admin)).status, 403); // no a sí mismo
    assert.equal((await call('PATCH', '/api/admin/users/9999/role', { role: 'professor' }, tokens.admin)).status, 404);
    assert.equal((await call('PATCH', `/api/admin/users/${studentId}/role`, { role: 'professor' }, tokens.admin)).status, 200);
    assert.equal(users.find(u => u.id === studentId).role, 'professor');
    await userRepo.updateRole(studentId, 'student');
});

test('Admin elimina un usuario y sus archivos; no puede eliminarse a sí mismo', async () => {
    const up = await call('POST', '/api/materials', uploadForm(), tokens.professor);
    assert.equal(up.status, 201);
    const stored = materials.find(m => m.id === up.body.id).stored_name;

    const profeId = users.find(u => u.username === 'profe').id;
    const adminId = users.find(u => u.username === 'admin').id;

    assert.equal((await call('DELETE', `/api/admin/users/${adminId}`, null, tokens.admin)).status, 403);
    assert.equal((await call('DELETE', '/api/admin/users/9999', null, tokens.admin)).status, 404);
    assert.equal((await call('DELETE', `/api/admin/users/${profeId}`, null, tokens.admin)).status, 200);
    assert.equal(fs.existsSync(path.join(process.env.UPLOAD_DIR, stored)), false);
    assert.equal(users.some(u => u.id === profeId), false);
});

test('los archivos subidos no se sirven como estáticos y las rutas inexistentes dan 404', async () => {
    assert.equal((await call('GET', '/uploads/lo-que-sea.pdf')).status, 404);
    assert.equal((await call('GET', '/api/no-existe')).status, 404);
});

test('las páginas del frontend se entregan', async () => {
    for (const p of ['/', '/login', '/register', '/library', '/professor-dashboard', '/admin-dashboard']) {
        const res = await call('GET', p);
        assert.equal(res.status, 200, p);
    }
});
