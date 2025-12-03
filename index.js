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
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

async function loadBackups() {
    try {
        const result = await window.Storage.get('backup-data');
        if (result) {
            backups = JSON.parse(result.value);
        }
    } catch (error) {
        console.log('No hay datos previos, iniciando con datos vacíos');
    } finally {
        hideLoading();
        renderLists();
    }
}

async function saveBackups() {
    try {
        showLoading();
        await window.Storage.set('backup-data', JSON.stringify(backups));
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al guardar:', error);
        hideLoading();
        showToast('Error al guardar los datos', 'error');
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
                <input type="checkbox" id="${item}" data-item="${item}">
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
    historyList.classList.toggle('hidden');
}

function setupCheckboxListeners() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const item = e.target.dataset.item;
            selectedItems[item] = e.target.checked;
            updateSaveButton();
        });
    });
}

function updateSaveButton() {
    const saveBtn = document.getElementById('guardar');
    const hasSelection = Object.values(selectedItems).some(v => v);
    
    if (hasSelection) {
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Guardar Copias Seleccionadas';
    } else {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Selecciona elementos para guardar';
    }
}

function setupEventListeners() {
    document.getElementById('guardar').addEventListener('click', handleSave);
    document.getElementById('exportar').addEventListener('click', exportToExcel);
}

async function handleSave() {
    const timestamp = getCurrentTimestamp();
    
    Object.keys(selectedItems).forEach(item => {
        if (selectedItems[item]) {
            const category = Object.keys(backups).find(cat => 
                backups[cat].hasOwnProperty(item)
            );
            if (category) {
                backups[category][item] = [
                    timestamp,
                    ...backups[category][item].slice(0, 9)
                ];
            }
        }
    });
    
    const success = await saveBackups();
    
    if (success) {
        selectedItems = {};
        
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        renderLists();
        updateSaveButton();
        showToast('¡Copias de seguridad guardadas exitosamente!', 'success');
    }
}

function exportToExcel() {
    showLoading();
    
    try {
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
        showToast('Error al exportar el archivo', 'error');
    }
}