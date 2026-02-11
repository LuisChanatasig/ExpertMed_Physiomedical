/**
 * Manager para la gestión de Facturas Emitidas
 * Optimizado para rendimiento y carga asíncrona
 */
class FacturasManager {
    constructor(config) {
        this.config = config;
        this.table = null;
        this.elements = {
            table: $('#facturas-table'),
            searchInput: $('#dtSearch'),
            dateFrom: $('#fDesde'),
            dateTo: $('#fHasta'),
            applyBtn: $('#btnAplicar'),
            clearBtn: $('#btnLimpiar'),
            presetBtns: $('[data-preset]')
        };
        this.init();
    }

    init() {
        this.initDataTable();
        this.bindEvents();
    }

    initDataTable() {
        this.table = this.elements.table.DataTable({
            language: { url: '//cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json' },
            responsive: true,
            pageLength: 10,
            order: [[1, 'desc']],
            dom: 'rt<"row mt-3"<"col-sm-4"l><"col-sm-4 text-center"i><"col-sm-4"p>>',
            columnDefs: [
                { targets: [5, 6, 7], className: 'text-end' },
                { targets: 9, orderable: false, searchable: false, className: 'text-center' }
            ],
            drawCallback: () => this.updateFooterTotals()
        });
    }

    bindEvents() {
        // Búsqueda con debounce
        let timeout = null;
        this.elements.searchInput.on('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.table.search($(e.target).val()).draw();
            }, 300);
        });

        this.elements.applyBtn.on('click', () => this.applyFilters());
        this.elements.clearBtn.on('click', () => window.location.reload());
        this.elements.presetBtns.on('click', (e) => this.applyDatePreset($(e.currentTarget).data('preset')));

        $('#btnExportExcel').on('click', () => this.exportToExcel());
    }

    async applyFilters() {
        const desde = this.elements.dateFrom.val();
        const hasta = this.elements.dateTo.val();

        if (!desde || !hasta) return;

        try {
            this.showLoading(true);
            const response = await fetch(this.config.urls.filtrar, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': $(this.config.token).val()
                },
                body: JSON.stringify({ fechaDesde: desde, fechaHasta: hasta })
            });

            const result = await response.json();
            if (result.success) {
                this.renderTableData(result.data);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            this.showLoading(false);
        }
    }

    renderTableData(data) {
        this.table.clear();

        const rows = data.map(item => {
            const sub = parseFloat(item.subtotal || 0);
            const aseg = parseFloat(item.totalAseguradora || 0);
            const cop = parseFloat(item.totalCopago || 0);
            const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : "—";
            const btnHtml = item.origen === "LOCAL"
                ? `<a href="${this.config.urls.imprimir}?facturaId=${item.facturaId}" class="btn btn-sm btn-soft-primary"><i class="mdi mdi-printer"></i></a>`
                : `<small class="text-muted">${item.origen}</small>`;

            return [
                item.secuencial || "—",
                fecha,
                item.paciente || "—",
                item.medico || "—",
                item.aseguradora || "Particular",
                `<span data-raw="${sub}">${sub.toFixed(2)}</span>`,
                `<span data-raw="${aseg}">${aseg.toFixed(2)}</span>`,
                `<span data-raw="${cop}">${cop.toFixed(2)}</span>`,
                `<span class="badge bg-primary">${item.metodoPago || "—"}</span>`,
                btnHtml
            ];
        });

        this.table.rows.add(rows).draw();
    }

    updateFooterTotals() {
        const columns = [5, 6, 7]; // Subtotal, Aseguradora, Copago
        const ids = ['#ft-subtotal', '#ft-aseguradora', '#ft-copago'];

        columns.forEach((colIdx, i) => {
            let total = 0;
            this.table.column(colIdx, { search: 'applied' }).nodes().to$().each(function () {
                total += parseFloat($(this).find('span').data('raw') || 0);
            });
            $(ids[i]).text(new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(total));
        });
    }

    exportToExcel() {
        const url = `${this.config.urls.exportar}?fDesde=${this.elements.dateFrom.val()}&fHasta=${this.elements.dateTo.val()}`;
        window.location.href = url;
    }

    applyDatePreset(preset) {
        const now = new Date();
        let from = new Date();
        if (preset === '7d') from.setDate(now.getDate() - 7);
        else if (preset === 'mes') from = new Date(now.getFullYear(), now.getMonth(), 1);

        this.elements.dateFrom.val(from.toISOString().split('T')[0]);
        this.elements.dateTo.val(now.toISOString().split('T')[0]);
        this.applyFilters();
    }

    showLoading(show) {
        $('#loading-overlay').toggleClass('d-none', !show);
    }
}

// Inicialización
$(() => {
    if (window.FacturasConfig) {
        window.facturasManager = new FacturasManager(window.FacturasConfig);
    }
});