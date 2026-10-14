/**
 * Roles del sistema (deben coincidir con los datos maestros de la tabla roles).
 *  - admin:     puede todo (usuarios, roles y cualquier material).
 *  - professor: sube material y administra el propio.
 *  - student:   consulta y descarga (como cliente).
 */
const ROLES = Object.freeze({
    ADMIN: 'admin',
    PROFESSOR: 'professor',
    STUDENT: 'student'
});

module.exports = { ROLES, ALL_ROLES: Object.values(ROLES) };
