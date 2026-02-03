// ============================================================
// fisioterapia-agenda.js - Gestión de Agenda de Fisioterapia
// ============================================================

const config = (() => {
    const meta = document.getElementById('session-metadata');
    return meta ? JSON.parse(meta.dataset.config) : {};
})();

const UI = {
    inputs: {
        patientId: document.getElementById('patientId'),
        therapistId: document.getElementById('therapistId'),
        therapyType: document.getElementById('therapyType'),
        date: document.getElementById('date'),
        hour: document.getElementById('hour'),
        frequency: document.getElementById('frequency'),
        sessionCount: document.getElementById('sessionCount'),
        observations: document.getElementById('observations')
    },
    buttons: {
        proyectar: document.getElementById('btnProyectar'),
        guardar: document.getElementById('btnGuardar'),
        imprimir: document.getElementById('btnImprimir')
    },
    table: {
        tbody: document.querySelector('#tablaTerapias tbody')
    }
};

let therapySessions = [];
let flatpickrInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeFlatpickr();
    initializeEventListeners();
});

function initializeFlatpickr() {
    flatpickrInstance = flatpickr("#date", {
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: "es",
        altInput: true,
        altFormat: "d/m/Y",
        onChange: (selectedDates, dateStr) => {
            if (dateStr) cargarHorasDisponibles(dateStr);
        }
    });
}

function initializeEventListeners() {
    UI.buttons.proyectar.addEventListener('click', proyectarSesiones);
    UI.buttons.guardar.addEventListener('click', guardarPlanCompleto);
    UI.buttons.imprimir.addEventListener('click', prepararImpresion);

    if (UI.inputs.therapistId && UI.inputs.therapistId.tagName === 'SELECT') {
        UI.inputs.therapistId.addEventListener('change', () => {
            if (UI.inputs.date.value) cargarHorasDisponibles(UI.inputs.date.value);
        });
    }
}

async function cargarHorasDisponibles(date) {
    if (!UI.inputs.therapistId.value) return;
    try {
        UI.inputs.hour.innerHTML = '<option value="">Cargando...</option>';
        const params = new URLSearchParams({ userId: UI.inputs.therapistId.value, date: date });
        const res = await fetch(`${config.urlGetHours}?${params}`);
        const horas = await res.json();
        UI.inputs.hour.innerHTML = '<option value="">Seleccione hora...</option>';
        (horas.hours || horas).forEach(h => UI.inputs.hour.add(new Option(h, h)));
        UI.inputs.hour.disabled = false;
    } catch (e) { console.error(e); }
}

function proyectarSesiones() {
    const v = UI.inputs;
    if (!v.patientId.value || !v.date.value || !v.hour.value) {
        return Swal.fire('Atención', 'Complete paciente, fecha y hora.', 'warning');
    }

    const count = parseInt(v.sessionCount.value);
    const freq = parseInt(v.frequency.value);
    const startStr = v.date.value;

    for (let i = 0; i < count; i++) {
        let dateObj = new Date(startStr + 'T00:00:00');
        dateObj.setDate(dateObj.getDate() + (i * freq));

        therapySessions.push({
            sessionNumber: therapySessions.length + 1,
            therapyType: v.therapyType.value,
            date: dateObj.toISOString().split('T')[0],
            hour: v.hour.value,
            observations: v.observations.value || 'Sin observaciones'
        });
    }
    renderTable();
    UI.buttons.guardar.disabled = false;
    flatpickrInstance.clear();
}

