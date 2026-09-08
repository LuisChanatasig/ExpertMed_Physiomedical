namespace ExpertMed.Models
{

    public class TerapiaTipoDTO
    {
        public int TerapiaTipoId { get; set; }
        public int TerapiaCategoriaId { get; set; }
        public string Categoria { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public int Orden { get; set; }
    }

    public class TerapiaFrecuenciaDTO
    {
        public int TerapiaFrecuenciaId { get; set; }
        public int Dias { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }
}
