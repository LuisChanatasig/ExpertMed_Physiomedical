using ClosedXML.Excel;
using ExpertMed.Models;
using ExpertMed.Services;
using Microsoft.AspNetCore.Mvc;

namespace ExpertMed.Controllers
{
    public class ReportesConsultasController : Controller
    {

        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<ReportesConsultasController> _logger;
        private readonly DbExpertmedContext _dbContext;
        private readonly ReportService _reportService;
        private readonly PatientService _patientService;
        private readonly SelectsService _selectService;

        public ReportesConsultasController(IHttpContextAccessor httpContextAccessor, ILogger<ReportesConsultasController> logger, DbExpertmedContext dbContext, ReportService reportService, PatientService patientService, SelectsService selectService)
        {
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _dbContext = dbContext;
            _reportService = reportService;
            _patientService = patientService;
            _selectService = selectService;
        }

        [HttpGet]
        public async Task<IActionResult> ResumenConsultas(DateTime? fechaDesde, DateTime? fechaHasta)
        {
            try
            {
                int? sessionUsuarioId = HttpContext.Session.GetInt32("UsuarioId");
                int? sessionPerfilId = HttpContext.Session.GetInt32("PerfilId");
                int? sessionEstablecimientoId = HttpContext.Session.GetInt32("UsuarioEstablecimientoId");

                if (!sessionUsuarioId.HasValue || !sessionPerfilId.HasValue)
                    return RedirectToAction("Login", "Account");

                int usuarioId = sessionUsuarioId.Value;
                int perfilId = sessionPerfilId.Value;
                int establecimientoId = sessionEstablecimientoId ?? 0;


                var resumen = await _reportService.GetResumenTerapiasAsync(
                    fechaDesde,
                    fechaHasta,
                    perfilId,
                    usuarioId
                );

                ViewBag.Pacientes = await _patientService.GetAllPatientsAsync(
                 perfilId,
                 usuarioId
             );

                ViewBag.Medicos = await _selectService.GetAllMedicsDetailsAsync(
                    establecimientoId
                );

                return View(resumen);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al cargar el resumen de terapias.");

                TempData["ErrorMessage"] = "Ocurrió un error al cargar el resumen de terapias.";
                return RedirectToAction("Index", "Home");
            }
        }


