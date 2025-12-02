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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadBackups();
    renderLists();
    setupEventListeners();
});

// Cargar datos guardados
async function loadBackups() {
    try {
        const result = await window.storage.get('backup-data');
        if (result) {
            backups = JSON.parse(result.value);
            renderLists();
        }
    } catch (error) {
        console.log('No hay datos previos');
    }
}

// Guardar datos
async function saveBackups() {
    try {
        await window.storage.set('backup-data', JSON.stringify(backups));
    } catch (error) {
        console.error('Error al guardar:', error);
    }
}

// Obtener fecha y hora actual formateada
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

// Obtener última copia
function getLastBackup(item, category) {
    const backupList = backups[category][item];
    if (backupList && backupList.length > 0) {
        return backupList[0];
    }
    return 'Nunca';
}

// Calcular días desde última copia
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

// Crear elemento de backup
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

// Renderizar listas
function renderLists() {
    const clasificadosList = document.getElementById('clasificados-list');
    const suscripcionesList = document.getElementById('suscripciones-list');
    
    clasificadosList.innerHTML = '';
    suscripcionesList.innerHTML = '';
    
    Object.keys(backups.clasificados).forEach(item => {
        clasificadosList.appendChild(createBackupItem(item, 'clasificados'));
    });
    
    Object.keys(backups.suscripciones).forEach(item => {
        suscripcionesList.appendChild(createBackupItem(item, 'suscripciones'));
    });
    
    setupCheckboxListeners();
}

// Mostrar/ocultar historial
function toggleHistory(item) {
    const historyList = document.getElementById(`history-${item}`);
    historyList.classList.toggle('hidden');
}

// Configurar listeners de checkboxes
function setupCheckboxListeners() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const item = e.target.dataset.item;
            selectedItems[item] = e.target.checked;
            updateSaveButton();
        });
    });
}

// Actualizar botón de guardar
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

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('guardar').addEventListener('click', handleSave);
    document.getElementById('exportar').addEventListener('click', exportToExcel);
}

// Manejar guardado
function handleSave() {
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
    
    saveBackups();
    selectedItems = {};
    renderLists();
    updateSaveButton();
    alert('Copias de seguridad guardadas exitosamente');
}

// Exportar a Excel
function exportToExcel() {
    // Obtener el rango de fechas (últimos 30 días)
    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date);
    }

    // Preparar datos para Excel
    const excelData = [];
    
    // Encabezado
    const header = ['Categoría', 'Elemento'];
    dates.forEach(date => {
        header.push(date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    });
    excelData.push(header);

    // Procesar cada categoría
    Object.keys(backups).forEach(category => {
        Object.keys(backups[category]).forEach(item => {
            const row = [
                category.charAt(0).toUpperCase() + category.slice(1),
                item
            ];

            // Para cada fecha, verificar si hay copia
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

    // Agregar resumen al final
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

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Ajustar ancho de columnas
    const colWidths = [
        { wch: 15 }, // Categoría
        { wch: 12 }  // Elemento
    ];
    dates.forEach(() => colWidths.push({ wch: 12 }));
    ws['!cols'] = colWidths;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Copias de Seguridad');

    // Generar y descargar el archivo
    const fileName = `copias_seguridad_${today.toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
