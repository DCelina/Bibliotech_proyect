/**
 * Componentes de interfaz. Todo el DOM se arma con nodos nativos (nada de innerHTML),
 * así ningún texto que venga del servidor puede inyectar HTML o scripts.
 */

// Crea un elemento: h('button', { className: 'w3-button', text: 'Hola', onClick: fn }, ...hijos)
function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'className') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
        else node.setAttribute(key, value);
    }
    node.append(...children.filter(child => child != null));
    return node;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
    return new Date(value).toLocaleDateString();
}

// Celda con el título del material y su descripción debajo
function titleCell(material) {
    const td = h('td', {}, h('b', { text: material.title }));
    if (material.description) td.append(h('span', { className: 'lib-desc', text: material.description }));
    return td;
}

// Fila vacía para cuando una tabla no tiene datos
function emptyRow(columns, message) {
    return h('tr', {}, h('td', { colspan: String(columns), className: 'lib-muted', text: message }));
}

function showModal(title, message) {
    let modal = document.getElementById('msgModal');

    if (!modal) {
        modal = h('div', { id: 'msgModal', className: 'w3-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modalTitle' });

        const content = h('div', { className: 'w3-modal-content w3-card-4 lib-card', style: 'max-width:400px' });
        const header = h('header', { className: 'w3-container w3-border-bottom' }, h('h3', { id: 'modalTitle' }));
        const bodyDiv = h('div', { className: 'w3-container w3-padding' });
        const btnClose = h('button', {
            className: 'w3-button w3-right w3-yellow w3-margin-bottom',
            text: 'Cerrar',
            onClick: () => { modal.style.display = 'none'; }
        });

        bodyDiv.append(h('p', { id: 'modalBody' }), btnClose);
        content.append(header, bodyDiv);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').textContent = message;
    modal.style.display = 'block';
    modal.querySelector('button').focus();
}