        [HttpGet]
        public async Task<IActionResult> DescargarReporteConciliacionExcel(
      DateTime? fechaInicio,
      DateTime? fechaFin,
      int? medicoId,
      int? pacienteId,
      string? tipoTerapia,
      bool? soloFacturados,
      bool soloConAlertas = false,
      string? estadoConciliacion = null)
        {
            try
            {
                int? sessionUsuarioId = HttpContext.Session.GetInt32("UsuarioId");
                int? sessionPerfilId = HttpContext.Session.GetInt32("PerfilId");

                if (!sessionUsuarioId.HasValue || !sessionPerfilId.HasValue)
                    return RedirectToAction("Login", "Account");

                var filtro = new ReporteCitasConciliacionFiltroDto
                {
                    FechaInicio = fechaInicio,
                    FechaFin = fechaFin,
                    MedicoId = medicoId,
                    PacienteId = pacienteId,
                    TipoTerapia = tipoTerapia,
                    SoloFacturados = soloFacturados,
                    SoloConAlertas = soloConAlertas,
                    EstadoConciliacion = estadoConciliacion
                };

                var data = await _reportService.GetReporteCitasConciliacionAsync(filtro);

                using var workbook = new XLWorkbook();
                var ws = workbook.Worksheets.Add("Conciliacion Terapias");

                const int totalColumns = 36;
                var colorAzulOscuro = XLColor.FromHtml("#1A3A5C");
                var colorAzulMedio = XLColor.FromHtml("#2E6DA4");
                var colorAzulClaro = XLColor.FromHtml("#D6E4F0");
                var colorGrisClaro = XLColor.FromHtml("#F5F7FA");
                var colorGrisMedio = XLColor.FromHtml("#E8ECF0");
                var colorBlanco = XLColor.White;
                var colorTextoOscuro = XLColor.FromHtml("#1C2B39");

                ws.Row(1).Height = 42;
                var bannerCell = ws.Cell(1, 1);
                bannerCell.Value = "REPORTE DE CONCILIACIÓN DE TERAPIAS";
                ws.Range(1, 1, 1, totalColumns).Merge();
                bannerCell.Style.Font.Bold = true;
                bannerCell.Style.Font.FontSize = 18;
                bannerCell.Style.Font.FontName = "Arial";
                bannerCell.Style.Font.FontColor = colorBlanco;
                bannerCell.Style.Fill.BackgroundColor = colorAzulOscuro;
                bannerCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                bannerCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                ws.Row(2).Height = 20;
                var subCell = ws.Cell(2, 1);
                subCell.Value = "Physiomefrobal · Sistema de Gestión Médica";
                ws.Range(2, 1, 2, totalColumns).Merge();
                subCell.Style.Font.FontSize = 10;
                subCell.Style.Font.FontName = "Arial";
                subCell.Style.Font.Italic = true;
                subCell.Style.Font.FontColor = XLColor.FromHtml("#B8D4ED");
                subCell.Style.Fill.BackgroundColor = colorAzulMedio;
                subCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                subCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                ws.Row(3).Height = 6;
                ws.Range(3, 1, 3, totalColumns).Merge()
                    .Style.Fill.BackgroundColor = colorAzulMedio;

                ws.Row(4).Height = 18;
                ws.Row(5).Height = 18;
                ws.Row(6).Height = 18;

                ws.Range(4, 1, 6, totalColumns).Style.Fill.BackgroundColor = colorGrisClaro;
                ws.Range(4, 1, 6, totalColumns).Style.Font.FontName = "Arial";
                ws.Range(4, 1, 6, totalColumns).Style.Font.FontSize = 9;

                void SetLabel(int row, int col, string text)
                {
                    var c = ws.Cell(row, col);
                    c.Value = text;
                    c.Style.Font.Bold = true;
                    c.Style.Font.FontColor = colorAzulMedio;
                    c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                }

                void SetValue(int row, int col, object? value, string? fmt = null)
                {
                    var c = ws.Cell(row, col);

                    if (value is DateTime dt)
                        c.Value = dt;
                    else if (value is string s)
                        c.Value = s;
                    else
                        c.Value = value?.ToString() ?? "";

                    if (fmt != null)
                        c.Style.DateFormat.Format = fmt;

                    c.Style.Font.FontColor = colorTextoOscuro;
                    c.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                }

                SetLabel(4, 1, "Generado:");
                ws.Cell(4, 2).Value = DateTime.Now;
                ws.Cell(4, 2).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                ws.Cell(4, 2).Style.Font.FontColor = colorTextoOscuro;

                SetLabel(4, 4, "Desde:");
                SetValue(4, 5, fechaInicio, "dd/MM/yyyy");

                SetLabel(4, 7, "Hasta:");
                SetValue(4, 8, fechaFin, "dd/MM/yyyy");

                SetLabel(5, 1, "Estado conciliación:");
                SetValue(5, 2, string.IsNullOrWhiteSpace(estadoConciliacion) ? "TODOS" : estadoConciliacion.ToUpper());

                SetLabel(5, 4, "Solo alertas:");
                SetValue(5, 5, soloConAlertas ? "SÍ" : "NO");

                SetLabel(5, 7, "Tipo terapia:");
                SetValue(5, 8, string.IsNullOrWhiteSpace(tipoTerapia) ? "TODAS" : tipoTerapia);

                SetLabel(6, 1, "Total registros:");
                SetValue(6, 2, data.Count.ToString("N0"));

                ws.Range(6, 1, 6, totalColumns).Style.Border.BottomBorder = XLBorderStyleValues.Medium;
                ws.Range(6, 1, 6, totalColumns).Style.Border.BottomBorderColor = colorAzulMedio;

                int headerRow = 7;
                ws.Row(headerRow).Height = 32;

                string[] headers =
                {
           "ID Cita",
"Fecha Cita",
"Hora Cita",
"Día Cita",

"ID Tratamiento",
"ID Sesión",
"ID Solicitud",
            "Fecha Sesión",
            "Hora Sesión",
            "Día Sesión",
            "Tipo Terapia",
            "Nro. Sesión",
            "% Avance",
            "Notas Avance",
            "Observaciones",

            "Doc. Paciente",
            "Paciente",
            "Celular",
            "Email",

            "Tipo / Seguro",
            "Terapeuta",
            "Origen Terapeuta",

            "Estado Cita",
            "Motivo Consulta",
            "Consultorio",

            "Estado Facturación",
            "Nro. Factura",
            "Fecha Facturación",
            "Últ. Fecha Fact.",
            "Cant. Facturas",
            "Valor Cobrado",
            "Método Pago",
            "Seguro Factura",
            "Días p/ Facturar",

            "Estado Conciliación",
            "Alerta Conciliación"
        };

                for (int i = 0; i < headers.Length; i++)
                {
                    var hCell = ws.Cell(headerRow, i + 1);
                    hCell.Value = headers[i];
                    hCell.Style.Font.Bold = true;
                    hCell.Style.Font.FontSize = 9;
                    hCell.Style.Font.FontName = "Arial";
                    hCell.Style.Font.FontColor = colorBlanco;
                    hCell.Style.Fill.BackgroundColor = colorAzulMedio;
                    hCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    hCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    hCell.Style.Alignment.WrapText = true;
                    hCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    hCell.Style.Border.OutsideBorderColor = colorAzulOscuro;
                }

                int dataRow = headerRow + 1;
                bool esPar = false;

                foreach (var item in data)
                {
                    ws.Row(dataRow).Height = 16;
                    esPar = !esPar;

                    var rowBg = esPar ? colorBlanco : colorGrisMedio;

                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Fill.BackgroundColor = rowBg;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontName = "Arial";
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontSize = 9;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontColor = colorTextoOscuro;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                    ws.Cell(dataRow, 1).Value = item.IdCita;
                    ws.Cell(dataRow, 2).Value = item.FechaCita;
                    ws.Cell(dataRow, 2).Style.DateFormat.Format = "dd/MM/yyyy";
                    ws.Cell(dataRow, 3).Value = item.HoraCita;
                    ws.Cell(dataRow, 4).Value = item.Dia;

                    ws.Cell(dataRow, 5).Value = item.RequestId; // Tratamiento

                    ws.Cell(dataRow, 6).Value = item.SessionId;

                    ws.Cell(dataRow, 7).Value = item.RequestId;

                    ws.Cell(dataRow, 7).Value = item.FechaSesion;
                    ws.Cell(dataRow, 7).Style.DateFormat.Format = "dd/MM/yyyy";

                    ws.Cell(dataRow, 8).Value = item.HoraSesion;
                    ws.Cell(dataRow, 9).Value = item.DiaSesion;
                    ws.Cell(dataRow, 10).Value = item.TipoTerapia;
                    ws.Cell(dataRow, 11).Value = item.SessionCount;
                    ws.Cell(dataRow, 12).Value = item.AvancePorcentaje;
                    ws.Cell(dataRow, 13).Value = item.AvanceNotas;
                    ws.Cell(dataRow, 14).Value = item.Observations;

                    ws.Cell(dataRow, 15).Value = item.PacienteDocumento;
                    ws.Cell(dataRow, 16).Value = item.Paciente;
                    ws.Cell(dataRow, 17).Value = item.PacienteCelular;
                    ws.Cell(dataRow, 18).Value = item.PacienteEmail;

                    ws.Cell(dataRow, 19).Value = item.TipoPaciente;
                    ws.Cell(dataRow, 20).Value = item.Medico;
                    ws.Cell(dataRow, 21).Value = item.OrigenMedico;

                    ws.Cell(dataRow, 22).Value = item.EstadoCita;
                    ws.Cell(dataRow, 23).Value = item.MotivoConsulta;
                    ws.Cell(dataRow, 24).Value = item.ConsultorioId;

                    ws.Cell(dataRow, 25).Value = item.EstadoFacturacion;
                    AplicarColorEstadoFacturacion(ws.Cell(dataRow, 25), item.EstadoFacturacion);

                    ws.Cell(dataRow, 26).Value = item.NumeroFactura;

                    ws.Cell(dataRow, 27).Value = item.FechaFacturacion;
                    ws.Cell(dataRow, 27).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";

                    ws.Cell(dataRow, 28).Value = item.UltimaFechaFacturacion;
                    ws.Cell(dataRow, 28).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";

                    ws.Cell(dataRow, 29).Value = item.CantidadFacturas;

                    ws.Cell(dataRow, 30).Value = item.ValorCobrado;
                    ws.Cell(dataRow, 30).Style.NumberFormat.Format = "$ #,##0.00";

                    ws.Cell(dataRow, 31).Value = item.MetodoPago;
                    ws.Cell(dataRow, 32).Value = item.SeguroFactura;

                    ws.Cell(dataRow, 33).Value = item.DiasParaFacturar;
                    AplicarColorDiasFacturar(ws.Cell(dataRow, 33), item.DiasParaFacturar);

                    ws.Cell(dataRow, 34).Value = item.EstadoConciliacion;
                    AplicarColorEstadoConciliacion(ws.Cell(dataRow, 34), item.EstadoConciliacion);

                    ws.Cell(dataRow, 35).Value = item.AlertaConciliacion;
                    AplicarColorAlertaConciliacion(ws.Cell(dataRow, 35), item.AlertaConciliacion);

                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Border.BottomBorder = XLBorderStyleValues.Hair;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Border.BottomBorderColor = XLColor.FromHtml("#C8D4DF");

                    dataRow++;
                }

                if (data.Any())
                {
                    ws.Row(dataRow).Height = 20;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Fill.BackgroundColor = colorAzulClaro;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.Bold = true;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontName = "Arial";
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontSize = 9;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Font.FontColor = colorAzulOscuro;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Border.TopBorder = XLBorderStyleValues.Medium;
                    ws.Range(dataRow, 1, dataRow, totalColumns).Style.Border.TopBorderColor = colorAzulMedio;

                    ws.Cell(dataRow, 1).Value = $"TOTAL: {data.Count:N0} registros";
                    ws.Range(dataRow, 1, dataRow, 4).Merge();

                    int firstDataRow = headerRow + 1;

                    ws.Cell(dataRow, 29).FormulaA1 = $"=SUM(AC{firstDataRow}:AC{dataRow - 1})";
                    ws.Cell(dataRow, 29).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    ws.Cell(dataRow, 30).FormulaA1 = $"=SUM(AD{firstDataRow}:AD{dataRow - 1})";
                    ws.Cell(dataRow, 30).Style.NumberFormat.Format = "$ #,##0.00";
                    ws.Cell(dataRow, 30).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                }

                if (data.Any())
                {
                    var fullTable = ws.Range(headerRow, 1, dataRow, totalColumns);
                    fullTable.Style.Border.OutsideBorder = XLBorderStyleValues.Medium;
                    fullTable.Style.Border.OutsideBorderColor = colorAzulOscuro;
                }

                ws.Columns().AdjustToContents(8, 200);

                ws.Column(10).Width = 28;  // Tipo terapia
                ws.Column(13).Width = 32;  // Notas avance
                ws.Column(14).Width = 35;  // Observaciones
                ws.Column(16).Width = 32;  // Paciente
                ws.Column(18).Width = 28;  // Email
                ws.Column(20).Width = 30;  // Terapeuta
                ws.Column(23).Width = 30;  // Motivo consulta
                ws.Column(31).Width = 20;  // Método pago
                ws.Column(34).Width = 20;  // Estado conciliación
                ws.Column(35).Width = 55;  // Alerta conciliación

                ws.SheetView.FreezeRows(headerRow);
                ws.SheetView.FreezeColumns(1);

                ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
                ws.PageSetup.FitToPages(1, 0);
                ws.SheetView.ZoomScale = 90;

                using var stream = new MemoryStream();
                workbook.SaveAs(stream);

                return File(
                    stream.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Conciliacion_Terapias_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error al descargar reporte de conciliación de terapias. UsuarioId: {UsuarioId}",
                    HttpContext.Session.GetInt32("UsuarioId")
                );

                TempData["ErrorMessage"] = "Ocurrió un error al generar el reporte de conciliación de terapias.";
                return RedirectToAction("ResumenConsultas");
            }
        }


