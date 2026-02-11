using ClosedXML.Excel;
using ExpertMed.Models;
using ExpertMed.Services;
using iTextSharp.text;
using iTextSharp.text.pdf;
using Microsoft.AspNetCore.Mvc;

namespace ExpertMed.Controllers
{

    public class BillingController : Controller
    {
        private readonly BillingServices _facturacion;
        private readonly DbExpertmedContext _context;
        private readonly ILogger<BillingController> _logger;
        private readonly IWebHostEnvironment _webHostEnvironment;
        public BillingController(BillingServices billingService, ILogger<BillingController> logger, DbExpertmedContext context, IWebHostEnvironment webHostEnvironment)
        {
            _facturacion = billingService;
            _logger = logger;
            _context = context;
            _webHostEnvironment = webHostEnvironment;
        }
        [HttpPost]
        public async Task<IActionResult> ProcessTherapyInvoice([FromBody] TherapyBillingRequestDto model)
        {
            try
            {
                // Obtener ID del usuario de la sesión
                int usuarioId = HttpContext.Session.GetInt32("UsuarioId") ?? 0;
                if (usuarioId == 0) return Unauthorized();

                // 1. Ejecutar el SP y obtener el JSON para el SRI
                string jsonFactura = await _facturacion.ProcesarFacturaTerapiaAsync(model, usuarioId);

                if (string.IsNullOrEmpty(jsonFactura))
                    return BadRequest(new { success = false, message = "No se pudo generar el JSON de la factura." });

                // 2. Aquí llamarías a tu servicio integrador del SRI (Opcional en este paso)
                // var sriResult = await _sriService.EnviarFactura(jsonFactura);

                return Ok(new
                {
                    success = true,
                    message = "Factura procesada correctamente.",
                    data = jsonFactura
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        public async Task<IActionResult> Facturacion(int? appointmentId)
        {
            if (!appointmentId.HasValue)
                return BadRequest("Falta el ID de la cita.");

            var cita = await _facturacion.GetAppointmentBillingDataAsync(appointmentId.Value);

            if (cita == null)
                return NotFound("No se encontró la cita.");

            ViewBag.AppointmentId = cita.AppointmentId;
            ViewBag.AppointmentPatientId = cita.PatientId;
            ViewBag.PatientFullName = cita.PatientFullName;

            ViewBag.HasInsurance = cita.InsuranceCompanyId != null;
            ViewBag.InsuranceCompanyId = cita.InsuranceCompanyId ?? 0;
            ViewBag.InsuranceCompanyName = cita.InsuranceCompanyName ?? "Sin compañía";
            ViewBag.AuthorizationCode = cita.InsuranceAuthCode ?? "";

            return View(cita);
        }
        public async Task<IActionResult> FacturacionLaboratorio(int? appointmentId)
        {
            if (!appointmentId.HasValue)
                return BadRequest("Falta el ID de la cita.");

            var cita = await _facturacion.GetAppointmentBillingDataAsync(appointmentId.Value);

            if (cita == null)
                return NotFound("No se encontró la cita.");

            // Creamos el modelo con lo estrictamente necesario que sí tiene la clase
            var viewModel = new Facturacions
            {
                CitaId = cita.AppointmentId,
                BillingDetailsNames = cita.PatientFullName,
                InsuranceCompanyId = cita.InsuranceCompanyId,

                // Inicializamos las listas para que el JS no de error
                Items = new List<BillingItemDTO>(),
                PaymentMethods = new List<PaymentMethodDTO>()
            };

            // Usamos el ViewBag para los IDs, así no dependemos de la clase Facturacions
            ViewBag.AppointmentId = cita.AppointmentId;
            ViewBag.AppointmentPatientId = cita.PatientId; // El ID del paciente va por aquí
            ViewBag.PatientFullName = cita.PatientFullName;
            ViewBag.InsuranceCompanyId = cita.InsuranceCompanyId;

            return View(viewModel);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="viewModel"></param>
        /// <param name="comprobantePagoFile"></param>
        /// <returns></returns>

        [HttpPost]
        [RequestSizeLimit(52428800)]
        public async Task<IActionResult> Billing(
                   [FromForm] Facturacions viewModel,
                   IFormFile comprobantePagoFile = null,
                   List<IFormFile> PaymentProofs = null)
        {
            if (!ModelState.IsValid)
            {
                // Log detallado de errores
                var errores = ModelState
                    .Where(ms => ms.Value.Errors.Count > 0)
                    .Select(ms => new
                    {
                        Campo = ms.Key,
                        Errores = ms.Value.Errors.Select(e => e.ErrorMessage).ToList()
                    }).ToList();

                foreach (var error in errores)
                {
                    _logger.LogWarning("Campo: {Campo}, Errores: {Errores}",
                        error.Campo, string.Join("; ", error.Errores));
                }

                TempData["ErrorMessage"] = "Verifique los datos ingresados.";
                await FillBillingViewBag(viewModel.CitaId ?? 0); // RECARGA EL VIEWBAG
                return View("Facturacion", viewModel);
            }

            try
            {
                // Array de bytes dummy para cuando no hay comprobante
                byte[] dummyBytes = new byte[] { 0x00 };

                // Determinar si usar múltiples pagos o crédito
                bool usarMultiplesPagos = viewModel.PaymentMethods != null && viewModel.PaymentMethods.Any();
                bool esCredito = viewModel.EsCredito;

                // =============================================
                // VALIDACIONES SEGÚN TIPO DE FACTURA
                // =============================================

                if (esCredito)
                {
                    // Validaciones para factura a crédito
                    if (!viewModel.FechaVencimientoCredito.HasValue)
                    {
                        TempData["ErrorMessage"] = "La fecha de vencimiento es requerida para facturas a crédito.";
                        return View("Facturacion", viewModel);
                    }

                    if (!viewModel.MontoCredito.HasValue || viewModel.MontoCredito.Value <= 0)
                    {
                        TempData["ErrorMessage"] = "El monto de crédito debe ser mayor a cero.";
                        return View("Facturacion", viewModel);
                    }

                    if (viewModel.FechaVencimientoCredito.Value.Date <= DateTime.Now.Date)
                    {
                        TempData["ErrorMessage"] = "La fecha de vencimiento debe ser posterior a la fecha actual.";
                        return View("Facturacion", viewModel);
                    }

                    if (viewModel.MontoCredito.Value > viewModel.TotalFactura)
                    {
                        TempData["ErrorMessage"] = "El monto de crédito no puede ser mayor al total de la factura.";
                        return View("Facturacion", viewModel);
                    }

                    // Si hay pagos parciales + crédito
                    if (usarMultiplesPagos)
                    {
                        var totalPagos = viewModel.PaymentMethods.Sum(p => p.PaymentAmount);
                        var saldoPendiente = viewModel.TotalFactura - totalPagos;

                        if (Math.Abs(saldoPendiente - viewModel.MontoCredito.Value) > 0.01m)
                        {
                            TempData["ErrorMessage"] = $"El monto a crédito ({viewModel.MontoCredito.Value:F2}) debe coincidir con el saldo pendiente ({saldoPendiente:F2}).";
                            return View("Facturacion", viewModel);
                        }
                    }
                    else
                    {
                        // Crédito total - validar que el monto a crédito sea igual al total
                        if (Math.Abs(viewModel.MontoCredito.Value - viewModel.TotalFactura) > 0.01m)
                        {
                            TempData["ErrorMessage"] = $"Para crédito total, el monto a crédito debe ser igual al total de la factura.";
                            return View("Facturacion", viewModel);
                        }
                    }
                }
                else if (usarMultiplesPagos)
                {
                    // Validar suma de pagos para facturas de contado con múltiples pagos
                    var totalPagos = viewModel.PaymentMethods.Sum(p => p.PaymentAmount);
                    if (Math.Abs(totalPagos - viewModel.TotalFactura) > 0.01m)
                    {
                        TempData["ErrorMessage"] = $"La suma de los pagos ({totalPagos:F2}) no coincide con el total ({viewModel.TotalFactura:F2}).";
                        return View("Facturacion", viewModel);
                    }
                }

                // =============================================
                // PROCESAMIENTO DE COMPROBANTES
                // =============================================

                if (usarMultiplesPagos)
                {
                    // Procesar comprobantes múltiples
                    if (PaymentProofs != null && PaymentProofs.Count > 0)
                    {
                        for (int i = 0; i < PaymentProofs.Count && i < viewModel.PaymentMethods.Count; i++)
                        {
                            if (PaymentProofs[i] != null && PaymentProofs[i].Length > 0)
                            {
                                using var ms = new MemoryStream();
                                await PaymentProofs[i].CopyToAsync(ms);
                                viewModel.PaymentMethods[i].PaymentProof = ms.ToArray();
                            }
                            else
                            {
                                viewModel.PaymentMethods[i].PaymentProof = dummyBytes;
                            }
                        }
                    }
                    else
                    {
                        // Si no se enviaron archivos, asignar dummy bytes a todos
                        foreach (var payment in viewModel.PaymentMethods)
                        {
                            payment.PaymentProof = dummyBytes;
                        }
                    }
                }
                else if (!esCredito)
                {
                    // Sistema antiguo: un solo comprobante (solo para facturas de contado)
                    if (comprobantePagoFile != null && comprobantePagoFile.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        await comprobantePagoFile.CopyToAsync(ms);
                        viewModel.ComprobantePagoFacturacion = ms.ToArray();
                    }
                    else
                    {
                        viewModel.ComprobantePagoFacturacion = dummyBytes;
                    }
                }

                // =============================================
                // LLAMAR AL SERVICIO
                // =============================================

                string response = await _facturacion.CreateAndSendInvoiceAsync(
                    citaId: viewModel.CitaId ?? 0,
                    fechaFacturacion: DateTime.Now,
                    totalFactura: viewModel.TotalFactura,
                    metodoPago: (usarMultiplesPagos || esCredito) ? null : viewModel.MetodoPago,
                    comprobantePagoFacturacion: (usarMultiplesPagos || esCredito) ? null : viewModel.ComprobantePagoFacturacion,
                    billingDetailsNames: viewModel.BillingDetailsNames,
                    billingDetailsCiNumber: viewModel.BillingDetailsCiNumber,
                    billingDetailsDocumentType: viewModel.BillingDetailsDocumentType,
                    billingDetailsAddress: viewModel.BillingDetailsAddress,
                    billingDetailsPhone: viewModel.BillingDetailsPhone,
                    billingDetailsEmail: viewModel.BillingDetailsEmail,
                    insuranceCompanyId: viewModel.InsuranceCompanyId,
                    items: viewModel.Items,
                    paymentMethods: usarMultiplesPagos ? viewModel.PaymentMethods : null,
                    // NUEVOS PARÁMETROS DE CRÉDITO
                    esCredito: viewModel.EsCredito,
                    fechaVencimientoCredito: viewModel.FechaVencimientoCredito,
                    montoCredito: viewModel.MontoCredito,
                    medioPagoCredito: viewModel.MedioPagoCredito
                );

                _logger.LogInformation("Factura {TipoFactura} generada con éxito para la cita ID: {CitaId}",
                    esCredito ? "A CRÉDITO" : "DE CONTADO", viewModel.CitaId);

                TempData["SuccessMessage"] = esCredito
                    ? $"Factura a crédito generada correctamente. Vencimiento: {viewModel.FechaVencimientoCredito:dd/MM/yyyy}"
                    : "Factura generada y enviada correctamente.";

                return RedirectToAction("AppointmentList", "Appointment");
            }
            // Y dentro del catch:
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al facturar...");
                TempData["ErrorMessage"] = $"Error: {ex.Message}";
                await FillBillingViewBag(viewModel.CitaId ?? 0); // RECARGA EL VIEWBAG
                return View("Facturacion", viewModel);
            }
        }

        private async Task FillBillingViewBag(int appointmentId)
        {
            var cita = await _facturacion.GetAppointmentBillingDataAsync(appointmentId);
            if (cita != null)
            {
                ViewBag.AppointmentId = cita.AppointmentId;
                ViewBag.AppointmentPatientId = cita.PatientId;
                ViewBag.PatientFullName = cita.PatientFullName;
                ViewBag.HasInsurance = cita.InsuranceCompanyId != null;
                ViewBag.InsuranceCompanyId = cita.InsuranceCompanyId ?? 0;
                ViewBag.InsuranceCompanyName = cita.InsuranceCompanyName ?? "Sin compañía";
                ViewBag.AuthorizationCode = cita.InsuranceAuthCode ?? "";
            }
        }

        [HttpPost]
        [RequestSizeLimit(52428800)]
        public async Task<IActionResult> BillingLabs([FromForm] Facturacions viewModel, IFormFile comprobantePagoFile = null, List<IFormFile> PaymentProofs = null)
        {
            if (!ModelState.IsValid)
            {
                // Log de errores para depuración
                foreach (var state in ModelState)
                {
                    foreach (var error in state.Value.Errors)
                    {
                        _logger.LogWarning("Error en campo {Campo}: {Error}", state.Key, error.ErrorMessage);
                    }
                }

                TempData["ErrorMessage"] = "Verifique los datos ingresados en el formulario.";
                return View("FacturacionLaboratorio", viewModel);
            }

            try
            {
                byte[] dummyBytes = new byte[] { 0x00 };
                bool usarMultiplesPagos = viewModel.PaymentMethods != null && viewModel.PaymentMethods.Any();

                // 1. Validación Analítica: Suma de montos vs Total Factura
                if (usarMultiplesPagos)
                {
                    var totalPagos = viewModel.PaymentMethods.Sum(p => p.PaymentAmount);
                    if (Math.Abs(totalPagos - viewModel.TotalFactura) > 0.01m)
                    {
                        TempData["ErrorMessage"] = $"La suma de los pagos (${totalPagos:F2}) no coincide con el total (${viewModel.TotalFactura:F2}).";
                        return View("FacturacionLaboratorio", viewModel);
                    }

                    // 2. Procesamiento de Comprobantes Múltiples (Binary Data)
                    if (PaymentProofs != null && PaymentProofs.Count > 0)
                    {
                        for (int i = 0; i < PaymentProofs.Count && i < viewModel.PaymentMethods.Count; i++)
                        {
                            if (PaymentProofs[i] != null && PaymentProofs[i].Length > 0)
                            {
                                using var ms = new MemoryStream();
                                await PaymentProofs[i].CopyToAsync(ms);
                                viewModel.PaymentMethods[i].PaymentProof = ms.ToArray();
                            }
                            else
                            {
                                viewModel.PaymentMethods[i].PaymentProof = dummyBytes;
                            }
                        }
                    }
                    else
                    {
                        // Inicializar con dummy para evitar nulls en el SP
                        foreach (var p in viewModel.PaymentMethods) p.PaymentProof ??= dummyBytes;
                    }
                }
                else
                {
                    // Pago único (Sistema heredado)
                    if (comprobantePagoFile != null && comprobantePagoFile.Length > 0)
                    {
                        using var ms = new MemoryStream();
                        await comprobantePagoFile.CopyToAsync(ms);
                        viewModel.ComprobantePagoFacturacion = ms.ToArray();
                    }
                    else
                    {
                        viewModel.ComprobantePagoFacturacion = dummyBytes;
                    }
                }

                // 3. Llamada al NUEVO SERVICIO de Laboratorios (sp_billing_lab)
                string response = await _facturacion.CreateAndSendInvoice_lab(
                    viewModel.CitaId ?? 0,
                    DateTime.Now,
                    viewModel.TotalFactura,
                    usarMultiplesPagos ? "MULTIPLE" : viewModel.MetodoPago,
                    usarMultiplesPagos ? null : viewModel.ComprobantePagoFacturacion,
                    viewModel.BillingDetailsNames,
                    viewModel.BillingDetailsCiNumber,
                    viewModel.BillingDetailsDocumentType,
                    viewModel.BillingDetailsAddress,
                    viewModel.BillingDetailsPhone,
                    viewModel.BillingDetailsEmail,
                    viewModel.InsuranceCompanyId,
                    viewModel.Items,
                    usarMultiplesPagos ? viewModel.PaymentMethods : null
                );

                _logger.LogInformation("Factura de Laboratorio generada: {CitaId}", viewModel.CitaId);
                TempData["SuccessMessage"] = "Factura de laboratorio emitida y enviada con éxito.";

                return RedirectToAction("AppointmentList", "Appointment");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error crítico en BillingLabs para Cita {CitaId}", viewModel.CitaId);
                TempData["ErrorMessage"] = $"Error al generar factura: {ex.Message}";

                // Retornamos la vista con el modelo para que la rehidratación en JS funcione
                return View("FacturacionLaboratorio", viewModel);
            }
        }

        [HttpGet("Facturas")]
        public async Task<IActionResult> FacturasEmitidas(DateTime? fechaDesde = null, DateTime? fechaHasta = null)
        {
            try
            {
                var facturas = await _facturacion.ObtenerFacturasEmitidasAsync(fechaDesde, fechaHasta);
                return View(facturas);
            }
            catch (Exception ex)
            {
                // Log del error
                Console.WriteLine($"Error en FacturasEmitidas: {ex.Message}");
                return View(new List<FacturaEmitidaDTO>());
            }
        }


        [HttpPost("Facturas/Filtrar")]
        public async Task<JsonResult> FiltrarFacturas([FromBody] FiltroFechasRequest request)
        {
            try
            {
                // 1. Validación de entrada rápida
                if (request == null)
                {
                    return Json(new { success = false, message = "Datos de filtro no válidos." });
                }

                // 2. Llamada al servicio (que ya trae SQL + Dátil)
                var facturas = await _facturacion.ObtenerFacturasEmitidasAsync(request.FechaDesde, request.FechaHasta);

                // 3. Proyección minimalista
                // No necesitamos formatear fechas aquí, el JSON las manejará.
                // Solo aseguramos nulos para evitar errores en el Front-end.
                var data = facturas.Select(f => new
                {
                    facturaId = f.FacturaId,
                    secuencial = f.Secuencial, // Ya viene como "001-003-000000..." desde el SP o Dátil
                    fecha = f.Fecha,
                    paciente = f.Paciente ?? "(Sin nombre)",
                    medico = f.Medico ?? "(Sin médico)",
                    subtotal = f.Subtotal,
                    totalAseguradora = f.TotalAseguradora,
                    totalCopago = f.TotalCopago,
                    metodoPago = f.MetodoPago ?? "-",
                    aseguradora = f.Aseguradora ?? "Particular",
                    totalItems = f.TotalItems,
                    origen = f.Origen ?? "LOCAL"
                });

                return Json(new
                {
                    success = true,
                    data = data,
                    count = facturas.Count
                });
            }
            catch (Exception ex)
            {
                // Loguear el error de forma adecuada (preferiblemente con ILogger)
                _logger.LogError(ex, "Error en FiltrarFacturas para el rango {Desde} - {Hasta}",
                    request?.FechaDesde, request?.FechaHasta);

                return Json(new
                {
                    success = false,
                    message = "Error interno al procesar la solicitud.",
                    error = ex.Message // Solo para desarrollo, quitar en producción si es necesario
                });
            }
        }


        [HttpGet]
        public async Task<IActionResult> ExportarFacturasExcel(DateTime? fDesde, DateTime? fHasta)
        {
            var datos = await _facturacion.ObtenerReporteExcelAsync(fDesde, fHasta);

            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Reporte");

                // Encabezados manuales para asegurar el orden
                string[] headers = { "Nro Factura", "Fecha Facturación", "Fecha Cita", "Paciente", "Médico", "Subtotal", "Pago", "Es Crédito", "Vencimiento", "Monto Crédito", "Aseguradora" };
                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cell(1, i + 1).Value = headers[i];
                    worksheet.Cell(1, i + 1).Style.Font.Bold = true;
                }

                int row = 2;
                foreach (var item in datos)
                {
                    worksheet.Cell(row, 1).SetValue(item.NroFactura);
                    worksheet.Cell(row, 2).SetValue(item.FechaFacturacion);
                    worksheet.Cell(row, 3).SetValue(item.FechaCita);
                    worksheet.Cell(row, 4).SetValue(item.Paciente);

                    // Forzamos la escritura para detectar si el error viene de atrás
                    worksheet.Cell(row, 5).SetValue(string.IsNullOrEmpty(item.Medico) ? "MÉDICO NO ENCONTRADO EN DTO" : item.Medico);

                    worksheet.Cell(row, 6).SetValue(item.Subtotal);
                    worksheet.Cell(row, 7).SetValue(item.MedioDePago);
                    worksheet.Cell(row, 8).SetValue(item.EsCredito);
                    if (item.FechaVencimientoCredito.HasValue) worksheet.Cell(row, 9).SetValue(item.FechaVencimientoCredito.Value);
                    worksheet.Cell(row, 10).SetValue(item.MontoAPagarCredito);
                    worksheet.Cell(row, 11).SetValue(item.Aseguradora);
                    row++;
                }

                // Formateo para evitar los ####### y asegurar legibilidad
                worksheet.Column(2).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                worksheet.Column(3).Style.DateFormat.Format = "dd/MM/yyyy";
                worksheet.Column(6).Style.NumberFormat.Format = "$ #,##0.00";
                worksheet.Column(10).Style.NumberFormat.Format = "$ #,##0.00";

                // Ajuste automático de ancho (Soluciona los #######)
                worksheet.Columns().AdjustToContents();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Reporte_{DateTime.Now:yyyyMMdd}.xlsx");
                }
            }
        }
        // Asegúrate de que esta clase esté definida
        public class FiltroFechasRequest
        {
            public DateTime? FechaDesde { get; set; }
            public DateTime? FechaHasta { get; set; }
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="facturaId"></param>
        /// <returns></returns>
        [HttpGet]
        public async Task<IActionResult> NotaVentaConTablaDinamica(int facturaId)
        {
            var datosFactura = await _facturacion.GetFacturaConDetalleAsync(facturaId);
            if (datosFactura == null)
                return NotFound();

            string templatePath = Path.Combine(_webHostEnvironment.WebRootPath, "plantillas", "Nota_de_venta.pdf");

            if (!System.IO.File.Exists(templatePath))
                return StatusCode(500, "PDF template file not found.");

            // ✅ NO usar `using` directamente sobre el PdfReader cuando se combina con PdfStamper
            PdfReader reader = null;
            MemoryStream stream = new MemoryStream();

            try
            {
                reader = new PdfReader(templatePath);
                PdfStamper stamper = new PdfStamper(reader, stream);
                AcroFields form = stamper.AcroFields;
                PdfContentByte canvas = stamper.GetOverContent(1);

                // Fuentes
                string arialPath = Path.Combine(_webHostEnvironment.WebRootPath, "assets", "Fuentes", "ARIAL.TTF");
                BaseFont arialBaseFont = BaseFont.CreateFont(arialPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
                var normalFont = new Font(arialBaseFont, 9, Font.NORMAL, BaseColor.BLACK);
                var boldFont = new Font(arialBaseFont, 9, Font.BOLD, BaseColor.BLACK);

                // Campos estáticos
                form.SetField("txt_fecha_es_:signer:date", datosFactura.Fecha.ToString("dd/MM/yyyy"));
                form.SetField("txt_nombre", datosFactura.Paciente);
                form.SetField("txt_metodo_pago", datosFactura.MetodoPago.ToUpper());
                form.SetField("txt_direccion", datosFactura.PacienteDireccion ?? "");
                form.SetField("txt_telefono_paciente", (datosFactura.PacienteNumeroCelular ?? "") + " / " +(datosFactura.PacienteNumeroFijo ?? ""));
                form.SetField("pacienteEmail_es_:signer:email", datosFactura.PacienteEmail ?? "");
                form.SetField("aseguradora", datosFactura.Aseguradora ?? "");
                form.SetField("txt_numero_factura", datosFactura.NumeroFactura ?? "");

                // Crear tabla
                var itemTable = new PdfPTable(4) { WidthPercentage = 100 };
                itemTable.SetWidths(new float[] { 50f, 15f, 15f, 20f });

                string[] headers = { "Descripción", "Cantidad", "P. Unitario", "Subtotal" };
                foreach (var h in headers)
                {
                    var cell = new PdfPCell(new Phrase(h, boldFont))
                    {
                        BackgroundColor = BaseColor.LIGHT_GRAY,
                        HorizontalAlignment = Element.ALIGN_CENTER
                    };
                    itemTable.AddCell(cell);
                }

                foreach (var item in datosFactura.Items)
                {
                    itemTable.AddCell(new Phrase(item.Descripcion, normalFont));
                    itemTable.AddCell(new PdfPCell(new Phrase(item.Cantidad.ToString(), normalFont)) { HorizontalAlignment = Element.ALIGN_CENTER });
                    itemTable.AddCell(new PdfPCell(new Phrase($"${item.PrecioUnitario:F2}", normalFont)) { HorizontalAlignment = Element.ALIGN_RIGHT });
                    decimal subtotal = item.PrecioUnitario * item.Cantidad;
                    itemTable.AddCell(new PdfPCell(new Phrase($"${subtotal:F2}", normalFont)) { HorizontalAlignment = Element.ALIGN_RIGHT });
                }

                // Posicionar la tabla en la ubicación del campo
                var fieldPositions = form.GetFieldPositions("txt_items_facturacion");

                if (fieldPositions != null && fieldPositions.Count > 0)
                {
                    var position = fieldPositions[0].position;
                    ColumnText ct = new ColumnText(canvas);
                    ct.SetSimpleColumn(position.Left, position.Bottom, position.Right, position.Top);
                    ct.AddElement(itemTable);
                    ct.Go();

                    form.RemoveField("txt_items_facturacion");
                }

                // Totales
                form.SetField("totalAseguradora", $"{datosFactura.TotalAseguradora:F2}");
                form.SetField("totalCopago", $"{datosFactura.TotalCopago:F2}");
                form.SetField("totalFinal", $"{datosFactura.Subtotal:F2}");

                stamper.FormFlattening = true;
                stamper.Close();
                reader.Close();

                var pdfBytes = stream.ToArray();
                return File(pdfBytes, "application/pdf", $"NotaVenta_Form_DynamicItems_{facturaId}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generando PDF para factura {facturaId}", facturaId);
                return StatusCode(500, "Error generando el PDF.");
            }
            finally
            {
                reader?.Close();
                stream?.Dispose();
            }
        }


    }
}
