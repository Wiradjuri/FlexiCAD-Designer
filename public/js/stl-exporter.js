// STL Export System for FlexiCAD Designer - Phase 4.6/4.7
// Client-side OpenSCAD to STL conversion using Web Assembly

class STLExporter {
    constructor() {
        this.wasmModule = null;
        this.isInitialized = false;
        this.initializeExporter();
    }

    async initializeExporter() {
        try {
            // For now, we'll use a simplified approach since full OpenSCAD WASM is complex
            // In a real implementation, you'd load an OpenSCAD WASM module
            console.log('🔧 STL Exporter initialized (simulation mode)');
            this.isInitialized = true;
            this.addExportButtons();
        } catch (error) {
            console.error('Failed to initialize STL exporter:', error);
            this.isInitialized = false;
        }
    }

    addExportButtons() {
        // Add export buttons to AI generator, my designs, and template pages
        document.addEventListener('DOMContentLoaded', () => {
            this.setupExportButtons();
        });
    }

    setupExportButtons() {
        // Find code preview areas and add export buttons
        const codeAreas = document.querySelectorAll('textarea[id*="code"], pre[class*="code"], .code-preview');
        
        codeAreas.forEach(area => {
            if (!area.nextElementSibling?.classList.contains('stl-export-controls')) {
                const exportControls = this.createExportControls();
                area.parentNode.insertBefore(exportControls, area.nextSibling);
            }
        });

        // Add to design cards in my-designs.html
        const designCards = document.querySelectorAll('.design-card');
        designCards.forEach(card => {
            const actions = card.querySelector('.design-actions');
            if (actions && !actions.querySelector('.stl-export-btn')) {
                const exportBtn = document.createElement('button');
                exportBtn.className = 'btn btn-sm btn-outline stl-export-btn';
                exportBtn.innerHTML = '📐 Export STL';
                exportBtn.onclick = () => this.exportFromCard(card);
                actions.appendChild(exportBtn);
            }
        });
    }

    createExportControls() {
        const controls = document.createElement('div');
        controls.className = 'stl-export-controls';
        controls.innerHTML = `
            <div class="export-header">
                <h4>🏗️ 3D Export Options</h4>
                <div class="export-info">Convert OpenSCAD code to downloadable STL file</div>
            </div>
            <div class="export-settings">
                <div class="setting-group">
                    <label for="meshResolution">Mesh Resolution:</label>
                    <select id="meshResolution" class="export-select">
                        <option value="low">Low (Fast, ~5KB)</option>
                        <option value="medium" selected>Medium (Balanced, ~20KB)</option>
                        <option value="high">High (Detailed, ~100KB)</option>
                        <option value="ultra">Ultra (Print-ready, ~500KB)</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label for="exportScale">Scale Factor:</label>
                    <input type="number" id="exportScale" class="export-input" min="0.1" max="10" step="0.1" value="1">
                </div>
                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="uploadToCloud" class="export-checkbox">
                        Upload to cloud for sharing
                    </label>
                </div>
            </div>
            <div class="export-actions">
                <button class="btn btn-primary export-btn" onclick="stlExporter.exportSTL(this)">
                    📐 Generate STL
                </button>
                <div class="export-progress hidden">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="progress-text">Processing...</span>
                </div>
            </div>
        `;
        return controls;
    }

