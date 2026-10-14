/**
 * Cliente de la API. Todos los pedidos al backend pasan por acá.
 * Si el frontend se sirve desde otro dominio, definir window.API_URL antes de cargar este script.
 */
const API_URL = window.API_URL || '/api';

const apiService = {
    async request(endpoint, method = 'GET', data = null, isFormData = false) {
        const token = authHelper.getToken();

        const headers = {};
        if (!isFormData) headers['Content-Type'] = 'application/json';
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (data) config.body = isFormData ? data : JSON.stringify(data);

        const response = await fetch(`${API_URL}${endpoint}`, config);
        const result = await response.json().catch(() => ({}));

        // Si el servidor rechaza un token que SÍ enviamos, la sesión venció: cerrar sesión.
        // (Un 401 sin token, por ejemplo credenciales erróneas en el login, no cierra nada.)
        if (response.status === 401 && token) authHelper.logout();

        if (!response.ok) throw new Error(result.message || 'Error en la petición');
        return result;
    },

    // Descarga un archivo enviando el token (un <a href> común no puede enviarlo)
    async download(endpoint, filename) {
        const token = authHelper.getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`${API_URL}${endpoint}`, { headers });
        if (!response.ok) {
            if (response.status === 401 && token) authHelper.logout();
            const result = await response.json().catch(() => ({}));
            throw new Error(result.message || 'No se pudo descargar el archivo');
        }

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
};
