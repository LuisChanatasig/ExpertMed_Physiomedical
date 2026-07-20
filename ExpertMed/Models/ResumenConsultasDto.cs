namespace ExpertMed.Models
{
    public class ResumenTerapiasDto
    {
        // Dataset 1: KPIs
        public DashboardKpi Kpi { get; set; } = new DashboardKpi();

        // Dataset 2: Evolución diaria de terapias
        public List<DashboardEvolutionItem> EvolucionDiaria { get; set; } = new();

        // Dataset 3: Estado / avance de terapias
        public List<DashboardStatusItem> EstadoTerapias { get; set; } = new();

        // Dataset 4: Ranking por tipo de terapia
        public List<DashboardTipoTerapiaItem> RankingTiposTerapia { get; set; } = new();

        // Dataset 5: Terapias por tipo
        public List<DashboardTerapiaTipoItem> TerapiasPorTipo { get; set; } = new();

        public class DashboardKpi
        {
            public int TotalSesiones { get; set; }
            public int TotalTerapias { get; set; }
            public int TotalPagadas { get; set; }
            public int TotalPacientesHistorico { get; set; }
        }

        public class DashboardEvolutionItem
        {
            public DateTime Fecha { get; set; }
            public int CantidadSesiones { get; set; }
        }

        public class DashboardStatusItem
        {
            public string Estado { get; set; } = string.Empty;
            public int Cantidad { get; set; }
        }

        public class DashboardTipoTerapiaItem
        {
            public string TipoTerapia { get; set; } = string.Empty;
            public int CantidadSesiones { get; set; }
        }

        public class DashboardTerapiaTipoItem
        {
            public string TipoTerapia { get; set; } = string.Empty;
            public int CantidadSesiones { get; set; }
        }
    }
}