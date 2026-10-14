/**
 * Manejo de la sesión en el navegador (token JWT y rol).
 * Las páginas se protegen también en el backend: esto solo mejora la experiencia
 * (redirigir al lugar correcto), no es una barrera de seguridad.
 */
const authHelper = {
    storage: localStorage,

    saveSession(token, role, username) {
        this.storage.setItem('token', token);
        this.storage.setItem('role', role);
        this.storage.setItem('username', username || '');
    },

    getToken() { return this.storage.getItem('token'); },
    getRole() { return this.storage.getItem('role'); },
    isLoggedIn() { return Boolean(this.getToken()); },

    // Id del usuario según el payload del token (solo para la interfaz; el servidor lo verifica por su cuenta)
    getUserId() {
        try {
            const payload = this.getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(payload)).id;
        } catch {
            return null;
        }
    },

    // Página de inicio según el rol
    homeFor(role) {
        if (role === 'admin') return '/admin-dashboard';
        if (role === 'professor') return '/professor-dashboard';
        return '/library';
    },

    // Redirige al login si el rol actual no está permitido. Devuelve true si puede seguir.
    requireRole(allowedRoles) {
        if (allowedRoles.includes(this.getRole())) return true;
        window.location.href = '/login';
        return false;
    },

    logout() {
        this.storage.clear();
        window.location.href = '/login';
    },

    // Los botones de logout se marcan con la clase btn-logout (sin onclick en el HTML)
    initLogoutButtons() {
        document.querySelectorAll('.btn-logout').forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });
    }
};

document.addEventListener('DOMContentLoaded', () => authHelper.initLogoutButtons());
