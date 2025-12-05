let backups = {
    clasificados: {
        Edictos: [],
        Cristina: [],
        Homero: [],
        MP: [],
        Qhubo: []
    },
    suscripciones: {
        Ana: [],
        Juliana: []
    }
};

let selectedItems = {};

document.addEventListener('DOMContentLoaded', () => {
    showLoading();
    loadBackups();
    setupEventListeners();
});

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (!toast || !toastMessage) return;
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

async function loadBackups() {
    try {
        const response = await fetch('get_backups.php');
        const data = await response.json();
        
        if (data.success) {
            backups = data.data;
            console.log('Datos cargados desde la base de datos');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar copias:', error);
        showToast('Error al cargar los datos: ' + error.message, 'error');
    } finally {
        hideLoading();
        renderLists();
    }
}

async function saveBackups(itemsToSave) {
    try {
        showLoading();
        
        const response = await fetch('save_backups.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: itemsToSave
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Datos guardados en la base de datos');
            hideLoading();
            return true;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al guardar:', error);
        hideLoading();
        showToast('Error al guardar: ' + error.message, 'error');
        return false;
    }
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getLastBackup(item, category) {
    const backupList = backups[category][item];
    if (backupList && backupList.length > 0) {
        return backupList[0];
    }
    return 'Nunca';
}

function getDaysSince(item, category) {
    const backupList = backups[category][item];
    if (backupList && backupList.length > 0) {
        const lastBackup = new Date(backupList[0].split(', ')[0].split('/').reverse().join('-'));
        const now = new Date();
        const diffTime = Math.abs(now - lastBackup);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    return null;
}

function createBackupItem(item, category) {
    const daysSince = getDaysSince(item, category);
    const isOverdue = daysSince !== null && daysSince > 7;
    const lastBackup = getLastBackup(item, category);
    
    const div = document.createElement('div');
    div.className = `backup-item ${isOverdue ? 'overdue' : ''}`;
    
    let badgeHTML = '';
    if (daysSince !== null) {
        const badgeClass = isOverdue ? 'warning' : 'success';
        const badgeText = daysSince === 0 ? 'Hoy' : `Hace ${daysSince} días`;
        badgeHTML = `<span class="badge ${badgeClass}">${badgeText}</span>`;
    }
    
    let historyHTML = '';
    if (backups[category][item].length > 1) {
        const historyItems = backups[category][item].slice(1).map(date => `
            <li>
                <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                ${date}
            </li>
        `).join('');
        
        historyHTML = `
            <div class="history-section">
                <button class="history-toggle" onclick="toggleHistory('${item}')">
                    Ver historial (${backups[category][item].length} copias)
                </button>
                <ul class="history-list hidden" id="history-${item}">
                    ${historyItems}
                </ul>
            </div>
        `;
    }
    
    div.innerHTML = `
        <div class="backup-item-header">
            <div class="backup-item-left">
                <input type="checkbox" id="${item}" data-item="${item}" data-category="${category}">
                <label for="${item}">${item}</label>
            </div>
            <div class="backup-item-right">
                <div class="last-backup">
                    <svg class="icon-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Última: ${lastBackup}</span>
                </div>
                ${badgeHTML}
            </div>
        </div>
        ${historyHTML}
    `;
    
    return div;
}

function renderLists() {
    const clasificadosList = document.getElementById('clasificados-list');
    const suscripcionesList = document.getElementById('suscripciones-list');
    
    if (!clasificadosList || !suscripcionesList) return;
    
    clasificadosList.innerHTML = '';
    suscripcionesList.innerHTML = '';
    
    Object.keys(backups.clasificados).forEach((item, index) => {
        const element = createBackupItem(item, 'clasificados');
        element.style.animationDelay = `${index * 0.1}s`;
        clasificadosList.appendChild(element);
    });
    
    Object.keys(backups.suscripciones).forEach((item, index) => {
        const element = createBackupItem(item, 'suscripciones');
        element.style.animationDelay = `${index * 0.1}s`;
        suscripcionesList.appendChild(element);
    });
    
    setupCheckboxListeners();
}

function toggleHistory(item) {
    const historyList = document.getElementById(`history-${item}`);
    if (historyList) {
        historyList.classList.toggle('hidden');
    }
}

function setupCheckboxListeners() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const item = e.target.dataset.item;
            const category = e.target.dataset.category;
            selectedItems[item] = {
                selected: e.target.checked,
                category: category
            };
            updateSaveButton();
        });
    });
}

