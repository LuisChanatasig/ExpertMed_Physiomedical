/**
 * EXPERTMED - Gestión Clínica Physio Mefrobal
 * Controlador de Historial Clínico y Evolución de Pacientes
 */
window.HistorialController = (function () {
    'use strict';

    // ========== FUNCIONES PRIVADAS ==========

    /**
     * Sincroniza el valor del porcentaje entre los controles
     */
    const sincronizarPorcentaje = (valor) => {
        const inputPorcentaje = document.getElementById('avancePorcentaje');
        const inputRange = document.getElementById('avanceRange');
        const displayPorcentaje = document.getElementById('displayPorcentaje');

        if (inputPorcentaje) inputPorcentaje.value = valor;
        if (inputRange) inputRange.value = valor;
        if (displayPorcentaje) displayPorcentaje.innerText = `${valor}%`;
    };

    // ========== API PÚBLICA ==========

    return {
        /**
         * Abre el modal de avance con los datos de la sesión
         * @param {number} id - ID de la sesión
         * @param {number} porcentaje - Porcentaje de avance actual
         * @param {string} notas - Notas de evolución
         */
        abrirModalAvance: function (id, porcentaje, notas) {
            const inputId = document.getElementById('avanceSessionId');
            const inputNotas = document.getElementById('avanceNotas');

            if (inputId) inputId.value = id;
            if (inputNotas) inputNotas.value = decodeURIComponent(notas || '');

            sincronizarPorcentaje(porcentaje);

            const modalEl = document.getElementById('modalAvance');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        },

        /**
         * Guarda el avance clínico de la sesión
         */
        guardarAvance: async function () {
            const sessionId = document.getElementById('avanceSessionId')?.value;
            const porcentaje = document.getElementById('avancePorcentaje')?.value;
            const notas = document.getElementById('avanceNotas')?.value;

            if (!sessionId) {
                Swal.fire('Advertencia', 'No se ha seleccionado una sesión válida.', 'warning');
                return;
            }

            const url = window.TherapyUrls?.updateProgress;
            if (!url) {
                Swal.fire('Error', 'No se ha configurado la URL de actualización.', 'error');
                return;
            }

            Swal.fire({
                title: 'Actualizando Historial...',
                html: 'Guardando notas de evolución',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // CAMBIO: Enviar como FormData (application/x-www-form-urlencoded)
                const formData = new URLSearchParams();
                formData.append('sessionId', sessionId);
                formData.append('avance', porcentaje);
                formData.append('comentarios', notas || '');

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString()
                });

                if (response.ok) {
                    await Swal.fire({
                        icon: 'success',
                        title: '¡Evolución Guardada!',
                        text: 'El historial clínico ha sido actualizado.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    location.reload();
                } else {
                    Swal.fire('Error', 'No se pudo completar la acción', 'error');
                }
            } catch (err) {
                console.error('Error al guardar avance:', err);
                Swal.fire('Error de Conexión', 'No se pudo contactar con el servidor clínico.', 'error');
            }
        },

        /**
         * Genera e imprime el reporte de evolución del paciente
         * @param {number} pIdx - Índice del paciente
         * @param {number} sIdx - Índice de la solicitud
         */
        imprimirReporteEvolucion: function (pIdx, sIdx) {
            const paciente = window.historialClinico?.[pIdx];
            const solicitud = paciente?.Solicitudes?.[sIdx];

            if (!paciente || !solicitud) {
                Swal.fire('Error', 'No se encontraron datos para imprimir.', 'error');
                return;
            }

            const ventanaImpresion = window.open('', '_blank');

            ventanaImpresion.document.write(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Reporte de Evolución - Physio Mefrobal</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            padding: 40px; 
                            color: #333; 
                            line-height: 1.6;
                        }
                        .header { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center;
                            border-bottom: 3px solid #2A5C66; 
                            padding-bottom: 15px;
                            margin-bottom: 30px;
                        }
                        .brand { 
                            color: #2A5C66; 
                            font-size: 28px; 
                            font-weight: bold; 
                        }
                        .contact-info {
                            text-align: right;
                            font-size: 11px;
                            color: #666;
                        }
                        .title { 
                            text-align: center; 
                            color: #2A5C66; 
                            margin: 20px 0;
                            font-size: 22px;
                            text-transform: uppercase; 
                            letter-spacing: 1px;
                        }
                        .patient-info {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            font-size: 13px;
                        }
                        .patient-info strong { color: #2A5C66; }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 20px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        thead { background: #2A5C66; color: white; }
                        th { 
                            padding: 12px; 
                            text-align: left; 
                            font-size: 11px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        td { 
                            padding: 12px; 
                            border-bottom: 1px solid #e9ecef; 
                            font-size: 12px; 
                        }
                        tbody tr:hover { background: #f8f9fa; }
                        .progress-bar-container { 
                            background: #e9ecef; 
                            width: 100%; 
                            height: 10px; 
                            border-radius: 5px;
                            overflow: hidden;
                            margin-top: 5px;
                        }
                        .progress-bar-fill { 
                            background: linear-gradient(90deg, #2A5C66, #44808d);
                            height: 100%; 
                            border-radius: 5px;
                            transition: width 0.3s ease;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 10px;
                            color: #999;
                            border-top: 1px solid #eee;
                            padding-top: 20px;
                        }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="brand">Physio Mefrobal</div>
                        <div class="contact-info">
                            Guaranda, Ecuador<br>
                            Tel: +593 98 527 5678<br>
                            www.physiomefrobal.com
                        </div>
                    </div>
                    
                    <h3 class="title">Reporte de Evolución Clínica</h3>
                    
                    <div class="patient-info">
                        <strong>Paciente:</strong> ${paciente.NombrePaciente} &nbsp;|&nbsp; 
                        <strong>Cédula:</strong> ${paciente.CedulaPaciente} &nbsp;|&nbsp; 
                        <strong>Terapeuta:</strong> ${solicitud.TerapeutaNombre} &nbsp;|&nbsp; 
                        <strong>Fecha Solicitud:</strong> ${new Date(solicitud.FechaSolicitud).toLocaleDateString('es-EC')}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo de Terapia</th>
                                <th>Avance (%)</th>
                                <th>Observaciones Clínicas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${solicitud.Sesiones.map(sesion => `
                                <tr>
                                    <td>${new Date(sesion.Fecha).toLocaleDateString('es-EC')}</td>
                                    <td><strong>${sesion.Tipo}</strong></td>
                                    <td>
                                        ${sesion.AvancePorcentaje}%
                                        <div class="progress-bar-container">
                                            <div class="progress-bar-fill" style="width:${sesion.AvancePorcentaje}%"></div>
                                        </div>
                                    </td>
                                    <td>${sesion.AvanceNotas || '<em>Sin observaciones registradas</em>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        Documento generado el ${new Date().toLocaleString('es-EC')}<br>
                        Este reporte es confidencial y de uso exclusivo médico
                    </div>
                </body>
                </html>
            `);

            ventanaImpresion.document.close();

            // Imprimir después de cargar completamente
            setTimeout(() => {
                ventanaImpresion.focus();
                ventanaImpresion.print();
            }, 500);
        },

        /**
         * Expone la función de sincronización de porcentaje
         */
        sincronizarPorcentaje: sincronizarPorcentaje
    };
})();

// ========== INICIALIZACIÓN DE EVENTOS ==========

document.addEventListener('DOMContentLoaded', () => {
    // Buscador global de pacientes
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            const query = this.value.toLowerCase().trim();
            document.querySelectorAll('.grupo-historial').forEach(card => {
                const texto = card.innerText.toLowerCase();
                card.style.display = texto.includes(query) ? '' : 'none';
            });
        });
    }

    // Botón guardar avance
    const btnGuardarAvance = document.getElementById('btnGuardarAvance');
    if (btnGuardarAvance) {
        btnGuardarAvance.addEventListener('click', () => {
            window.HistorialController.guardarAvance();
        });
    }

    // Sincronización de porcentaje en modal de avance
    const inputPorcentaje = document.getElementById('avancePorcentaje');
    const inputRange = document.getElementById('avanceRange');

    if (inputPorcentaje) {
        inputPorcentaje.addEventListener('input', function () {
            window.HistorialController.sincronizarPorcentaje(this.value);
        });
    }

    if (inputRange) {
        inputRange.addEventListener('input', function () {
            window.HistorialController.sincronizarPorcentaje(this.value);
        });
    }
});