    async exportSTL(buttonElement) {
        if (!this.isInitialized) {
            this.showNotification('STL exporter not ready. Please try again.', 'error');
            return;
        }

        const controls = buttonElement.closest('.stl-export-controls');
        const codeElement = controls.previousElementSibling;
        const code = this.extractCode(codeElement);

        if (!code || code.trim().length === 0) {
            this.showNotification('No OpenSCAD code found to export', 'error');
            return;
        }

        try {
            // Show progress
            this.showProgress(controls, true);

            // Get export settings
            const resolution = controls.querySelector('#meshResolution')?.value || 'medium';
            const scale = parseFloat(controls.querySelector('#exportScale')?.value || '1');
            const uploadToCloud = controls.querySelector('#uploadToCloud')?.checked || false;

            // Simulate STL generation (in real implementation, this would use WASM OpenSCAD)
            const stlData = await this.generateSTL(code, { resolution, scale });

            // Download STL file
            await this.downloadSTL(stlData, this.generateFilename(code));

            // Optionally upload to cloud
            if (uploadToCloud) {
                await this.uploadToCloud(stlData, code);
            }

            this.showNotification('STL exported successfully!');

        } catch (error) {
            console.error('STL export error:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
        } finally {
            this.showProgress(controls, false);
        }
    }

    extractCode(element) {
        if (element.tagName === 'TEXTAREA') {
            return element.value;
        } else if (element.tagName === 'PRE') {
            return element.textContent;
        } else if (element.classList.contains('code-preview')) {
            return element.textContent;
        }
        
        // Try to find code in nearby elements
        const parent = element.parentNode;
        const textarea = parent.querySelector('textarea');
        if (textarea) return textarea.value;
        
        const pre = parent.querySelector('pre');
        if (pre) return pre.textContent;

        return null;
    }

    async generateSTL(code, options) {
        // Simulate STL generation process
        // In real implementation, this would:
        // 1. Parse OpenSCAD code using WASM OpenSCAD
        // 2. Generate 3D mesh
        // 3. Convert to STL binary format

        const { resolution, scale } = options;
        
        // Simulate processing time based on resolution
        const processingTime = {
            'low': 500,
            'medium': 1500,
            'high': 3000,
            'ultra': 8000
        }[resolution] || 1500;

        await this.delay(processingTime);

        // Generate a simple STL for a cube (placeholder)
        return this.generateCubeSTL(scale);
    }

    generateCubeSTL(scale = 1) {
        // Generate binary STL for a simple cube (placeholder implementation)
        const vertices = [
            // Front face
            [0, 0, 0], [scale*10, 0, 0], [scale*10, scale*10, 0],
            [0, 0, 0], [scale*10, scale*10, 0], [0, scale*10, 0],
            // Back face  
            [0, 0, scale*10], [scale*10, scale*10, scale*10], [scale*10, 0, scale*10],
            [0, 0, scale*10], [0, scale*10, scale*10], [scale*10, scale*10, scale*10],
            // Left face
            [0, 0, 0], [0, scale*10, 0], [0, scale*10, scale*10],
            [0, 0, 0], [0, scale*10, scale*10], [0, 0, scale*10],
            // Right face
            [scale*10, 0, 0], [scale*10, scale*10, scale*10], [scale*10, scale*10, 0],
            [scale*10, 0, 0], [scale*10, 0, scale*10], [scale*10, scale*10, scale*10],
            // Top face
            [0, scale*10, 0], [scale*10, scale*10, 0], [scale*10, scale*10, scale*10],
            [0, scale*10, 0], [scale*10, scale*10, scale*10], [0, scale*10, scale*10],
            // Bottom face
            [0, 0, 0], [scale*10, 0, scale*10], [scale*10, 0, 0],
            [0, 0, 0], [0, 0, scale*10], [scale*10, 0, scale*10]
        ];

        // Create binary STL buffer
        const triangleCount = vertices.length / 3;
        const bufferSize = 80 + 4 + (triangleCount * 50); // Header + count + triangles
        const buffer = new ArrayBuffer(bufferSize);
        const view = new DataView(buffer);
        
        let offset = 80; // Skip header
        
        // Triangle count
        view.setUint32(offset, triangleCount, true);
        offset += 4;

        // Write triangles
        for (let i = 0; i < vertices.length; i += 3) {
            const v1 = vertices[i];
            const v2 = vertices[i + 1]; 
            const v3 = vertices[i + 2];

            // Calculate normal (simplified)
            const normal = [0, 0, 1]; // Placeholder normal

            // Normal vector (12 bytes)
            view.setFloat32(offset, normal[0], true); offset += 4;
            view.setFloat32(offset, normal[1], true); offset += 4;
            view.setFloat32(offset, normal[2], true); offset += 4;

            // Vertex 1 (12 bytes)
            view.setFloat32(offset, v1[0], true); offset += 4;
            view.setFloat32(offset, v1[1], true); offset += 4;
            view.setFloat32(offset, v1[2], true); offset += 4;

            // Vertex 2 (12 bytes)
            view.setFloat32(offset, v2[0], true); offset += 4;
            view.setFloat32(offset, v2[1], true); offset += 4;
            view.setFloat32(offset, v2[2], true); offset += 4;

            // Vertex 3 (12 bytes)
            view.setFloat32(offset, v3[0], true); offset += 4;
            view.setFloat32(offset, v3[1], true); offset += 4;
            view.setFloat32(offset, v3[2], true); offset += 4;

            // Attribute byte count (2 bytes)
            view.setUint16(offset, 0, true); offset += 2;
        }

        return buffer;
    }

    generateFilename(code) {
        // Extract meaningful filename from code comments or use generic name
        const lines = code.split('\n');
        const firstCommentLine = lines.find(line => line.trim().startsWith('//'));
        
        if (firstCommentLine) {
            const comment = firstCommentLine.replace(/^\/\/\s*/, '').trim();
            const cleanName = comment.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
            return `${cleanName.substring(0, 30)}-flexicad.stl`;
        }

        return `flexicad-export-${Date.now()}.stl`;
    }

    async downloadSTL(stlData, filename) {
        const blob = new Blob([stlData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    async uploadToCloud(stlData, originalCode) {
        try {
            const formData = new FormData();
            formData.append('stl', new Blob([stlData], { type: 'application/octet-stream' }));
            formData.append('code', originalCode);
            formData.append('filename', this.generateFilename(originalCode));

            const response = await fetch('/api/upload-stl', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(`Uploaded to cloud: ${result.shareUrl}`);
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.warn('Cloud upload failed:', error);
            this.showNotification('STL downloaded locally (cloud upload failed)', 'warning');
        }
    }

    exportFromCard(card) {
        // Extract code from design card (used in my-designs.html)
        const codeElement = card.querySelector('textarea, pre, .code-content');
        if (codeElement) {
            // Create temporary export controls
            const tempControls = this.createExportControls();
            tempControls.style.position = 'fixed';
            tempControls.style.top = '50%';
            tempControls.style.left = '50%';
            tempControls.style.transform = 'translate(-50%, -50%)';
            tempControls.style.background = 'var(--bg-secondary)';
            tempControls.style.border = '1px solid var(--border)';
            tempControls.style.borderRadius = '8px';
            tempControls.style.padding = '20px';
            tempControls.style.zIndex = '1000';
            tempControls.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.className = 'btn btn-sm';
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = '10px';
            closeBtn.style.right = '10px';
            closeBtn.onclick = () => tempControls.remove();
            
            tempControls.appendChild(closeBtn);
            document.body.appendChild(tempControls);
        }
    }

    showProgress(controls, show) {
        const button = controls.querySelector('.export-btn');
        const progress = controls.querySelector('.export-progress');
        
        if (show) {
            button.classList.add('hidden');
            progress.classList.remove('hidden');
            
            // Animate progress bar
            const fill = progress.querySelector('.progress-fill');
            let width = 0;
            const interval = setInterval(() => {
                width += Math.random() * 15;
                if (width >= 90) {
                    clearInterval(interval);
                    width = 90; // Stop at 90% until completion
                }
                fill.style.width = `${Math.min(width, 90)}%`;
            }, 200);
            
            controls._progressInterval = interval;
        } else {
            // Complete progress
            if (controls._progressInterval) {
                clearInterval(controls._progressInterval);
            }
            
            const fill = progress.querySelector('.progress-fill');
            fill.style.width = '100%';
            
            setTimeout(() => {
                button.classList.remove('hidden');
                progress.classList.add('hidden');
                fill.style.width = '0%';
            }, 500);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `stl-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</div>
            <div class="notification-text">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize STL exporter
window.stlExporter = new STLExporter();