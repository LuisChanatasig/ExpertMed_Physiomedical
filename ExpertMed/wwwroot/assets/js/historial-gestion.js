/**
<<<<<<< HEAD
 * EXPERTMED - Gestión Clínica Physio Mefrobal
 * Compatible con controlador: UpdateAvance(int sessionId, int avance, string comentarios)
 */
window.HistorialController = (function() {
    // Rutas dinámicas desde la vista
    const urls = window.historialConfig;

=======
 * EXPERTMED - Controlador de Gestión de Historial y Evolución Clínica
 */
window.HistorialController = (function () {
    // Catálogo oficial de precios basado en servicios de fisioterapia
>>>>>>> Fisiomefrobal
    const CATALOGO_PRECIOS = {
        "Fisioterapia neurológica": 15.00, "Fisioterapia deportiva": 12.00,
        "Fisioterapia traumatológica": 12.00, "Fisioterapia geriátrica": 10.00,
        "Fisioterapia pediátrica": 15.00, "Terapia manual y osteopatía": 15.00,
        "Gimnasio terapéutico grupal (día)": 8.00, "Gimnasio terapéutico grupal (mes)": 50.00,
        "Gimnasio terapéutico individual": 12.00, "Infiltraciones de plasma rico en plaquetas": 50.00,
        "Evaluación y diseño del plan de tratamiento": 40.00, "Estimulación temprana": 15.00,
        "Fisioterapia facial": 15.00, "Terapia de acupuntura + moxibustion": 20.00,
        "Terapia neural": 20.00, "Fisioterapia convencional": 10.00
    };

    // Estado interno para procesos de cobro
    let contextCobro = { subtotal: 0, total: 0, paciente: null, items: [] };

    /**
     * Calcula el total de la factura restando el descuento al subtotal
     */
    const recalcularTotales = () => {
        const inputDesc = document.getElementById('pagoDescuento');
        const displaySub = document.getElementById('pagoSubtotalDisplay');
        const displayTotal = document.getElementById('pagoTotalDisplay');

        if (!inputDesc || !displaySub || !displayTotal) return;

        const desc = parseFloat(inputDesc.value) || 0;
        contextCobro.total = Math.max(0, contextCobro.subtotal - desc);

        displaySub.innerText = `$ ${contextCobro.subtotal.toFixed(2)}`;
        displayTotal.innerText = `$ ${contextCobro.total.toFixed(2)}`;
    };

    return {
<<<<<<< HEAD
        // --- SECCIÓN: FACTURACIÓN ---
        abrirModalPago: function(pIdx, sIdx, sesionIdx) {
=======
        /**
         * Inicializa y muestra el modal de avance con los datos de la sesión
         */
        abrirModalAvance: function (id, porcentaje, notas) {
            const inputId = document.getElementById('avanceSessionId');
            const inputPorc = document.getElementById('avancePorcentaje');
            const inputRange = document.getElementById('avanceRange');
            const inputNotas = document.getElementById('avanceNotas');

            if (inputId) inputId.value = id;
            if (inputPorc) inputPorc.value = porcentaje;
            if (inputRange) inputRange.value = porcentaje;
            if (inputNotas) inputNotas.value = decodeURIComponent(notas);

            const modalEl = document.getElementById('modalAvance');
            if (modalEl) {
                const myModal = new bootstrap.Modal(modalEl);
                myModal.show();
            }
        },

        /**
         * Envía los datos de evolución al servidor usando la URL de Razor
         */
        guardarAvance: async function () {
            const sessionId = document.getElementById('avanceSessionId').value;
            const porcentaje = document.getElementById('avancePorcentaje').value;
            const notas = document.getElementById('avanceNotas').value;

            if (!sessionId) return;

            // Ruta obtenida desde window.TherapyUrls definida en la vista
            const url = window.TherapyUrls.updateProgress;

            Swal.fire({
                title: 'Actualizando Historial...',
                html: 'Guardando notas de evolución',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        SessionId: parseInt(sessionId),
                        AvancePorcentaje: parseInt(porcentaje),
                        AvanceNotas: notas
                    })
                });

                const result = await response.json();
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Evolución Guardada!',
                        text: 'El historial clínico ha sido actualizado.',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire('Error', result.message || 'No se pudo completar la acción', 'error');
                }
            } catch (err) {
                Swal.fire('Error de Conexión', 'No se pudo contactar con el servidor clínico.', 'error');
            }
        },

        /**
         * Prepara los datos para el modal de facturación
         */
        abrirModalPago: function (pIdx, sIdx, sesionIdx) {
>>>>>>> Fisiomefrobal
            const paciente = window.historialClinico[pIdx];
            const solicitud = paciente.Solicitudes[sIdx];
            const sesionesTarget = (sesionIdx === null) ? solicitud.Sesiones : [solicitud.Sesiones[sesionIdx]];

            contextCobro.items = sesionesTarget.map(s => ({
                Codigo: "FISIO-001", Descripcion: s.Tipo, Cantidad: 1, Precio: CATALOGO_PRECIOS[s.Tipo] || 10.00
            }));

<<<<<<< HEAD
            contextCobro.subtotal = contextCobro.items.reduce((a, b) => a + b.Precio, 0);
=======
            sesionesTarget.forEach(s => {
                const precio = CATALOGO_PRECIOS[s.Tipo] || 10.00;
                itemsParaFacturar.push({
                    billing_item_code: "FISIO-001",
                    billing_item_description: s.Tipo,
                    billing_item_quantity: 1,
                    billing_item_unit_price: precio
                });
            });

            contextCobro.subtotal = itemsParaFacturar.reduce((a, b) => a + b.billing_item_unit_price, 0);
            contextCobro.items = itemsParaFacturar;
>>>>>>> Fisiomefrobal
            contextCobro.paciente = paciente;

            document.getElementById('pagoNombres').value = paciente.NombrePaciente;
            document.getElementById('pagoIdentificacion').value = paciente.CedulaPaciente;
            document.getElementById('pagoTipoDoc').value = paciente.CedulaPaciente.length === 13 ? "04" : "05";
<<<<<<< HEAD
            document.getElementById('pagoEmail').value = paciente.EmailPaciente || "";
            document.getElementById('pagoDescuento').value = "0.00";
            
=======
            document.getElementById('pagoDescuento').value = "0.00";

>>>>>>> Fisiomefrobal
            recalcularTotales();
            const modalPago = new bootstrap.Modal(document.getElementById('modalPago'));
            modalPago.show();
        },

<<<<<<< HEAD
   confirmarPago: async function() {
        const btn = document.getElementById('btnConfirmarPago');
    
        // CAPTURAMOS EL VALOR DEL SELECT DE TIPO DE DOCUMENTO
        const tipoDoc = document.getElementById('pagoTipoDoc').value;
=======
        /**
         * Procesa el cobro y emite la factura electrónica
         */
        confirmarPago: async function () {
            const url = window.TherapyUrls.processInvoice;

            const payload = {
                pacienteId: contextCobro.paciente.PacienteId,
                totalFactura: contextCobro.total,
                metodoPago: document.getElementById('metodoPago').value,
                nombres: document.getElementById('pagoNombres').value,
                identificacion: document.getElementById('pagoIdentificacion').value,
                tipoIdentificacion: document.getElementById('pagoTipoDoc').value,
                email: document.getElementById('pagoEmail').value,
                items: contextCobro.items
            };
>>>>>>> Fisiomefrobal

        const payload = {
            pacienteId: contextCobro.paciente.PacienteId,
            totalFactura: contextCobro.total,
            metodoPago: document.getElementById('metodoPago').value,
            nombres: document.getElementById('pagoNombres').value,
            identificacion: document.getElementById('pagoIdentificacion').value,
            tipoIdentificacion: tipoDoc, // <-- ESTO ES LO QUE FALTA
            email: document.getElementById('pagoEmail').value,
            items: contextCobro.items
        };

<<<<<<< HEAD
        Swal.fire({ title: 'Emitiendo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const res = await fetch(urls.urlProcessInvoice, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        
            const data = await res.json();
            if (data.success) {
                Swal.fire('¡Éxito!', 'Factura emitida.', 'success').then(() => location.reload());
            } else {
                Swal.fire('Error Dátil', data.message, 'error');
            }
        } catch (e) { 
            Swal.fire('Error', 'Fallo al conectar con el servidor', 'error'); 
        }
    },

        // --- SECCIÓN: AVANCE CLÍNICO ---
        abrirModalAvance: function(id, porcentaje, notas) {
            document.getElementById('avanceSessionId').value = id;
            document.getElementById('avancePorcentaje').value = porcentaje;
            document.getElementById('displayPorcentaje').innerText = porcentaje + "%";
            document.getElementById('avanceNotas').value = decodeURIComponent(notas);
            new bootstrap.Modal(document.getElementById('modalAvance')).show();
        },

        guardarAvance: async function() {
            const btn = document.getElementById('btnGuardarAvance');
            
            // Recolectar datos
            const sessionId = document.getElementById('avanceSessionId').value;
            const avance = document.getElementById('avancePorcentaje').value;
            const comentarios = document.getElementById('avanceNotas').value;

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                // Preparamos los datos como FormUrlEncoded para que coincidan con los parámetros del controlador
                const formData = new URLSearchParams();
                formData.append('sessionId', sessionId);
                formData.append('avance', avance);
                formData.append('comentarios', comentarios);

                const res = await fetch(urls.urlUpdateProgress, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });

                if (res.ok) {
                    Swal.fire({ 
                        icon: 'success', 
                        title: '¡Actualizado!', 
                        timer: 1500, 
                        showConfirmButton: false 
                    }).then(() => {
                        // Como el controlador devuelve RedirectToAction, redirigimos a la URL final
                        window.location.href = res.url; 
                    });
                } else {
                    throw new Error("Error en servidor");
                }
            } catch (e) { 
                Swal.fire('Error', 'No se pudo guardar el progreso.', 'error'); 
            } finally { 
                btn.disabled = false; 
                btn.innerText = 'Actualizar Progreso'; 
            }
        },

        // --- SECCIÓN: IMPRESIÓN ---
        imprimirReporteEvolucion: function(pIdx, sIdx) {
            const paciente = window.historialClinico[pIdx];
            const solicitud = paciente.Solicitudes[sIdx];
            
            const win = window.open('', '_blank');
            win.document.write(`
                <html>
                <head>
                    <title>Reporte de Evolución - Physio Mefrobal</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
                        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2A5C66; padding-bottom: 10px; }
                        .brand { color: #2A5C66; font-size: 24px; font-weight: bold; }
                        .title { text-align: center; color: #2A5C66; margin: 30px 0; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #2A5C66; color: white; padding: 10px; text-align: left; font-size: 11px; }
                        td { padding: 10px; border-bottom: 1px solid #eee; font-size: 11px; }
                        .bar { background: #eee; width: 100%; height: 8px; border-radius: 4px; }
                        .fill { background: #2A5C66; height: 100%; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="brand">Physio Mefrobal</div>
                        <div style="text-align:right; font-size:10px;">Guaranda, Ecuador<br>+593 98 527 5678</div>
                    </div>
                    <h3 class="title">Evolución Clínica</h3>
                    <p><b>Paciente:</b> ${paciente.NombrePaciente} | <b>Terapeuta:</b> ${solicitud.TerapeutaNombre}</p>
                    <table>
                        <thead><tr><th>FECHA</th><th>TERAPIA</th><th>LOGRO (%)</th><th>OBSERVACIONES</th></tr></thead>
                        <tbody>
                            ${solicitud.Sesiones.map(s => `
                                <tr>
                                    <td>${new Date(s.Fecha).toLocaleDateString()}</td>
                                    <td>${s.Tipo}</td>
                                    <td>${s.AvancePorcentaje}% <div class="bar"><div class="fill" style="width:${s.AvancePorcentaje}%"></div></div></td>
                                    <td>${s.AvanceNotas || 'Sin novedades.'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `);
            win.document.close();
            setTimeout(() => win.print(), 500);
        },

=======
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (result.success) {
                    Swal.fire('¡Éxito!', 'Factura procesada correctamente.', 'success').then(() => location.reload());
                } else {
                    Swal.fire('Error', result.message, 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Fallo de conexión al servicio de facturación.', 'error');
            }
        },

>>>>>>> Fisiomefrobal
        recalcularTotales: recalcularTotales
    };
})();

<<<<<<< HEAD
// Inicialización de Eventos DOM
document.addEventListener('DOMContentLoaded', () => {
    // Buscador global
    const search = document.getElementById('globalSearch');
    if (search) {
        search.onkeyup = function() {
            const q = this.value.toLowerCase();
            document.querySelectorAll('.grupo-historial').forEach(el => {
                el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
            });
        };
    }

    // Registro de botones (listeners)
    const btnPago = document.getElementById('btnConfirmarPago');
    if (btnPago) btnPago.onclick = () => window.HistorialController.confirmarPago();

    const btnAvance = document.getElementById('btnGuardarAvance');
    if (btnAvance) btnAvance.onclick = () => window.HistorialController.guardarAvance();

    const inputDesc = document.getElementById('pagoDescuento');
    if (inputDesc) inputDesc.oninput = () => window.HistorialController.recalcularTotales();
=======
/**
 * Inicialización de componentes y eventos al cargar el documento
 */
document.addEventListener('DOMContentLoaded', () => {
    // Buscador Global de Pacientes (Nombre y Cédula)
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.grupo-historial').forEach(card => {
                const text = card.innerText.toLowerCase();
                card.style.display = text.includes(query) ? "" : "none";
            });
        });
    }

    // Vinculación de botones de acción
    const btnGuardarAvance = document.getElementById('btnGuardarAvance');
    if (btnGuardarAvance) {
        btnGuardarAvance.onclick = () => window.HistorialController.guardarAvance();
    }

    const btnConfirmarPago = document.getElementById('btnConfirmarPago');
    if (btnConfirmarPago) {
        btnConfirmarPago.onclick = () => window.HistorialController.confirmarPago();
    }

    const inputDescuento = document.getElementById('pagoDescuento');
    if (inputDescuento) {
        inputDescuento.oninput = () => window.HistorialController.recalcularTotales();
    }
>>>>>>> Fisiomefrobal
});