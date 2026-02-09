/**
 * SISTEMA DE FACTURACIÓN - DÁTIL API (SRI ECUADOR)
 * Physio Mefrobal
 * Documentación: https://datil.dev
 */

(function () {
    'use strict';

    // ========== CONFIGURACIÓN GLOBAL ==========
    let tieneSeguro = false;
    let insuranceCompanyId = null;
    let esAseguradora = false;
    let contadorItems = 0;
    let contadorPagos = 0;

    // ========== CATÁLOGOS DÁTIL ==========

    /**
     * Formas de pago según Dátil
     * https://datil.dev/docs/ec/formas-de-pago
     */
    const FORMAS_PAGO_DATIL = [
        { value: '01', text: 'Efectivo' },
        { value: '15', text: 'Compensación de deudas' },
        { value: '16', text: 'Tarjeta de débito' },
        { value: '17', text: 'Dinero electrónico' },
        { value: '18', text: 'Tarjeta prepago' },
        { value: '19', text: 'Tarjeta de crédito' },
        { value: '20', text: 'Transferencia bancaria' },
        { value: '21', text: 'Endoso de títulos' }
    ];

    /**
     * Tipos de identificación según Dátil
     * https://datil.dev/docs/ec/tipos-de-identificacion
     */
    const TIPOS_IDENTIFICACION_DATIL = {
        '04': { codigo: '04', nombre: 'RUC', longitud: 13 },
        '05': { codigo: '05', nombre: 'Cédula', longitud: 10 },
        '06': { codigo: '06', nombre: 'Pasaporte', longitud: [5, 20] },
        '07': { codigo: '07', nombre: 'Consumidor Final', valor: '9999999999999' },
        '08': { codigo: '08', nombre: 'Identificación del Exterior', longitud: [3, 20] }
    };

    // ========== VALIDACIONES SRI ECUADOR ==========

    /**
     * Validación de Cédula ecuatoriana (10 dígitos)
     * Algoritmo módulo 10 del SRI
     */
    function validarCedulaEcuador(cedula) {
        if (!cedula || cedula.length !== 10) return false;

        // Validar que sean solo números
        if (!/^\d+$/.test(cedula)) return false;

        const digitos = cedula.split('').map(Number);
        const provincia = parseInt(cedula.substring(0, 2));

        // Validar código de provincia (01-24)
        if (provincia < 1 || provincia > 24) return false;

        // Validar tercer dígito (debe ser menor a 6 para personas naturales)
        if (digitos[2] > 5) return false;

        // Aplicar algoritmo módulo 10
        const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;

        for (let i = 0; i < 9; i++) {
            let valor = digitos[i] * coeficientes[i];
            if (valor >= 10) valor -= 9;
            suma += valor;
        }

        const digitoVerificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
        return digitoVerificador === digitos[9];
    }

    /**
     * Validación de RUC ecuatoriano (13 dígitos)
     * Tipos: Natural, Sociedad Privada, Sociedad Pública
     */
    function validarRUCEcuador(ruc) {
        if (!ruc || ruc.length !== 13) return false;

        // Validar que sean solo números
        if (!/^\d+$/.test(ruc)) return false;

        const tercerDigito = parseInt(ruc.charAt(2));
        const provincia = parseInt(ruc.substring(0, 2));

        // Validar provincia
        if (provincia < 1 || provincia > 24) return false;

        // RUC de persona natural (tercer dígito < 6, termina en 001)
        if (tercerDigito >= 0 && tercerDigito < 6) {
            const cedula = ruc.substring(0, 10);
            const establecimiento = ruc.substring(10, 13);
            return validarCedulaEcuador(cedula) && establecimiento === '001';
        }

        // RUC de sociedad privada (tercer dígito = 9)
        if (tercerDigito === 9) {
            const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
            let suma = 0;

            for (let i = 0; i < 9; i++) {
                suma += parseInt(ruc.charAt(i)) * coeficientes[i];
            }

            const residuo = suma % 11;
            const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
            return digitoVerificador === parseInt(ruc.charAt(9));
        }

        // RUC de entidad pública (tercer dígito = 6)
        if (tercerDigito === 6) {
            const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
            let suma = 0;

            for (let i = 0; i < 8; i++) {
                suma += parseInt(ruc.charAt(i)) * coeficientes[i];
            }

            const residuo = suma % 11;
            const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
            return digitoVerificador === parseInt(ruc.charAt(8));
        }

        return false;
    }

    /**
     * Validación de Pasaporte
     * Dátil acepta: 5-20 caracteres alfanuméricos
     */
    function validarPasaporte(pasaporte) {
        if (!pasaporte) return false;
        // Alfanuméricos, entre 5 y 20 caracteres
        const regex = /^[A-Z0-9]{5,20}$/i;
        return regex.test(pasaporte.trim());
    }

    /**
     * Validación de Identificación del Exterior
     * Dátil acepta: 3-20 caracteres alfanuméricos
     */
    function validarIdentificacionExterior(identificacion) {
        if (!identificacion) return false;
        const regex = /^[A-Z0-9]{3,20}$/i;
        return regex.test(identificacion.trim());
    }

    /**
     * Validación de email según RFC 5322
     */
    function validarEmail(email) {
        if (!email) return false;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email.trim());
    }

    /**
     * Validación de teléfono ecuatoriano (opcional pero recomendado)
     * Formato: 10 dígitos, inicia con 0
     */
    function validarTelefonoEcuador(telefono) {
        if (!telefono) return true; // Opcional
        // Formato: 0999999999 (celular) o 0234567890 (convencional)
        const regex = /^0[2-9]\d{8}$/;
        return regex.test(telefono.trim());
    }

    /**
     * Validador principal de identificación según tipo Dátil
     */
    function validarIdentificacionDatil(tipoId, numero) {
        if (!numero) return false;

        numero = numero.trim();

        switch (tipoId) {
            case '04': // RUC
                return validarRUCEcuador(numero);
            case '05': // Cédula
                return validarCedulaEcuador(numero);
            case '06': // Pasaporte
                return validarPasaporte(numero);
            case '07': // Consumidor Final
                return numero === '9999999999999';
            case '08': // Identificación del Exterior
                return validarIdentificacionExterior(numero);
            default:
                return false;
        }
    }

    /**
     * Obtener mensaje de error específico según tipo de documento
     */
    function obtenerMensajeErrorIdentificacion(tipoId) {
        const mensajes = {
            '04': 'RUC inválido. Debe tener 13 dígitos y cumplir con el algoritmo del SRI.',
            '05': 'Cédula inválida. Debe tener 10 dígitos y cumplir con el algoritmo módulo 10 del SRI.',
            '06': 'Pasaporte inválido. Debe tener entre 5 y 20 caracteres alfanuméricos.',
            '07': 'Consumidor Final debe ser: 9999999999999',
            '08': 'Identificación del Exterior inválida. Debe tener entre 3 y 20 caracteres alfanuméricos.'
        };
        return mensajes[tipoId] || 'Identificación inválida';
    }

    // ========== UTILIDADES ==========

    function normalizeNumberInput(value) {
        if (typeof value === 'string') {
            return value.replace(",", ".");
        }
        return value;
    }

    function mostrarError(inputElement, mensaje) {
        inputElement.classList.add('is-invalid');
        const feedback = inputElement.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = mensaje;
        }
    }

    function limpiarError(inputElement) {
        inputElement.classList.remove('is-invalid');
    }

    // ========== INICIALIZACIÓN ==========

    document.addEventListener("DOMContentLoaded", () => {
        // Obtener configuración
        tieneSeguro = document.getElementById("hasInsurance")?.value === "true";
        insuranceCompanyId = document.getElementById("insuranceCompanyId")?.value;
        esAseguradora = tieneSeguro && insuranceCompanyId == "8";

        // Configurar visibilidad según seguro
        if (esAseguradora) {
            document.querySelectorAll(".col-insurance").forEach(el => el.classList.remove("d-none"));
            document.querySelectorAll(".no-insurance").forEach(el => el.classList.add("d-none"));
            const resumenSeguro = document.getElementById("resumen-con-seguro");
            if (resumenSeguro) resumenSeguro.style.display = "block";
        } else {
            const resumenSinSeguro = document.getElementById("resumen-sin-seguro");
            if (resumenSinSeguro) resumenSinSeguro.style.display = "block";
        }

        // Event Listeners
        registrarEventos();
        configurarValidacionFormulario();
        configurarTipoVenta();
    });

    // ========== GESTIÓN DE TIPO DE VENTA ==========

    function configurarTipoVenta() {
        const tipoVentaSelect = document.getElementById('tipoVenta');
        const camposCredito = document.getElementById('campos-credito');
        const seccionMetodosPago = document.getElementById('seccion-metodos-pago');
        const esCreditoInput = document.getElementById('esCredito');
        const creditoDiasInput = document.getElementById('creditoDias');
        const creditoFechaVencimientoInput = document.getElementById('creditoFechaVencimiento');
        const creditoMontoTotalInput = document.getElementById('creditoMontoTotal');

        if (!tipoVentaSelect) return;

        tipoVentaSelect.addEventListener('change', function () {
            const esCredito = this.value === 'credito';

            // Mostrar/ocultar campos
            if (camposCredito) {
                camposCredito.style.display = esCredito ? 'block' : 'none';
            }
            if (seccionMetodosPago) {
                seccionMetodosPago.style.display = esCredito ? 'none' : 'block';
            }
            if (esCreditoInput) {
                esCreditoInput.value = esCredito ? 'true' : 'false';
            }

            // Limpiar métodos de pago si se selecciona crédito
            if (esCredito) {
                const paymentMethodsBody = document.getElementById('payment-methods-body');
                if (paymentMethodsBody) {
                    paymentMethodsBody.innerHTML = '';
                }
                actualizarMontoCredito();
            } else {
                // Limpiar campos de crédito
                if (creditoDiasInput) creditoDiasInput.value = '';
                if (creditoFechaVencimientoInput) creditoFechaVencimientoInput.value = '';
                if (creditoMontoTotalInput) creditoMontoTotalInput.value = '';
            }
        });

        // Calcular fecha de vencimiento al cambiar días
        if (creditoDiasInput) {
            creditoDiasInput.addEventListener('change', function () {
                const dias = parseInt(this.value);
                if (dias > 0 && dias <= 360) {
                    const hoy = new Date();
                    const fechaVencimiento = new Date(hoy);
                    fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

                    const year = fechaVencimiento.getFullYear();
                    const month = String(fechaVencimiento.getMonth() + 1).padStart(2, '0');
                    const day = String(fechaVencimiento.getDate()).padStart(2, '0');

                    if (creditoFechaVencimientoInput) {
                        creditoFechaVencimientoInput.value = `${year}-${month}-${day}`;
                    }
                } else {
                    if (creditoFechaVencimientoInput) {
                        creditoFechaVencimientoInput.value = '';
                    }
                }
            });
        }
    }

    function actualizarMontoCredito() {
        const creditoMontoTotalInput = document.getElementById('creditoMontoTotal');
        if (!creditoMontoTotalInput) return;

        const totalFacturaInput = esAseguradora
            ? document.getElementById('totalFacturaConSeguro')
            : document.getElementById('totalFacturaSinSeguro');

        if (totalFacturaInput) {
            const total = parseFloat(totalFacturaInput.value || 0);
            creditoMontoTotalInput.value = `$${total.toFixed(2)}`;
        }
    }

    function registrarEventos() {
        // Botones principales
        const btnCargarPaciente = document.getElementById('btnCargarDatosPaciente');
        const btnOtrosDatos = document.getElementById('btnOtrosDatos');
        const btnAgregarItem = document.getElementById('btnAgregarItem');
        const btnAgregarPago = document.getElementById('btnAgregarMetodoPago');

        if (btnCargarPaciente) {
            btnCargarPaciente.addEventListener('click', cargarDatosPaciente);
        }
        if (btnOtrosDatos) {
            btnOtrosDatos.addEventListener('click', limpiarFormulario);
        }
        if (btnAgregarItem) {
            btnAgregarItem.addEventListener('click', agregarItem);
        }
        if (btnAgregarPago) {
            btnAgregarPago.addEventListener('click', agregarMetodoPago);
        }

        // Validación en tiempo real de identificación
        const ciInput = document.getElementById('billingCiNumber');
        const docTypeSelect = document.getElementById('billingDocType');

        if (ciInput && docTypeSelect) {
            ciInput.addEventListener('blur', validarCampoIdentificacion);
            ciInput.addEventListener('input', function () {
                // Permitir solo números para cédula y RUC
                const tipo = docTypeSelect.value;
                if (tipo === '04' || tipo === '05') {
                    this.value = this.value.replace(/[^0-9]/g, '');
                }
                limpiarError(this);
            });

            docTypeSelect.addEventListener('change', function () {
                ciInput.value = '';
                limpiarError(ciInput);
                ciInput.readOnly = false;

                // Configurar según tipo de documento Dátil
                const tipo = TIPOS_IDENTIFICACION_DATIL[this.value];
                if (!tipo) return;

                switch (this.value) {
                    case '04': // RUC
                        ciInput.placeholder = '1234567890001';
                        ciInput.maxLength = 13;
                        ciInput.type = 'text';
                        break;
                    case '05': // Cédula
                        ciInput.placeholder = '1234567890';
                        ciInput.maxLength = 10;
                        ciInput.type = 'text';
                        break;
                    case '06': // Pasaporte
                        ciInput.placeholder = 'AB123456';
                        ciInput.maxLength = 20;
                        ciInput.type = 'text';
                        break;
                    case '07': // Consumidor Final
                        ciInput.value = '9999999999999';
                        ciInput.readOnly = true;
                        break;
                    case '08': // Identificación del Exterior
                        ciInput.placeholder = 'ID-EXTERIOR';
                        ciInput.maxLength = 20;
                        ciInput.type = 'text';
                        break;
                }
            });
        }

        // Validación de email (requerido por Dátil para envío de comprobantes)
        const emailInput = document.getElementById('billingEmail');
        if (emailInput) {
            emailInput.addEventListener('blur', function () {
                if (!validarEmail(this.value)) {
                    mostrarError(this, 'Email inválido. Requerido para envío de comprobante electrónico.');
                } else {
                    limpiarError(this);
                }
            });
        }

        // Validación de teléfono
        const phoneInput = document.getElementById('billingPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
            });

            phoneInput.addEventListener('blur', function () {
                if (this.value && !validarTelefonoEcuador(this.value)) {
                    mostrarError(this, 'Teléfono inválido. Formato: 0999999999 (10 dígitos)');
                } else {
                    limpiarError(this);
                }
            });
        }
    }

    function validarCampoIdentificacion() {
        const ciInput = document.getElementById('billingCiNumber');
        const docType = document.getElementById('billingDocType')?.value;

        if (!ciInput || !docType) return false;

        const numero = ciInput.value.trim();

        if (!numero) {
            mostrarError(ciInput, 'La identificación es requerida');
            return false;
        }

        if (!validarIdentificacionDatil(docType, numero)) {
            const mensaje = obtenerMensajeErrorIdentificacion(docType);
            mostrarError(ciInput, mensaje);
            return false;
        }

        limpiarError(ciInput);
        return true;
    }

    function configurarValidacionFormulario() {
        const form = document.getElementById('billingForm');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            let esValido = true;

            // Validar items de factura
            const filas = document.querySelectorAll("#invoice-items-body tr");
            if (filas.length === 0) {
                e.preventDefault();
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin ítems',
                    text: 'Debes agregar al menos un ítem a la factura.'
                });
                return false;
            }

            // Verificar tipo de venta
            const tipoVenta = document.getElementById('tipoVenta')?.value;
            const esCredito = tipoVenta === 'credito';

            // Validar métodos de pago solo si NO es crédito
            if (!esCredito) {
                const paymentRows = document.querySelectorAll("#payment-methods-body tr");
                if (paymentRows.length === 0) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Sin método de pago',
                        text: 'Debes agregar al menos un método de pago para ventas al contado.'
                    });
                    return false;
                }

                // Validar que el total de pagos coincida
                if (!validarTotalPagos()) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'error',
                        title: 'Total incorrecto',
                        text: 'La suma de los métodos de pago debe coincidir con el total de la factura.',
                        footer: 'Verifique los montos ingresados'
                    });
                    return false;
                }
            } else {
                // Validar campos de crédito
                const creditoDias = document.getElementById('creditoDias')?.value;
                if (!creditoDias || parseInt(creditoDias) <= 0) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Datos de crédito incompletos',
                        text: 'Debe ingresar el plazo en días para la factura a crédito.'
                    });
                    return false;
                }
            }

            // Validar datos de facturación (requeridos por Dátil)
            const camposRequeridos = {
                'BillingDetailsNames': 'Nombre completo',
                'BillingDetailsCiNumber': 'Identificación',
                'BillingDetailsEmail': 'Correo electrónico'
            };

            for (const [campo, etiqueta] of Object.entries(camposRequeridos)) {
                const input = this.querySelector(`[name="${campo}"]`);
                if (!input || !input.value.trim()) {
                    e.preventDefault();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Datos incompletos',
                        text: `El campo "${etiqueta}" es requerido por Dátil para la facturación electrónica.`
                    });
                    esValido = false;
                    break;
                }
            }

            if (!esValido) return false;

            // Validar identificación según SRI
            if (!validarCampoIdentificacion()) {
                e.preventDefault();
                Swal.fire({
                    icon: 'error',
                    title: 'Identificación inválida',
                    text: 'La identificación no cumple con los requisitos del SRI.',
                    footer: 'Verifique el número ingresado según el tipo de documento'
                });
                return false;
            }

            // Validar email (requerido por Dátil para envío)
            const emailInput = document.getElementById('billingEmail');
            if (!emailInput || !validarEmail(emailInput.value)) {
                e.preventDefault();
                Swal.fire({
                    icon: 'error',
                    title: 'Email inválido',
                    text: 'El correo electrónico es requerido por Dátil para enviar el comprobante electrónico.'
                });
                return false;
            }

            // Validar teléfono si está presente
            const phoneInput = document.getElementById('billingPhone');
            if (phoneInput && phoneInput.value && !validarTelefonoEcuador(phoneInput.value)) {
                e.preventDefault();
                Swal.fire({
                    icon: 'error',
                    title: 'Teléfono inválido',
                    text: 'El formato del teléfono no es válido para Ecuador.'
                });
                return false;
            }

            // Validar todos los items
            let itemsValidos = true;
            filas.forEach((fila) => {
                const desc = fila.querySelector(".descripcion-select")?.value;
                const cant = parseFloat(normalizeNumberInput(fila.querySelector(".cantidad")?.value));
                let precio;

                if (esAseguradora) {
                    precio = parseFloat(normalizeNumberInput(fila.querySelector(".precio-aseguradora")?.value));
                } else {
                    precio = parseFloat(normalizeNumberInput(fila.querySelector(".precio-sin-seguro")?.value));
                }

                if (!desc || !desc.trim() || isNaN(cant) || cant <= 0 || isNaN(precio) || precio < 0) {
                    itemsValidos = false;
                }
            });

            if (!itemsValidos) {
                e.preventDefault();
                Swal.fire({
                    icon: 'warning',
                    title: 'Ítems incompletos',
                    text: 'Verifica que todos los ítems tengan descripción, cantidad y precio válidos.'
                });
                return false;
            }

            // Si todo es válido, mostrar confirmación
            if (esValido) {
                Swal.fire({
                    title: 'Procesando factura...',
                    html: 'Enviando datos a Dátil para emisión del comprobante electrónico',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }
        });
    }

    // ========== GESTIÓN DE ITEMS ==========

    function agregarItem() {
        const tbody = document.getElementById('invoice-items-body');
        if (!tbody) return;

        const index = contadorItems++;
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>
                <select class="form-control descripcion-select"
                        name="Items[${index}].DescripcionVisible"
                        placeholder="Buscar procedimiento" required></select>
            </td>
            <td>
                <input type="number" class="form-control cantidad" name="Items[${index}].Quantity"
                       min="1" value="1" step="1" required>
            </td>
            <td class="no-insurance ${esAseguradora ? 'd-none' : ''}">
                <input type="number" class="form-control precio-sin-seguro" name="Items[${index}].UnitPrice"
                       min="0" step="0.01" value="0.00" required>
            </td>
            <td class="col-insurance ${esAseguradora ? '' : 'd-none'}">
                <input type="number" class="form-control precio-base-display"
                       min="0" step="0.01" value="0.00" readonly style="background-color: #f8f9fa;">
            </td>
            <td class="col-insurance ${esAseguradora ? '' : 'd-none'}">
                <input type="number" class="form-control precio-aseguradora" name="Items[${index}].UnitPrice"
                       min="0" step="0.01" value="0.00" required>
            </td>
            <td class="col-insurance ${esAseguradora ? '' : 'd-none'}">
                <input type="number" class="form-control copago" value="0.00" step="0.01" readonly
                       style="background-color: #fff3cd;">
            </td>
            <td>
                <input type="number" class="form-control descuento-item"
                       name="Items[${index}].DescuentoPorcentaje"
                       value="0" min="0" max="100" step="0.01">
            </td>
            <td><input type="number" class="form-control total-item" value="0.00" step="0.01" readonly></td>
            <td>
                <button type="button" class="btn btn-danger btn-sm btn-eliminar-item" title="Eliminar ítem">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);

        // Event listeners para recalcular
        const cantidadInput = row.querySelector('.cantidad');
        const precioSinSeguroInput = row.querySelector('.precio-sin-seguro');
        const precioAseguradoraInput = row.querySelector('.precio-aseguradora');
        const descuentoInput = row.querySelector('.descuento-item');
        const btnEliminar = row.querySelector('.btn-eliminar-item');

        if (cantidadInput) {
            cantidadInput.addEventListener('change', function () {
                recalcularItem(this);
            });
        }
        if (precioSinSeguroInput) {
            precioSinSeguroInput.addEventListener('change', function () {
                recalcularItem(this);
            });
        }
        if (precioAseguradoraInput) {
            precioAseguradoraInput.addEventListener('change', function () {
                recalcularItem(this);
            });
        }
        if (descuentoInput) {
            descuentoInput.addEventListener('change', function () {
                recalcularItem(this);
            });
        }
        if (btnEliminar) {
            btnEliminar.addEventListener('click', function () {
                eliminarItem(this);
            });
        }

        // Configurar Select2
        const select = row.querySelector(".descripcion-select");
        if (select && window.jQuery && window.jQuery.fn.select2) {
            jQuery(select).select2({
                placeholder: "Buscar procedimiento",
                minimumInputLength: 2,
                width: '100%',
                language: {
                    inputTooShort: function () {
                        return "Ingrese al menos 2 caracteres";
                    },
                    searching: function () {
                        return "Buscando...";
                    },
                    noResults: function () {
                        return "No se encontraron resultados";
                    }
                },
                ajax: {
                    url: window.BillingConfig?.urlBuscarProcedimientos || '/Tarifario/BuscarProcedimientos',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return {
                            termino: params.term,
                            insuranceCompanyId: insuranceCompanyId
                        };
                    },
                    processResults: function (data) {
                        return { results: data };
                    },
                    cache: true
                }
            }).on('select2:select', function (e) {
                handleProcedimientoSeleccionado(e);
            });
        }
    }

    function handleProcedimientoSeleccionado(e) {
        const selected = e.params.data;
        const fila = e.target.closest("tr");
        if (!fila) return;

        const filaIndex = Array.from(fila.parentNode.children).indexOf(fila);

        // Crear/actualizar campos hidden para Dátil
        actualizarCampoHidden(fila, filaIndex, 'Code', selected.id || "");
        actualizarCampoHidden(fila, filaIndex, 'Description', selected.text || "");

        const precioBase = parseFloat(normalizeNumberInput(selected.precio?.toString() || "0")) || 0;
        const precioAseguradora = parseFloat(normalizeNumberInput(selected.precio_aseguradora?.toString() || "0")) || 0;

        actualizarCampoHidden(fila, filaIndex, 'PrecioBase', precioBase.toFixed(2), 'precio-base-hidden');

        const precioBaseDisplay = fila.querySelector(".precio-base-display");

        if (esAseguradora) {
            const precioAseguradoraInput = fila.querySelector(".precio-aseguradora");
            if (precioBaseDisplay) precioBaseDisplay.value = precioBase.toFixed(2);
            if (precioAseguradoraInput) {
                precioAseguradoraInput.value = precioAseguradora.toFixed(2);
                recalcularItem(precioAseguradoraInput);
            }
        } else {
            const precioSinSeguroInput = fila.querySelector(".precio-sin-seguro");
            if (precioSinSeguroInput) {
                precioSinSeguroInput.value = precioBase.toFixed(2);
                recalcularItem(precioSinSeguroInput);
            }
        }
    }

    function actualizarCampoHidden(fila, index, fieldName, value, className = null) {
        const name = `Items[${index}].${fieldName}`;
        let hidden = fila.querySelector(`input[name="${name}"]`);

        if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = name;
            if (className) hidden.classList.add(className);
            fila.appendChild(hidden);
        }

        hidden.value = value;
    }

    function eliminarItem(btn) {
        Swal.fire({
            title: '¿Eliminar ítem?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                btn.closest('tr').remove();
                recalcularTotal();
            }
        });
    }

    function recalcularItem(elemento) {
        const fila = elemento.closest('tr');
        if (!fila) return;

        const cantidadInput = fila.querySelector('.cantidad');
        const cantidad = parseFloat(normalizeNumberInput(cantidadInput?.value || 0));

        let precioUnitario;
        if (esAseguradora) {
            const precioAseguradoraInput = fila.querySelector('.precio-aseguradora');
            precioUnitario = parseFloat(normalizeNumberInput(precioAseguradoraInput?.value || 0));
        } else {
            const precioSinSeguroInput = fila.querySelector('.precio-sin-seguro');
            precioUnitario = parseFloat(normalizeNumberInput(precioSinSeguroInput?.value || 0));
        }

        const descuentoInput = fila.querySelector('.descuento-item');
        let descuentoPorcentaje = parseFloat(normalizeNumberInput(descuentoInput?.value || 0));
        if (descuentoPorcentaje < 0) descuentoPorcentaje = 0;
        if (descuentoPorcentaje > 100) descuentoPorcentaje = 100;
        if (descuentoInput) descuentoInput.value = descuentoPorcentaje;

        let copago = 0;
        if (esAseguradora) {
            const precioBaseHidden = fila.querySelector('.precio-base-hidden');
            const precioBase = precioBaseHidden ? parseFloat(precioBaseHidden.value || 0) : precioUnitario;
            copago = precioBase - precioUnitario;
        }

        const copagoInput = fila.querySelector('.copago');
        if (copagoInput) copagoInput.value = copago.toFixed(2);

        const precioConDescuento = precioUnitario - (precioUnitario * descuentoPorcentaje / 100);
        const subtotal = precioConDescuento * cantidad;

        const totalItemInput = fila.querySelector('.total-item');
        if (totalItemInput) totalItemInput.value = subtotal.toFixed(2);

        recalcularTotal();
    }

    function recalcularTotal() {
        let totalFactura = 0;
        let totalPrecioBase = 0;
        let totalCopago = 0;

        const filas = document.querySelectorAll("#invoice-items-body tr");
        filas.forEach(fila => {
            const cantidadInput = fila.querySelector(".cantidad");
            const cantidad = parseFloat(normalizeNumberInput(cantidadInput?.value || 0));

            let precioUnitario;
            if (esAseguradora) {
                const precioAseguradoraInput = fila.querySelector(".precio-aseguradora");
                precioUnitario = parseFloat(normalizeNumberInput(precioAseguradoraInput?.value || 0));
            } else {
                const precioSinSeguroInput = fila.querySelector(".precio-sin-seguro");
                precioUnitario = parseFloat(normalizeNumberInput(precioSinSeguroInput?.value || 0));
            }

            const descuentoInput = fila.querySelector('.descuento-item');
            const descuentoPorcentaje = parseFloat(normalizeNumberInput(descuentoInput?.value || 0));

            if (esAseguradora) {
                const precioBaseHidden = fila.querySelector('.precio-base-hidden');
                const precioBase = precioBaseHidden ? parseFloat(precioBaseHidden.value || 0) : 0;

                totalPrecioBase += precioBase * cantidad;
                totalFactura += precioUnitario * cantidad;
                totalCopago += (precioBase - precioUnitario) * cantidad;
            } else {
                const precioConDescuento = precioUnitario - (precioUnitario * descuentoPorcentaje / 100);
                totalFactura += cantidad * precioConDescuento;
            }
        });

        if (esAseguradora) {
            const totalFacturaInput = document.getElementById('totalFacturaConSeguro');
            const totalPrecioBaseInput = document.getElementById('totalPrecioBase');
            const totalCopagoInput = document.getElementById('totalCopago');

            if (totalFacturaInput) totalFacturaInput.value = totalFactura.toFixed(2);
            if (totalPrecioBaseInput) totalPrecioBaseInput.value = totalPrecioBase.toFixed(2);
            if (totalCopagoInput) totalCopagoInput.value = totalCopago.toFixed(2);
        } else {
            const totalFacturaInput = document.getElementById('totalFacturaSinSeguro');
            if (totalFacturaInput) totalFacturaInput.value = totalFactura.toFixed(2);
        }

        // Actualizar monto de crédito si aplica
        const tipoVenta = document.getElementById('tipoVenta')?.value;
        if (tipoVenta === 'credito') {
            actualizarMontoCredito();
        }

        validarTotalPagos();
    }

    // ========== GESTIÓN DE MÉTODOS DE PAGO ==========

    function agregarMetodoPago() {
        const tbody = document.getElementById('payment-methods-body');
        if (!tbody) return;

        const index = contadorPagos++;

        const totalFacturaInput = esAseguradora
            ? document.getElementById('totalFacturaConSeguro')
            : document.getElementById('totalFacturaSinSeguro');

        const totalFactura = totalFacturaInput ? parseFloat(totalFacturaInput.value || 0) : 0;

        const optionsHtml = FORMAS_PAGO_DATIL.map(opt =>
            `<option value="${opt.value}">${opt.text}</option>`
        ).join('');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <select class="form-control" name="PaymentMethods[${index}].PaymentMethod" required>
                    ${optionsHtml}
                </select>
            </td>
            <td>
                <input type="number" class="form-control payment-amount"
                       name="PaymentMethods[${index}].PaymentAmount"
                       step="0.01" min="0.01" max="${totalFactura}" 
                       placeholder="0.00" required>
            </td>
            <td>
               <input type="file" class="form-control payment-proof-file"
                      name="PaymentMethods[${index}].PaymentProof"
                      accept=".jpeg,.jpg,.png,.pdf">
               <small class="text-muted">Opcional</small>
            </td>
            <td>
                <input type="text" class="form-control"
                       name="PaymentMethods[${index}].PaymentNotes"
                       placeholder="Notas opcionales">
            </td>
            <td>
                <button type="button" class="btn btn-danger btn-sm btn-eliminar-pago" title="Eliminar método">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);

        // Event listeners
        const paymentAmountInput = row.querySelector('.payment-amount');
        const btnEliminarPago = row.querySelector('.btn-eliminar-pago');

        if (paymentAmountInput) {
            paymentAmountInput.addEventListener('change', validarTotalPagos);
            paymentAmountInput.addEventListener('input', validarTotalPagos);
        }
        if (btnEliminarPago) {
            btnEliminarPago.addEventListener('click', function () {
                eliminarMetodoPago(this);
            });
        }

        validarTotalPagos();
    }

    function eliminarMetodoPago(btn) {
        btn.closest('tr').remove();
        validarTotalPagos();
    }

    function validarTotalPagos() {
        // No validar si es venta a crédito
        const tipoVenta = document.getElementById('tipoVenta')?.value;
        if (tipoVenta === 'credito') {
            return true;
        }

        const totalFacturaInput = esAseguradora
            ? document.getElementById('totalFacturaConSeguro')
            : document.getElementById('totalFacturaSinSeguro');

        if (!totalFacturaInput) {
            console.error('No se encontró el input de total factura');
            return false;
        }

        const totalFactura = parseFloat(totalFacturaInput.value || 0);
        let totalPagos = 0;

        const paymentInputs = document.querySelectorAll('.payment-amount');
        paymentInputs.forEach(input => {
            totalPagos += parseFloat(input.value || 0);
        });

        const pendiente = totalFactura - totalPagos;
        const pendienteElement = document.getElementById('total-pendiente');

        if (pendienteElement) {
            pendienteElement.textContent = Math.abs(pendiente).toFixed(2);
            const alert = pendienteElement.closest('.alert');

            if (alert) {
                if (Math.abs(pendiente) > 0.01) {
                    alert.classList.remove('alert-success');
                    alert.classList.add('alert-warning');
                } else {
                    alert.classList.remove('alert-warning');
                    alert.classList.add('alert-success');
                }
            }
        }

        return Math.abs(pendiente) < 0.01;
    }

    // ========== DATOS DEL PACIENTE ==========

    function cargarDatosPaciente() {
        const patientIdInput = document.getElementById("AppointmentPatientId");
        const patientId = parseInt(patientIdInput?.value, 10);

        if (!patientId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontró el ID del paciente.'
            });
            return;
        }

        Swal.fire({
            title: 'Cargando...',
            text: 'Obteniendo datos del paciente',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const url = window.BillingConfig?.urlGetPatientDetails || '/Patient/GetPatientDetails';
        fetch(`${url}?patientId=${patientId}`)
            .then(r => {
                if (!r.ok) throw new Error('Error en la respuesta del servidor');
                return r.json();
            })
            .then(data => {
                const form = document.getElementById('billingForm');
                if (!form) {
                    throw new Error('No se encontró el formulario');
                }

                const campos = {
                    BillingDetailsNames: (
                        (data.patientFirstsurname ?? '') + ' ' +
                        (data.patientSecondlastname ?? '') + ' ' +
                        (data.patientFirstname ?? '') + ' ' +
                        (data.patientMiddlename ?? '')
                    ).trim(),
                    BillingDetailsCiNumber: data.patientDocumentnumber || '',
                    BillingDetailsDocumentType: data.patientDocumentType || '05',
                    BillingDetailsEmail: data.patientEmail || '',
                    BillingDetailsAddress: data.patientAddress || '',
                    BillingDetailsPhone: data.patientCellularPhone || ''
                };

                for (const name in campos) {
                    const input = form.querySelector(`[name="${name}"]`);
                    if (input) {
                        input.value = campos[name];
                        limpiarError(input);
                    }
                }

                const collapseDiv = document.getElementById('facturacion-extra');
                if (collapseDiv && window.bootstrap?.Collapse) {
                    new bootstrap.Collapse(collapseDiv, { toggle: true });
                }

                Swal.close();

                // Validar identificación cargada
                setTimeout(validarCampoIdentificacion, 300);
            })
            .catch(err => {
                console.error('Error al cargar datos del paciente:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Hubo un error al obtener los datos del paciente: ' + err.message
                });
            });
    }

    function limpiarFormulario() {
        const form = document.getElementById('billingForm');
        if (!form) return;

        const campos = ['BillingDetailsNames', 'BillingDetailsCiNumber', 'BillingDetailsDocumentType',
            'BillingDetailsEmail', 'BillingDetailsAddress', 'BillingDetailsPhone'];

        campos.forEach(campo => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (input) {
                input.value = '';
                limpiarError(input);
            }
        });

        // Resetear tipo de documento a Cédula
        const docTypeSelect = document.getElementById('billingDocType');
        if (docTypeSelect) {
            docTypeSelect.value = '05';
        }
    }

})();