function renderTable() {
    UI.table.tbody.innerHTML = therapySessions.length === 0 
        ? '<tr><td colspan="6" class="text-center text-muted py-4">No hay sesiones</td></tr>'
        : '';

    therapySessions.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center">${s.sessionNumber}</td>
            <td><input type="text" class="form-control form-control-sm" value="${s.therapyType}" onchange="updateSession(${i}, 'therapyType', this.value)"></td>
            <td><input type="date" class="form-control form-control-sm" value="${s.date}" onchange="updateSession(${i}, 'date', this.value)"></td>
            <td><input type="time" class="form-control form-control-sm" value="${s.hour}" onchange="updateSession(${i}, 'hour', this.value)"></td>
            <td><textarea class="form-control form-control-sm" rows="1" onchange="updateSession(${i}, 'observations', this.value)">${s.observations}</textarea></td>
            <td class="text-center"><button type="button" class="btn btn-sm btn-danger" onclick="eliminarSesion(${i})"><i class="mdi mdi-trash-can-outline"></i></button></td>
        `;
        UI.table.tbody.appendChild(tr);
    });
}

function updateSession(i, f, v) { therapySessions[i][f] = v; }

function eliminarSesion(i) {
    therapySessions.splice(i, 1);
    therapySessions.forEach((s, idx) => s.sessionNumber = idx + 1);
    renderTable();
}

async function guardarPlanCompleto() {
    const payload = {
        pacienteId: parseInt(UI.inputs.patientId.value),
        terapeutaId: parseInt(UI.inputs.therapistId.value),
        sesiones: therapySessions.map(s => ({
            tipo: s.therapyType, fecha: s.date, hora: s.hour, sesionesCont: 1, observaciones: s.observations
        }))
    };
    try {
        const res = await fetch(config.urlSubmit, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            Swal.fire('¡Éxito!', 'Plan guardado', 'success').then(() => location.reload());
        }
    } catch (e) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
}

function prepararImpresion() {
    if (therapySessions.length === 0) return Swal.fire('Atención', 'No hay sesiones.', 'info');

    const paciente = UI.inputs.patientId.options[UI.inputs.patientId.selectedIndex].text;
    const terapeuta = UI.inputs.therapistId.tagName === 'SELECT' 
        ? UI.inputs.therapistId.options[UI.inputs.therapistId.selectedIndex].text 
        : UI.inputs.therapistId.value;

    const fechaEmision = new Date().toLocaleDateString('es-ES');

    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Cronograma - Physio Mefrobal</title>
            <style>
                @page { size: portrait; margin: 1cm; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 20px; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2A5C66; padding-bottom: 10px; }
                .logo-placeholder { color: #2A5C66; font-weight: bold; font-size: 24px; }
                .company-info { text-align: right; font-size: 11px; color: #555; line-height: 1.4; }
                .title { text-align: center; color: #2A5C66; text-transform: uppercase; margin: 25px 0; letter-spacing: 2px; }
                .patient-data { background: #f4f7f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th { background-color: #2A5C66; color: white; padding: 12px; text-align: left; text-transform: uppercase; }
                td { padding: 10px; border-bottom: 1px solid #B2D8D0; }
                tr:nth-child(even) { background-color: #fcfcfc; }
                .footer-sign { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
                .sign-line { border-top: 1px solid #333; width: 200px; margin-bottom: 5px; }
                .system-tag { text-align: center; font-size: 9px; color: #aaa; margin-top: 40px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-placeholder">Physio Mefrobal</div>
                <div class="company-info">
                    <strong>Consultorio Fisioterapéutico</strong><br>
                    Teléfono: +593 98 527 5678<br>
                    Dirección: Azuay 1209 y Joaquina Galarza, Guaranda<br>
                    Horario: Lun a Vie: 08h00 - 19h00 | Sáb: Previa cita
                </div>
            </div>

            <h2 class="title">Cronograma de Tratamiento</h2>

            <div class="patient-data">
                <div><strong>Paciente:</strong> ${paciente}</div>
                <div><strong>Terapeuta:</strong> ${terapeuta}</div>
                <div><strong>Fecha Emisión:</strong> ${fechaEmision}</div>
                <div><strong>Total Sesiones:</strong> ${therapySessions.length}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="30">#</th>
                        <th width="150">Terapia</th>
                        <th width="80">Fecha</th>
                        <th width="60">Hora</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${therapySessions.map(s => `
                        <tr>
                            <td>${s.sessionNumber}</td>
                            <td>${s.therapyType}</td>
                            <td>${s.date.split('-').reverse().join('/')}</td>
                            <td>${s.hour}</td>
                            <td>${s.observations}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer-sign">
                <div><div class="sign-line"></div><small>Firma del Terapeuta</small></div>
                <div><div class="sign-line"></div><small>Firma del Paciente</small></div>
            </div>

            <div class="system-tag">Documento generado por ExpertMed - Physio Mefrobal © 2026</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
}

window.eliminarSesion = eliminarSesion;
window.updateSession = updateSession;