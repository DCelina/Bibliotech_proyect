/**
 * Panel del Professor (y del Admin): subir material y administrar el propio.
 */
if (authHelper.requireRole(['professor', 'admin'])) {
    document.addEventListener('DOMContentLoaded', loadMyMaterials);
}

async function loadMyMaterials() {
    try {
        const materials = await apiService.request('/materials/mine');
        renderMyMaterials(materials);

        // Sugerir las materias que ya usó en el campo "Materia"
        const datalist = document.getElementById('subjectOptions');
        datalist.replaceChildren(...[...new Set(materials.map(m => m.subject))].map(s => h('option', { value: s })));
    } catch (error) {
        showModal('No se pudieron cargar tus materiales', error.message);
    }
}

function renderMyMaterials(materials) {
    const tbody = document.getElementById('myMaterialsTableBody');
    tbody.replaceChildren();

    if (materials.length === 0) {
        tbody.appendChild(emptyRow(5, 'Todavía no publicaste materiales. Subí el primero desde el formulario.'));
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
        loadMyMaterials();
    } catch (error) {
        showModal('No se pudo eliminar', error.message);
    }
}

const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('subject', document.getElementById('subject').value);
        formData.append('description', document.getElementById('description').value);
        // El archivo va al final: Multer lo recibe y el servidor ya tiene los campos de texto
        formData.append('file', document.getElementById('file').files[0]);

        try {
            await apiService.request('/materials', 'POST', formData, true);
            showModal('Material publicado', 'Ya aparece en el catálogo.');
            uploadForm.reset();
            loadMyMaterials();
        } catch (error) {
            showModal('No se pudo publicar', error.message);
        }
    });
}
