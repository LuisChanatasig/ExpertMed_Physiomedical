using System.ComponentModel.DataAnnotations;

namespace ExpertMed.Models
{
    public class Facturacions
    {
        public int? CitaId { get; set; }
        public int? InsuranceCompanyId { get; set; }
        public DateTime FechaFacturacion { get; set; }
        public decimal TotalFactura { get; set; }
        public string? MetodoPago { get; set; }
        public byte[]? ComprobantePagoFacturacion { get; set; }
        public string BillingDetailsNames { get; set; }
        public string BillingDetailsCiNumber { get; set; }
        public string BillingDetailsDocumentType { get; set; }
        public string BillingDetailsAddress { get; set; }
        public string BillingDetailsPhone { get; set; }
        public string BillingDetailsEmail { get; set; }
        public List<BillingItemDTO> Items { get; set; } = new List<BillingItemDTO>();

        public List<PaymentMethodDTO>? PaymentMethods { get; set; }

        // =============================================
        // NUEVAS PROPIEDADES PARA CRÉDITO
        // =============================================

        /// <summary>
        /// Indica si la factura es a crédito
        /// </summary>
        public bool EsCredito { get; set; } = false;

        /// <summary>
        /// Fecha de vencimiento del crédito (requerido si EsCredito = true)
        /// </summary>
        [Display(Name = "Fecha de Vencimiento")]
        public DateTime? FechaVencimientoCredito { get; set; }

        /// <summary>
        /// Monto que se otorga a crédito (requerido si EsCredito = true)
        /// </summary>
        [Display(Name = "Monto a Crédito")]
        [Range(0.01, double.MaxValue, ErrorMessage = "El monto a crédito debe ser mayor a cero")]
        public decimal? MontoCredito { get; set; }

        /// <summary>
        /// Medio de pago del crédito (cheque, efectivo, tarjeta_debito, tarjeta_credito, otros)
        /// </summary>
        [Display(Name = "Medio de Pago del Crédito")]
        public string? MedioPagoCredito { get; set; }

    }

}
