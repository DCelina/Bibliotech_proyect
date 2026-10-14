/**
 * Formularios de login y de registro.
 */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const data = await apiService.request('/auth/login', 'POST', { email, password });
            authHelper.saveSession(data.token, data.role, data.username);
            window.location.href = authHelper.homeFor(data.role);
        } catch (error) {
            showModal('No se pudo iniciar sesión', error.message);
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await apiService.request('/auth/register', 'POST', { username, email, password });
            showModal('Cuenta creada', 'Ya podés iniciar sesión.');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
        } catch (error) {
            showModal('No se pudo crear la cuenta', error.message);
        }
    });
}
