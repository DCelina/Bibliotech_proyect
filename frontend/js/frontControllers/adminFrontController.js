/**
 * Panel del Admin: usuarios (cambiar rol, eliminar) y todos los materiales.
 */
const ROLE_LABELS = { admin: 'Admin', professor: 'Professor', student: 'Student' };

if (authHelper.requireRole(['admin'])) {
    document.addEventListener('DOMContentLoaded', () => {
        loadUsers();
        loadMaterials();
    });
}

// ---------- Usuarios ----------
async function loadUsers() {
    try {
        renderUsersTable(await apiService.request('/admin/users'));
    } catch (error) {
        showModal('Acceso denegado', error.message);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.replaceChildren();
    const myId = authHelper.getUserId();

    users.forEach(u => {
        const isMe = u.id === myId;

        const select = h('select', {
            className: 'w3-select w3-border w3-round w3-black w3-text-white',
            'aria-label': `Rol de ${u.username}`
        });
        Object.entries(ROLE_LABELS).forEach(([value, label]) => {
            const option = h('option', { value, text: label });
            option.selected = value === u.role;
            select.append(option);
        });
        select.disabled = isMe; // un admin no cambia su propio rol
        select.addEventListener('change', () => changeRole(u, select.value));

        const btnDelete = h('button', {
            className: 'w3-button w3-red w3-tiny w3-round',
            text: 'Eliminar usuario',
            'aria-label': `Eliminar al usuario ${u.username}`,
            onClick: () => deleteUser(u)
        });
        btnDelete.disabled = isMe;

        tbody.appendChild(h('tr', {},
            h('td', { text: String(u.id) }),
            h('td', {}, h('b', { text: u.username })),
            h('td', { text: u.email }),
            h('td', {}, select),
            h('td', { text: formatDate(u.created_at) }),
            h('td', {}, btnDelete)
        ));
    });
}

async function changeRole(user, role) {
    if (!confirm(`¿Cambiar el rol de ${user.username} a ${ROLE_LABELS[role]}?`)) {
        loadUsers(); // vuelve el selector al valor anterior
        return;
    }
    try {
        await apiService.request(`/admin/users/${user.id}/role`, 'PATCH', { role });
        showModal('Rol actualizado', `${user.username} ahora es ${ROLE_LABELS[role]}.`);
    } catch (error) {
        showModal('No se pudo cambiar el rol', error.message);
    }
    loadUsers();
}

async function deleteUser(user) {
    if (!confirm(`¿Eliminar a ${user.username}? Se borran también todos sus materiales.`)) return;
    try {
        await apiService.request(`/admin/users/${user.id}`, 'DELETE');
        showModal('Usuario eliminado', `Se eliminó a ${user.username}.`);
        loadUsers();
        loadMaterials();
    } catch (error) {
        showModal('No se pudo eliminar al usuario', error.message);
    }
}

// ---------- Materiales ----------
async function loadMaterials() {
    try {
        renderMaterialsTable(await apiService.request('/materials'));
    } catch (error) {
        showModal('No se pudieron cargar los materiales', error.message);
    }
}

function renderMaterialsTable(materials) {
    const tbody = document.getElementById('allMaterialsTableBody');
    tbody.replaceChildren();

    if (materials.length === 0) {
        tbody.appendChild(emptyRow(6, 'No hay materiales publicados.'));
        return;
    }

    materials.forEach(m => {
        const btnDelete = h('button', {
            className: 'w3-button w3-red w3-tiny w3-round',
            text: 'Eliminar',
            'aria-label': `Eliminar ${m.title}`,
            onClick: () => deleteMaterial(m)
        });

        tbody.appendChild(h('tr', {},
            titleCell(m),
            h('td', {}, h('span', { className: 'w3-tag w3-round w3-black', text: m.subject })),
            h('td', { text: m.uploaded_by }),
            h('td', { text: formatDate(m.created_at) }),
            h('td', { text: formatBytes(m.size_bytes) }),
            h('td', {}, btnDelete)
        ));
    });
}

async function deleteMaterial(material) {
    if (!confirm(`¿Eliminar "${material.title}"? Se borra también el archivo.`)) return;
    try {
        await apiService.request(`/materials/${material.id}`, 'DELETE');
        showModal('Material eliminado', `Se eliminó "${material.title}".`);
        loadMaterials();
    } catch (error) {
        showModal('No se pudo eliminar', error.message);
    }
}
