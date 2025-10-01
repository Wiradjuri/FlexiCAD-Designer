// Modal System for FlexiCAD Designer - Phase 4.7.1
// Centered modal dialogs for code preview and other content

export function showModal(html) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
        console.error('Modal root not found. Add modal-root element to page.');
        return;
    }
    
    modalRoot.querySelector('.modal-content').innerHTML = html;
    modalRoot.hidden = false;
    
    // Focus management for accessibility
    const firstFocusable = modalRoot.querySelector('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
        firstFocusable.focus();
    }
}

export function hideModal() {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
        modalRoot.hidden = true;
    }
}

// Event listeners for modal interactions
document.addEventListener('click', e => {
    if (e.target.closest('.modal-close') || e.target.classList.contains('modal-backdrop')) {
        hideModal();
    }
});

// Escape key to close modal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        hideModal();
    }
});

// Utility function for safe HTML escaping
export function escapeHtml(str) {
    return (str ?? '').replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

// Convenience function for code preview modals
export function showCodeModal(title, code, language = 'scad') {
    const escapedCode = escapeHtml(code);
    const html = `
        <div class="modal-header">
            <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="modal-body">
            <pre class="code-view"><code class="language-${language}">${escapedCode}</code></pre>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline modal-close">Close</button>
            <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`')}\`)">Copy Code</button>
        </div>
    `;
    showModal(html);
}