function updateSaveButton() {
    const saveBtn = document.getElementById('guardar');
    if (!saveBtn) return;
    
    const hasSelection = Object.values(selectedItems).some(v => v.selected);
    
    if (hasSelection) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Copias Seleccionadas';
    } else {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Selecciona elementos para guardar';
    }
}

function setupEventListeners() {
    const saveBtn = document.getElementById('guardar');
    const exportBtn = document.getElementById('exportar');
    
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
}

async function handleSave() {
    const timestamp = getCurrentTimestamp();
    const itemsToSave = [];
    
    // Preparar los datos para guardar en la BD
    Object.keys(selectedItems).forEach(item => {
        if (selectedItems[item].selected) {
            const category = selectedItems[item].category;
            itemsToSave.push({
                categoria: category,
                item: item,
                fecha: timestamp
            });
            
            // Actualizar el objeto local para reflejar los cambios inmediatamente
            backups[category][item] = [
                timestamp,
                ...backups[category][item].slice(0, 9)
            ];
        }
    });
    
    // Guardar en la base de datos
    const success = await saveBackups(itemsToSave);
    
    if (success) {
        selectedItems = {};
        
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Recargar desde la base de datos para asegurar consistencia
        await loadBackups();
        updateSaveButton();
        showToast('¡Copias de seguridad guardadas exitosamente!', 'success');
    }
}

function exportToExcel() {
    showLoading();
    
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('Librería XLSX no está cargada');
        }

        const today = new Date();
        const dates = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date);
        }

        const excelData = [];
        
        const header = ['Categoría', 'Elemento'];
        dates.forEach(date => {
            header.push(date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }));
        });
        excelData.push(header);

        Object.keys(backups).forEach(category => {
            Object.keys(backups[category]).forEach(item => {
                const row = [
                    category.charAt(0).toUpperCase() + category.slice(1),
                    item
                ];

                dates.forEach(date => {
                    const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const hasBackup = backups[category][item].some(backup => {
                        const backupDate = backup.split(',')[0].trim();
                        return backupDate === dateStr;
                    });
                    row.push(hasBackup ? 'SÍ' : 'NO');
                });

                excelData.push(row);
            });
        });

        excelData.push([]);
        excelData.push(['RESUMEN']);
        excelData.push([]);
        
        Object.keys(backups).forEach(category => {
            Object.keys(backups[category]).forEach(item => {
                const lastBackup = getLastBackup(item, category);
                const daysSince = getDaysSince(item, category);
                const status = daysSince !== null && daysSince > 7 ? '⚠️ ATRASADO' : '✓ AL DÍA';
                
                excelData.push([
                    category.charAt(0).toUpperCase() + category.slice(1),
                    item,
                    lastBackup,
                    daysSince !== null ? `${daysSince} días` : 'Sin copias',
                    status
                ]);
            });
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        const colWidths = [
            { wch: 15 }, 
            { wch: 12 }  
        ];
        dates.forEach(() => colWidths.push({ wch: 12 }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Copias de Seguridad');

        const fileName = `copias_seguridad_${today.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        hideLoading();
        showToast('Archivo Excel exportado exitosamente', 'success');
    } catch (error) {
        console.error('Error al exportar:', error);
        hideLoading();
        showToast('Error al exportar el archivo: ' + error.message, 'error');
    }
}