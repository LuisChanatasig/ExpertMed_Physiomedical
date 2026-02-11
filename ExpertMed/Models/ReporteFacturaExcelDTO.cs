namespace ExpertMed.Models
{
    public class ReporteFacturaExcelDTO
    {
        public string NroFactura { get; set; }
        public DateTime FechaFacturacion { get; set; }
        public DateTime FechaCita { get; set; }
        public string Paciente { get; set; }
        public string Medico { get; set; } // Asegúrate que se llene desde el SP
        public decimal Subtotal { get; set; }
        public string MedioDePago { get; set; }
        public string EsCredito { get; set; }
        public DateTime? FechaVencimientoCredito { get; set; }
        public decimal MontoAPagarCredito { get; set; }
        public string Aseguradora { get; set; }
    }
}
