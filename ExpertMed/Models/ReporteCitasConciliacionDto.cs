namespace ExpertMed.Models
{
    public class ReporteCitasConciliacionDto
    {
        // ============================
        // CITA RELACIONADA
        // ============================
        public int? IdCita { get; set; }
        public DateTime? FechaCita { get; set; }
        public string? HoraCita { get; set; }
        public string? Dia { get; set; }

        // ============================
        // SESIÓN DE TERAPIA
        // ============================
        public int SessionId { get; set; }
        public int RequestId { get; set; }

        public DateTime? FechaSesion { get; set; }
        public string? HoraSesion { get; set; }
        public string? DiaSesion { get; set; }

        public string? TipoTerapia { get; set; }
        public int? SessionCount { get; set; }

        public int? AvancePorcentaje { get; set; }
        public string? AvanceNotas { get; set; }
        public string? Observations { get; set; }
        public DateTime? ModificationDate { get; set; }

        // ============================
        // PACIENTE
        // ============================
        public int? PatientId { get; set; }
        public string? PacienteDocumento { get; set; }
        public string? Paciente { get; set; }
        public string? PacienteCelular { get; set; }
        public string? PacienteEmail { get; set; }

        // ============================
        // TIPO PACIENTE / SEGURO
        // ============================
        public int? SeguroCitaId { get; set; }
        public string? TipoPaciente { get; set; }

        // ============================
        // TERAPEUTA / MÉDICO DE TERAPIA
        // ============================
        public int? MedicoId { get; set; }
        public string? Medico { get; set; }
        public string? OrigenMedico { get; set; }

        // ============================
        // CITA ADMINISTRATIVA
        // ============================
        public int? EstadoCitaId { get; set; }
        public string? EstadoCita { get; set; }
        public string? MotivoConsulta { get; set; }
        public int? ConsultorioId { get; set; }

        // ============================
        // FACTURACIÓN
        // ============================
        public string? EstadoFacturacion { get; set; }
        public string? BillingIds { get; set; }
        public string? NumeroFactura { get; set; }

        public DateTime? FechaFacturacion { get; set; }
        public DateTime? UltimaFechaFacturacion { get; set; }

        public int? CantidadFacturas { get; set; }
        public decimal ValorCobrado { get; set; }

        public string? MetodoPago { get; set; }

        public int? BillingIsInsurance { get; set; }
        public int? SeguroFacturaId { get; set; }
        public string? SeguroFactura { get; set; }

        public int? DiasParaFacturar { get; set; }

        public int? SeguroDiferenteCitaFactura { get; set; }
        public int? CitaModificadaDespuesFactura { get; set; }

        // ============================
        // AUDITORÍA DE CITA
        // ============================
        public int? UsuarioCreadorId { get; set; }
        public string? UsuarioCreador { get; set; }

        public int? PerfilCreadorId { get; set; }
        public string? PerfilCreador { get; set; }

        public DateTime? FechaCreacionCita { get; set; }
        public DateTime? FechaModificacionCita { get; set; }

        public int? UsuarioModificacionId { get; set; }

        // ============================
        // CONCILIACIÓN
        // ============================
        public string? EstadoConciliacion { get; set; }
        public string? AlertaConciliacion { get; set; }

        public int? RequestRelacionado { get; set; }

    }
}