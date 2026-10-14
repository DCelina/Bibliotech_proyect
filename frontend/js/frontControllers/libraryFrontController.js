/**
 * Catálogo de materiales. Es la pantalla del Student (y del visitante si el acceso es público).
 */
const searchForm = document.getElementById('searchForm');
const searchText = document.getElementById('searchText');
const subjectFilter = document.getElementById('subjectFilter');

document.addEventListener('DOMContentLoaded', async () => {
    renderNav();
    await loadSubjects();
    await loadMaterials();
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loadMaterials();
});
subjectFilter.addEventListener('change', loadMaterials);

// Barra superior según haya o no sesión
function renderNav() {
    const nav = document.getElementById('navActions');
    nav.replaceChildren();

    if (!authHelper.isLoggedIn()) {
        nav.append(
            h('a', { href: '/login', className: 'w3-button', text: 'Iniciar sesión' }),
            h('a', { href: '/register', className: 'w3-button w3-yellow', text: 'Crear cuenta' })
        );
        return;
    }

    const role = authHelper.getRole();
    if (role === 'professor' || role === 'admin') {
        nav.append(h('a', { href: authHelper.homeFor(role), className: 'w3-button', text: role === 'admin' ? 'Administración' : 'Mis materiales' }));
    }
    nav.append(h('button', { className: 'w3-button', text: 'Salir', onClick: () => authHelper.logout() }));
}

async function loadSubjects() {
    try {
        const subjects = await apiService.request('/materials/subjects');
        subjectFilter.replaceChildren(h('option', { value: '', text: 'Todas' }));
        subjects.forEach(s => subjectFilter.append(h('option', { value: s, text: s })));
    } catch (error) {
        // Sin la lista de materias el catálogo igual funciona; el error real se muestra al cargar materiales
    }
}

async function loadMaterials() {
    const params = new URLSearchParams();
    if (searchText.value.trim()) params.set('q', searchText.value.trim());
    if (subjectFilter.value) params.set('subject', subjectFilter.value);

    try {
        const materials = await apiService.request(`/materials?${params}`);
        renderMaterialsTable(materials);
    } catch (error) {
        // Con el acceso privado y sin sesión, el servidor responde 401: se pide iniciar sesión
        if (!authHelper.isLoggedIn()) {
            window.location.href = '/login';
            return;
        }
        showModal('No se pudo cargar el catálogo', error.message);
    }
}

function renderMaterialsTable(materials) {
    const tbody = document.getElementById('materialsTableBody');
    tbody.replaceChildren();

    if (materials.length === 0) {
        tbody.appendChild(emptyRow(6, 'No hay materiales que coincidan con la búsqueda.'));
        return;
    }

    materials.forEach(m => {
        const btnDownload = h('button', {
            className: 'w3-button w3-yellow w3-small w3-round',
            text: 'Descargar',
            'aria-label': `Descargar ${m.title}`,
            onClick: () => downloadMaterial(m)
        });

        tbody.appendChild(h('tr', {},
            titleCell(m),
            h('td', {}, h('span', { className: 'w3-tag w3-round w3-black', text: m.subject })),
            h('td', { text: m.uploaded_by }),
            h('td', { text: formatDate(m.created_at) }),
            h('td', { text: formatBytes(m.size_bytes) }),
            h('td', {}, btnDownload)
        ));
    });
}

async function downloadMaterial(material) {
    try {
        await apiService.download(`/materials/${material.id}/download`, material.original_name);
    } catch (error) {
        showModal('No se pudo descargar', error.message);
    }
}
