namespace ExpertMed.Models
{
    public class TherapyBillingRequestDto
    {
        public int PacienteId { get; set; }
        public decimal TotalFactura { get; set; }
        public string MetodoPago { get; set; }
        public string Referencia { get; set; }
        // Datos del Receptor
        public string Nombres { get; set; }
        public string Identificacion { get; set; }
        public string TipoIdentificacion { get; set; } // "05", "04", etc.
        public string Direccion { get; set; }
        public string Email { get; set; }
        public string Telefono { get; set; }
        public List<TherapyItemDto> Items { get; set; }
    }

    public class TherapyItemDto
    {
        public string Codigo { get; set; }
        public string Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal Precio { get; set; }
    }
}
