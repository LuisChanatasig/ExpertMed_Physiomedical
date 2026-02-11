namespace ExpertMed.Models
{
    public class RegistrarPagoRequest
    {
        public int AppointmentId { get; set; }
        public string PaymentMethod { get; set; }
        public decimal PaymentAmount { get; set; }
        public byte[]? PaymentProof { get; set; }
        public string? PaymentNotes { get; set; }
    }
}
