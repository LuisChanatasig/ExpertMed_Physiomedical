namespace ExpertMed.Models
{
    public class ReporteCitasConciliacionFiltroDto
    {
        public DateTime? FechaInicio { get; set; }
        public DateTime? FechaFin { get; set; }

        // En este reporte MedicoId representa el therapist_id de therapy_requests
        public int? MedicoId { get; set; }

        public int? PacienteId { get; set; }

        public string? TipoTerapia { get; set; }

        public bool? SoloFacturados { get; set; }

        public bool SoloConAlertas { get; set; } = false;

        public string? EstadoConciliacion { get; set; }

    }
}