        // ══════════════════════════════════════════════════════════════════════════
        // HELPERS DE COLOR
        // ══════════════════════════════════════════════════════════════════════════

        private static void AplicarColorEstadoConciliacion(IXLCell cell, string? estado)
        {
            switch (estado?.ToUpper())
            {
                case "CONCILIADO":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#C6EFCE");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#276221");
                    cell.Style.Font.Bold = true;
                    break;
                case "PENDIENTE":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFEB9C");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#9C6500");
                    cell.Style.Font.Bold = true;
                    break;
                case "REVISAR":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFC7CE");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#9C0006");
                    cell.Style.Font.Bold = true;
                    break;
            }
        }

        private static void AplicarColorAlertaConciliacion(IXLCell cell, string? alerta)
        {
            if (string.IsNullOrWhiteSpace(alerta)) return;

            if (alerta.StartsWith("ALERTA", StringComparison.OrdinalIgnoreCase))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFC7CE");
                cell.Style.Font.FontColor = XLColor.FromHtml("#9C0006");
                cell.Style.Font.Bold = true;
            }
            else if (alerta.StartsWith("PENDIENTE", StringComparison.OrdinalIgnoreCase))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFEB9C");
                cell.Style.Font.FontColor = XLColor.FromHtml("#9C6500");
                cell.Style.Font.Bold = true;
            }
            else if (alerta.Equals("OK", StringComparison.OrdinalIgnoreCase))
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#C6EFCE");
                cell.Style.Font.FontColor = XLColor.FromHtml("#276221");
                cell.Style.Font.Bold = true;
            }
        }


        private static void AplicarColorEstadoFacturacion(IXLCell cell, string? estado)
        {
            switch (estado?.ToUpper())
            {
                case "FACTURADO":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#C6EFCE");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#276221");
                    cell.Style.Font.Bold = true;
                    break;

                case "NO FACTURADO":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFC7CE");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#9C0006");
                    cell.Style.Font.Bold = true;
                    break;

                case "PAGADO SIN FACTURA RELACIONADA":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFEB9C");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#9C6500");
                    cell.Style.Font.Bold = true;
                    break;

                case "PENDIENTE":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFEB9C");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#9C6500");
                    cell.Style.Font.Bold = true;
                    break;

                case "NO APLICA":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#EDEDED");
                    cell.Style.Font.FontColor = XLColor.FromHtml("#666666");
                    break;
            }
        }
        private static void AplicarColorDiasFacturar(IXLCell cell, int? dias)
        {
            if (dias == null) return;
            if (dias <= 1)
                cell.Style.Font.FontColor = XLColor.FromHtml("#276221");
            else if (dias <= 3)
                cell.Style.Font.FontColor = XLColor.FromHtml("#9C6500");
            else
            {
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFC7CE");
                cell.Style.Font.FontColor = XLColor.FromHtml("#9C0006");
                cell.Style.Font.Bold = true;
            }
        }
    }
}
