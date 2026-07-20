using ExpertMed.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace ExpertMed.Services
{
    public class ReportService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<ReportService> _logger; // Corregí el tipo de ILogger
        private readonly DbExpertmedContext _dbContext;

        public ReportService(IHttpContextAccessor httpContextAccessor, ILogger<ReportService> logger, DbExpertmedContext dbContext)
        {
            _dbContext = dbContext;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<ResumenTerapiasDto> GetResumenTerapiasAsync(
     DateTime? fechaDesde,
     DateTime? fechaHasta,
     int perfilId,
     int usuarioId)
        {
            var resumen = new ResumenTerapiasDto();

            try
            {
                using var connection = new SqlConnection(_dbContext.Database.GetConnectionString());

                using var command = new SqlCommand("sp_ReporteResumenConsultas", connection)
                {
                    CommandType = CommandType.StoredProcedure
                };

                command.Parameters.Add("@fechaDesde", SqlDbType.Date).Value =
                    fechaDesde.HasValue ? fechaDesde.Value.Date : DBNull.Value;

                command.Parameters.Add("@fechaHasta", SqlDbType.Date).Value =
                    fechaHasta.HasValue ? fechaHasta.Value.Date : DBNull.Value;

                command.Parameters.Add("@perfilId", SqlDbType.Int).Value = perfilId;
                command.Parameters.Add("@usuarioId", SqlDbType.Int).Value = usuarioId;

                await connection.OpenAsync();

                using var reader = await command.ExecuteReaderAsync();

                // ---------------------------------------------------------
                // 1. KPIs
                // ---------------------------------------------------------
                if (await reader.ReadAsync())
                {
                    resumen.Kpi = new ResumenTerapiasDto.DashboardKpi
                    {
                        TotalSesiones = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0)),
                        TotalTerapias = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1)),
                        TotalPagadas = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2)),
                        TotalPacientesHistorico = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3))
                    };
                }

                // ---------------------------------------------------------
                // 2. Evolución diaria
                // ---------------------------------------------------------
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        resumen.EvolucionDiaria.Add(new ResumenTerapiasDto.DashboardEvolutionItem
                        {
                            Fecha = reader.IsDBNull(0) ? DateTime.MinValue : reader.GetDateTime(0),
                            CantidadSesiones = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1))
                        });
                    }
                }

                // ---------------------------------------------------------
                // 3. Estado / avance de terapias
                // ---------------------------------------------------------
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        resumen.EstadoTerapias.Add(new ResumenTerapiasDto.DashboardStatusItem
                        {
                            Estado = reader.IsDBNull(0) ? string.Empty : reader.GetString(0),
                            Cantidad = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1))
                        });
                    }
                }

                // ---------------------------------------------------------
                // 4. Ranking tipos de terapia
                // ---------------------------------------------------------
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        resumen.RankingTiposTerapia.Add(new ResumenTerapiasDto.DashboardTipoTerapiaItem
                        {
                            TipoTerapia = reader.IsDBNull(0) ? string.Empty : reader.GetString(0),
                            CantidadSesiones = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1))
                        });
                    }
                }

                // ---------------------------------------------------------
                // 5. Terapias por tipo
                // ---------------------------------------------------------
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        resumen.TerapiasPorTipo.Add(new ResumenTerapiasDto.DashboardTerapiaTipoItem
                        {
                            TipoTerapia = reader.IsDBNull(0) ? string.Empty : reader.GetString(0),
                            CantidadSesiones = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1))
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener el reporte de dashboard de terapias.");
                throw;
            }

            return resumen;
        }

        public async Task<List<ReporteCitasConciliacionDto>> GetReporteCitasConciliacionAsync(
    ReporteCitasConciliacionFiltroDto filtro
)
        {
            var reporte = new List<ReporteCitasConciliacionDto>();

            try
            {
                using var connection = new SqlConnection(_dbContext.Database.GetConnectionString());

                using var command = new SqlCommand("dbo.sp_ReporteCitasConciliacion", connection)
                {
                    CommandType = CommandType.StoredProcedure,
                    CommandTimeout = 120
                };

                command.Parameters.Add("@FechaInicio", SqlDbType.Date).Value =
                    filtro.FechaInicio.HasValue
                        ? filtro.FechaInicio.Value.Date
                        : DBNull.Value;

                command.Parameters.Add("@FechaFin", SqlDbType.Date).Value =
                    filtro.FechaFin.HasValue
                        ? filtro.FechaFin.Value.Date
                        : DBNull.Value;

                command.Parameters.Add("@MedicoId", SqlDbType.Int).Value =
                    filtro.MedicoId.HasValue
                        ? filtro.MedicoId.Value
                        : DBNull.Value;

                command.Parameters.Add("@PacienteId", SqlDbType.Int).Value =
                    filtro.PacienteId.HasValue
                        ? filtro.PacienteId.Value
                        : DBNull.Value;

                command.Parameters.Add("@TipoTerapia", SqlDbType.NVarChar, 100).Value =
                    string.IsNullOrWhiteSpace(filtro.TipoTerapia)
                        ? DBNull.Value
                        : filtro.TipoTerapia.Trim();

                command.Parameters.Add("@SoloFacturados", SqlDbType.Bit).Value =
                    filtro.SoloFacturados.HasValue
                        ? filtro.SoloFacturados.Value
                        : DBNull.Value;

                command.Parameters.Add("@SoloConAlertas", SqlDbType.Bit).Value =
                    filtro.SoloConAlertas;

                command.Parameters.Add("@EstadoConciliacion", SqlDbType.VarChar, 20).Value =
                    string.IsNullOrWhiteSpace(filtro.EstadoConciliacion)
                        ? DBNull.Value
                        : filtro.EstadoConciliacion.Trim().ToUpper();

                await connection.OpenAsync();

                using var reader = await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    reporte.Add(new ReporteCitasConciliacionDto
                    {
                        // ============================
                        // CITA RELACIONADA
                        // ============================
                        IdCita = reader["id_cita"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["id_cita"]),

                        FechaCita = reader["fecha_cita"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["fecha_cita"]),

                        HoraCita = reader["hora_cita"] == DBNull.Value
                            ? null
                            : reader["hora_cita"].ToString(),

                        Dia = reader["dia"] == DBNull.Value
                            ? null
                            : reader["dia"].ToString(),

                        // ============================
                        // SESIÓN DE TERAPIA
                        // ============================
                        SessionId = reader["session_id"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["session_id"]),

                        RequestId = reader["request_id"] == DBNull.Value
                            ? 0
                            : Convert.ToInt32(reader["request_id"]),

                        FechaSesion = reader["fecha_sesion"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["fecha_sesion"]),

                        HoraSesion = reader["hora_sesion"] == DBNull.Value
                            ? null
                            : reader["hora_sesion"].ToString(),

                        DiaSesion = reader["dia_sesion"] == DBNull.Value
                            ? null
                            : reader["dia_sesion"].ToString(),

                        TipoTerapia = reader["tipo_terapia"] == DBNull.Value
                            ? null
                            : reader["tipo_terapia"].ToString(),

                        SessionCount = reader["session_count"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["session_count"]),

                        AvancePorcentaje = reader["avance_porcentaje"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["avance_porcentaje"]),

                        AvanceNotas = reader["avance_notas"] == DBNull.Value
                            ? null
                            : reader["avance_notas"].ToString(),

                        Observations = reader["observations"] == DBNull.Value
                            ? null
                            : reader["observations"].ToString(),

                        ModificationDate = reader["modification_date"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["modification_date"]),

                        // ============================
                        // PACIENTE
                        // ============================
                        PatientId = reader["patient_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["patient_id"]),

                        PacienteDocumento = reader["paciente_documento"] == DBNull.Value
                            ? null
                            : reader["paciente_documento"].ToString(),

                        Paciente = reader["paciente"] == DBNull.Value
                            ? null
                            : reader["paciente"].ToString(),

                        PacienteCelular = reader["paciente_celular"] == DBNull.Value
                            ? null
                            : reader["paciente_celular"].ToString(),

                        PacienteEmail = reader["paciente_email"] == DBNull.Value
                            ? null
                            : reader["paciente_email"].ToString(),

                        // ============================
                        // TIPO PACIENTE / SEGURO
                        // ============================
                        SeguroCitaId = reader["seguro_cita_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["seguro_cita_id"]),

                        TipoPaciente = reader["tipo_paciente"] == DBNull.Value
                            ? null
                            : reader["tipo_paciente"].ToString(),

                        // ============================
                        // TERAPEUTA / MÉDICO DE TERAPIA
                        // ============================
                        MedicoId = reader["medico_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["medico_id"]),

                        Medico = reader["medico"] == DBNull.Value
                            ? null
                            : reader["medico"].ToString(),

                        OrigenMedico = reader["origen_medico"] == DBNull.Value
                            ? null
                            : reader["origen_medico"].ToString(),

                        // ============================
                        // CITA ADMINISTRATIVA
                        // ============================
                        EstadoCitaId = reader["estado_cita_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["estado_cita_id"]),

                        EstadoCita = reader["estado_cita"] == DBNull.Value
                            ? null
                            : reader["estado_cita"].ToString(),

                        MotivoConsulta = reader["motivo_consulta"] == DBNull.Value
                            ? null
                            : reader["motivo_consulta"].ToString(),

                        ConsultorioId = reader["consultorio_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["consultorio_id"]),

                        // ============================
                        // FACTURACIÓN
                        // ============================
                        EstadoFacturacion = reader["estado_facturacion"] == DBNull.Value
                            ? null
                            : reader["estado_facturacion"].ToString(),

                        BillingIds = reader["billing_ids"] == DBNull.Value
                            ? null
                            : reader["billing_ids"].ToString(),

                        NumeroFactura = reader["numero_factura"] == DBNull.Value
                            ? null
                            : reader["numero_factura"].ToString(),

                        FechaFacturacion = reader["fecha_facturacion"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["fecha_facturacion"]),

                        UltimaFechaFacturacion = reader["ultima_fecha_facturacion"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["ultima_fecha_facturacion"]),

                        CantidadFacturas = reader["cantidad_facturas"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["cantidad_facturas"]),

                        ValorCobrado = reader["valor_cobrado"] == DBNull.Value
                            ? 0
                            : Convert.ToDecimal(reader["valor_cobrado"]),

                        MetodoPago = reader["metodo_pago"] == DBNull.Value
                            ? null
                            : reader["metodo_pago"].ToString(),

                        BillingIsInsurance = reader["billing_is_insurance"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["billing_is_insurance"]),

                        SeguroFacturaId = reader["seguro_factura_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["seguro_factura_id"]),

                        SeguroFactura = reader["seguro_factura"] == DBNull.Value
                            ? null
                            : reader["seguro_factura"].ToString(),

                        DiasParaFacturar = reader["dias_para_facturar"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["dias_para_facturar"]),

                        SeguroDiferenteCitaFactura = reader["seguro_diferente_cita_factura"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["seguro_diferente_cita_factura"]),

                        CitaModificadaDespuesFactura = reader["cita_modificada_despues_factura"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["cita_modificada_despues_factura"]),

                        // ============================
                        // AUDITORÍA DE CITA
                        // ============================
                        UsuarioCreadorId = reader["usuario_creador_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["usuario_creador_id"]),

                        UsuarioCreador = reader["usuario_creador"] == DBNull.Value
                            ? null
                            : reader["usuario_creador"].ToString(),

                        PerfilCreadorId = reader["perfil_creador_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["perfil_creador_id"]),

                        PerfilCreador = reader["perfil_creador"] == DBNull.Value
                            ? null
                            : reader["perfil_creador"].ToString(),

                        FechaCreacionCita = reader["fecha_creacion_cita"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["fecha_creacion_cita"]),

                        FechaModificacionCita = reader["fecha_modificacion_cita"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["fecha_modificacion_cita"]),

                        UsuarioModificacionId = reader["usuario_modificacion_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["usuario_modificacion_id"]),

                        // ============================
                        // CONCILIACIÓN
                        // ============================
                        EstadoConciliacion = reader["estado_conciliacion"] == DBNull.Value
                            ? null
                            : reader["estado_conciliacion"].ToString(),

                        AlertaConciliacion = reader["alerta_conciliacion"] == DBNull.Value
                            ? null
                            : reader["alerta_conciliacion"].ToString(),
                        RequestRelacionado = reader["request_id"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["request_id"])

                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error al obtener el reporte de conciliación de terapias. SP: dbo.sp_ReporteCitasConciliacion"
                );

                throw;
            }

            return reporte;
        }
    }
}