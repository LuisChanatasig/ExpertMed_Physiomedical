// appointment-manager.js - Lógica principal de gestión de citas

const AppointmentManager = {
    currentAppointmentId: null,
    currentPatientId: null,

    /**
     * Inicializa el manager
     */
    init() {
        this.bindGlobalEvents();
    },

    /**
     * Abre el modal de opciones de cita
     */
    async openOptionsModal(id, status, patientId) {
        try {
            const data = await AppointmentAPI.getById(id);

            console.log('Datos de cita:', data);

            // Guardar IDs actuales
            this.currentAppointmentId = data.appointmentId;
            this.currentPatientId = data.patientId;

            // Rellenar campos ocultos
            FormHelper.setValues({
                appointmentIdInput: data.appointmentId,
                appointmentStatus: data.status,
                appointmentPatientId: data.patientId,
                appointmentPaymentStatus: data.paymentStatus,
                hasLaboratoriesInput: data.hasLaboratories
            });

            // Mostrar u ocultar botones según estado, fecha, pago, etc.
            this.updateModalButtons(data);

            // Abrir modal
            ModalManager.show('optionModal');

        } catch (error) {
            console.error(
                'Error al abrir modal de opciones:',
                error
            );

            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message ||
                    'No se pudo cargar la información de la cita.'
            });
        }
    },
    /**
     * Actualiza la visibilidad de botones según el estado de la cita
     */  
    updateModalButtons(data) {
        console.log('Datos recibidos en updateModalButtons:', data);

        const status = Number(
            data.status ??
            data.appointmentStatus ??
            data.AppointmentStatus
        );

        const hasConsultation =
            data.hasConsultation ??
            data.HasConsultation ??
            false;

        const paymentStatus = Number(
            data.paymentStatus ??
            data.appointmentPaymentStatus ??
            data.PaymentStatus ??
            0
        );

        const paymentStatusLab = Number(
            data.paymentStatusLab ??
            data.PaymentStatusLab ??
            0
        );

        const hasLaboratories =
            data.hasLaboratories ??
            data.HasLaboratories ??
            false;

        /*
         * Buscar la fecha con cualquiera de los nombres
         * que podría devolver el backend.
         */
        const rawAppointmentDate =
            data.appointmentDate ??
            data.AppointmentDate ??
            data.date ??
            data.Date ??
            data.appointment_date;

        console.log('Fecha encontrada:', rawAppointmentDate);

        const appointmentDate =
            this.parseAppointmentDate(rawAppointmentDate);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isValidDate =
            appointmentDate instanceof Date &&
            !Number.isNaN(appointmentDate.getTime());

        const isPastAppointment =
            isValidDate &&
            appointmentDate < today;

        console.log({
            rawAppointmentDate,
            appointmentDate,
            today,
            isValidDate,
            isPastAppointment
        });

        // Ocultar inicialmente todos los botones
        $(
            '#startConsultCol, ' +
            '#startFollowupCol, ' +
            '#rescheduleCol, ' +
            '#cancelCol, ' +
            '#reminderCol, ' +
            '#vitalSignsCol, ' +
            '#payCol, ' +
            '#payLaboratoryCol, ' +
            '#therapyPlanCol'
        ).hide();

        // Empezar consulta
        if (
            [0, 1, 5].includes(status) &&
            !hasConsultation
        ) {
            $('#startConsultCol').show();
        }

        // Seguimiento
        if (
            status === 3 &&
            !hasConsultation
        ) {
            $('#startFollowupCol').show();
        }

        /*
         * Botones comunes.
         */
        $('#reminderCol, #vitalSignsCol').show();

        /*
         * Reprogramar y cancelar:
         * solo si la fecha es válida, no ha pasado
         * y la cita no está cancelada ni finalizada.
         */
        if (
            isValidDate &&
            !isPastAppointment &&
            ![2, 4].includes(status)
        ) {
            $('#rescheduleCol, #cancelCol').show();
        }

        // Pago pendiente
        if (paymentStatus === 0) {
            $('#payCol').show();
        }

        // Pago de laboratorio
        if (
            status === 4 &&
            hasLaboratories === true &&
            paymentStatusLab === 0
        ) {
            $('#payLaboratoryCol').show();
        }

        // Plan terapéutico
        if ([1, 4].includes(status)) {
            $('#therapyPlanCol').show();
        }
    },

    /**
 * Convierte diferentes formatos de fecha a Date local.
 */
    parseAppointmentDate(value) {
        if (!value) {
            return null;
        }

        const text = String(value).trim();

        /*
         * Formatos:
         * 2026-07-27
         * 2026-07-27T00:00:00
         */
        let match = text.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

        if (match) {
            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );
        }

        /*
         * Formato:
         * 27/07/2026
         */
        match = text.match(
            /^(\d{2})\/(\d{2})\/(\d{4})/
        );

        if (match) {
            return new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1])
            );
        }

        const parsedDate = new Date(text);

        if (Number.isNaN(parsedDate.getTime())) {
            console.error(
                'No se pudo interpretar la fecha:',
                value
            );

            return null;
        }

        parsedDate.setHours(0, 0, 0, 0);

        return parsedDate;
    },
    /**
     * Abre el modal de reprogramación
     */
    async openRescheduleModal() {
        try {
            const id = FormHelper.getRequiredValue('appointmentIdInput');
            const data = await AppointmentAPI.getById(id);

            console.log('Datos para reprogramar:', data);

            // Rellenar formulario
            this.populateRescheduleForm(data);

            // Habilitar botón y abrir modal
            $('#confirmAppointmentBtn').prop('disabled', false).show();
            ModalManager.show('appointmentModalgrid');

        } catch (error) {
            if (error.message.includes('requerido')) {
                ErrorHandler.showAlert('ID de cita no encontrado');
            }
        }
    },

    /**
     * Rellena el formulario de reprogramación
     */
    populateRescheduleForm(data) {
        FormHelper.setValues({
            appointment: data.appointmentId,
            patientId: data.patientId,
            selectedDate: data.date,
            appointmentTime: data.time,
            appointmentReason: data.appointmentReason
        });

        // Médico (con trigger para actualizar select)
        if (data.doctorUserId) {
            $('#doctorUserId').val(data.doctorUserId).trigger('change');
        }

        // Aseguradora
        $('#appointmentInsuranceCompanyId')
            .val(data.appointmentInsuranceCompanyId || '')
            .trigger('change');

        // Consultorio
        if (data.medicalOfficeId) {
            $(`#office-${data.medicalOfficeId}`).prop('checked', true);
        }
    },

    /**
     * Confirma la modificación de una cita
     */
    async confirmAppointment() {
        try {
            const payload = this.buildAppointmentPayload();
            console.log('Enviando payload:', payload);

            const response = await AppointmentAPI.modify(payload);

            if (response.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Listo!',
                    text: response.message
                });

                window.location.href = AppConfig.ENDPOINTS.APPOINTMENT_LIST;
            } else {
                ErrorHandler.showAlert(response.message || 'No se pudo reprogramar la cita');
            }

        } catch (error) {
            console.error('Error al confirmar cita:', error);
        }
    },

    /**
     * Construye el payload para modificar una cita
     */
    buildAppointmentPayload() {
        return {
            AppointmentId: FormHelper.getValue('appointment'),
            AppointmentPatientid: FormHelper.getValue('patientId'),
            AppointmentDate: FormHelper.getValue('selectedDate'),
            AppointmentHour: FormHelper.getValue('appointmentTime'),
            AppointmentMedicalofficeid: FormHelper.getValue('AppointmentMedicalofficeid'),
            AppointmentStatus: FormHelper.getValue('appointmentStatus'),
            DoctorUserId: FormHelper.getValue('doctorUserId') || null,
            AppointmentInsuranceCompanyId: FormHelper.getValue('appointmentInsuranceCompanyId') || null,
            AppointmentInsuranceAuthCode: FormHelper.getValue('appointmentInsuranceAuthCode') || null,
            AppointmentReason: FormHelper.getValue('appointmentReason') || null
        };
    },

    /**
     * Cancela una cita
     */
    async cancelAppointment() {
        /*
         * Cerrar modal Bootstrap activo.
         */
        const modalElement = document.querySelector('.modal.show');

        if (modalElement) {
            const modalInstance =
                bootstrap.Modal.getInstance(modalElement) ??
                bootstrap.Modal.getOrCreateInstance(modalElement);

            modalInstance.hide();

            await new Promise(resolve => {
                modalElement.addEventListener(
                    'hidden.bs.modal',
                    resolve,
                    { once: true }
                );
            });
        }

        /*
         * Cerrar offcanvas Bootstrap activo.
         */
        const offcanvasElement = document.querySelector('.offcanvas.show');

        if (offcanvasElement) {
            const offcanvasInstance =
                bootstrap.Offcanvas.getInstance(offcanvasElement) ??
                bootstrap.Offcanvas.getOrCreateInstance(offcanvasElement);

            offcanvasInstance.hide();

            await new Promise(resolve => {
                offcanvasElement.addEventListener(
                    'hidden.bs.offcanvas',
                    resolve,
                    { once: true }
                );
            });
        }

        const result = await Swal.fire({
            title: 'Cancelar cita',
            text: 'Ingrese el motivo por el cual se cancelará la cita.',
            icon: 'warning',

            input: 'textarea',
            inputLabel: 'Motivo de cancelación',
            inputPlaceholder: 'Escriba aquí el motivo de cancelación...',

            inputAttributes: {
                maxlength: '500',
                rows: '5',
                autocomplete: 'off'
            },

            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',

            allowOutsideClick: false,
            focusConfirm: false,
            returnFocus: false,

            inputValidator: value => {
                const reason = value?.trim();

                if (!reason) {
                    return 'Debe ingresar el motivo de cancelación.';
                }

                if (reason.length < 10) {
                    return 'El motivo debe contener al menos 10 caracteres.';
                }

                if (reason.length > 500) {
                    return 'El motivo no puede superar los 500 caracteres.';
                }

                if (!reason.includes(' ')) {
                    return 'Ingrese un motivo más descriptivo utilizando al menos dos palabras.';
                }

                return undefined;
            },

            didOpen: () => {
                const textarea = Swal.getInput();

                if (textarea) {
                    textarea.disabled = false;
                    textarea.readOnly = false;
                    textarea.focus();
                }
            }
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const appointmentId =
                FormHelper.getRequiredValue('appointmentIdInput');

            const cancellationReason = result.value.trim();

            const response = await AppointmentAPI.cancel(
                appointmentId,
                cancellationReason
            );

            await Swal.fire({
                icon: 'success',
                title: 'Cita cancelada',
                text: response.message,
                confirmButtonText: 'Aceptar'
            });

            window.location.href =
                AppConfig.ENDPOINTS.APPOINTMENT_LIST;

        } catch (error) {
            console.error('Error al cancelar cita:', error);

            await Swal.fire({
                icon: 'error',
                title: 'No se pudo cancelar',
                text:
                    error.message ||
                    'Ocurrió un error al cancelar la cita.',
                confirmButtonText: 'Aceptar'
            });
        }
    },

    /**
     * Inicia una consulta
     */
    async startConsultation() {
        try {
            const id = FormHelper.getRequiredValue('appointmentIdInput');
            const data = await AppointmentAPI.getById(id);

            if (!data.patientId) {
                ErrorHandler.showAlert('Paciente no encontrado');
                return;
            }

            window.location.href =
                `${AppConfig.ENDPOINTS.NEW_CONSULTATION}?patientId=${data.patientId}`;

        } catch (error) {
            console.error('Error al iniciar consulta:', error);
        }
    },



    startTherapyPlan() {

        try {

            const appointmentId =
                FormHelper.getRequiredValue('appointmentIdInput');

            const patientId =
                FormHelper.getRequiredValue('appointmentPatientId');

            window.location.href =
                `${AppConfig.ENDPOINTS.START_THERAPY_PLAN}?appointmentId=${appointmentId}&patientId=${patientId}`;

        }
        catch (error) {

            ErrorHandler.showAlert(
                'No se pudo iniciar el plan terapéutico'
            );

        }
    },



    /**
     * Inicia una consulta de seguimiento
     */
    startFollowupConsultation() {
        try {
            const patientId = FormHelper.getRequiredValue('appointmentPatientId');
            window.location.href =
                `${AppConfig.ENDPOINTS.CONSULTATION_FOLLOWUP}?patientid=${patientId}`;

        } catch (error) {
            ErrorHandler.showAlert('ID de paciente no encontrado');
        }
    },

    /**
     * Proceder al pago de una cita
     */
    payAppointment() {
        try {
            const id = FormHelper.getRequiredValue('appointmentIdInput');
            const patientId = FormHelper.getRequiredValue('appointmentPatientId');

            window.location.href =
                `${AppConfig.ENDPOINTS.BILLING}?appointmentId=${id}&patientId=${patientId}`;

        } catch (error) {
            ErrorHandler.showAlert('Faltan datos para procesar el pago');
        }
    },

    /**
 * Registrar pago para factura a crédito
 */
    registerCreditPayment() {
        try {
            const appointmentId = FormHelper.getRequiredValue('appointmentIdInput');
            const patientId = FormHelper.getRequiredValue('appointmentPatientId');

            // Guardamos temporalmente el id en el modal
            document.getElementById('creditAppointmentId').value = appointmentId;

            // Aquí deberías ya tener el billingId cargado previamente
            // o puedes obtenerlo vía AJAX si lo necesitas

            const modal = new bootstrap.Modal(document.getElementById('creditPaymentModal'));
            modal.show();

        } catch (error) {
            ErrorHandler.showAlert('No se pudo iniciar el registro de pago');
        }
    },

    /**
 * Enviar pago de crédito al servidor
 */
    submitCreditPayment() {
        try {

            const appointmentId = document.getElementById('creditAppointmentId').value;
            const paymentMethod = document.getElementById('creditPaymentMethod').value;
            const paymentAmount = parseFloat(document.getElementById('creditPaymentAmount').value);
            const paymentNotes = document.getElementById('creditPaymentNotes').value;
            const fileInput = document.getElementById('creditPaymentProof');

            let formData = new FormData();

            formData.append("AppointmentId", appointmentId);
            formData.append("PaymentMethod", paymentMethod);
            formData.append("PaymentAmount", paymentAmount);
            formData.append("PaymentNotes", paymentNotes);

            if (fileInput.files.length > 0) {
                formData.append("PaymentProof", fileInput.files[0]);
            }

            fetch(AppConfig.ENDPOINTS.REGISTER_PAYMENT, {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(data => {

                    if (data.success) {

                        Swal.fire({
                            icon: 'success',
                            title: 'Éxito',
                            text: data.message,
                            confirmButtonText: 'Aceptar'
                        }).then(() => {

                            window.location.href = AppConfig.ENDPOINTS.APPOINTMENT_LIST;

                        });

                    } else {

                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message
                        });

                    }


                })
                .catch(error => {
                    ErrorHandler.showAlert("Error al registrar el pago");
                });

        } catch (error) {
            ErrorHandler.showAlert("Datos inválidos");
        }
    },



    /**
     * Proceder al pago de laboratorios
     */
    payLaboratory() {
        try {
            const appointmentId = FormHelper.getRequiredValue('appointmentIdInput');
            const patientId = FormHelper.getRequiredValue('appointmentPatientId');

            // Aquí usamos el ID de la cita o podrías usar el ID de consulta si lo necesitas
            window.location.href =
                `${AppConfig.ENDPOINTS.BILL_LABORATORY}?appointmentId=${appointmentId}&patientId=${patientId}`;

        } catch (error) {
            ErrorHandler.showAlert('Faltan datos para procesar el pago de laboratorios');
        }
    },

    /**
     * Envía recordatorio por WhatsApp
     */
    sendReminder() {
        try {
            const id = FormHelper.getRequiredValue('appointmentIdInput');
            window.location.href =
                `${AppConfig.ENDPOINTS.SEND_WHATSAPP_REMINDER}?appointmentId=${id}&userProfile=${AppConfig.PROFILE_ID}`;

        } catch (error) {
            ErrorHandler.showAlert('ID de cita no encontrado');
        }
    },

    /**
     * Ver historial del paciente
     */
    viewPatientHistory() {
        try {
            const patientId = FormHelper.getRequiredValue('appointmentPatientId');

            // Cerrar modal actual
            ModalManager.hide('optionModal');

            window.location.href =
                `${AppConfig.ENDPOINTS.CONSULTATION_LIST}?patientId=${encodeURIComponent(patientId)}`;

        } catch (error) {
            ErrorHandler.showAlert('No se pudo obtener el ID del paciente para ver el historial');
        }
    },

    /**
     * Establece los datos de una cita (para usar desde tabla)
     */
    setAppointmentData(id, patientId) {
        FormHelper.setValues({
            appointmentIdInput: id,
            appointmentPatientId: patientId
        });
        this.currentAppointmentId = id;
        this.currentPatientId = patientId;
    },

    /**
     * Filtra citas por estado
     */
    filterAppointments(status, isPaidOnly = false, status2 = null) {
        let url = `${AppConfig.ENDPOINTS.APPOINTMENT_LIST}?appointmentStatus=${status}&isPaidOnly=${isPaidOnly}`;

        if (status2 !== null) {
            url += `&appointmentStatus2=${status2}`;
        }

        window.location.href = url;
    },

    /**
     * Vincula eventos globales
     */
    bindGlobalEvents() {
        // Limpiar backdrops al cerrar modales
        $('#optionModal').on('hidden.bs.modal', () => {
            ModalManager.cleanBackdrops();
        });

        // Confirmar cita
        $('#confirmAppointmentBtn').on('click', () => {
            this.confirmAppointment();
        });

        // Cambios en fecha/hora -> recargar consultorios
        $('#selectedDate, #appointmentTime').on('change', () => {
            this.loadAvailableOffices();
        });
    }
};

// Hacer disponible globalmente
window.AppointmentManager = AppointmentManager;