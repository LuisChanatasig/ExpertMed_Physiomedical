document.addEventListener("DOMContentLoaded", function () {
    const dashboardData = window.resumenTerapiasData || {};
    const dataEvolution = dashboardData.evolucion || [];
    const dataStatus = dashboardData.estados || [];

    initEvolutionChart(dataEvolution);
    initStatusChart(dataStatus);
    initQuickDateFilters();
});

function initEvolutionChart(dataEvolution) {
    const chartElement = document.getElementById("chartEvolution");

    if (!chartElement || typeof echarts === "undefined") {
        return;
    }

    const chartEv = echarts.init(chartElement);

    const optionEv = {
        tooltip: {
            trigger: "axis"
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            containLabel: true
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: dataEvolution.map(i => formatDateOnly(i.fecha)),
            axisLine: {
                lineStyle: {
                    color: "#ccc"
                }
            }
        },
        yAxis: {
            type: "value",
            splitLine: {
                lineStyle: {
                    type: "dashed"
                }
            }
        },
        series: [
            {
                name: "Sesiones",
                type: "line",
                smooth: true,
                data: dataEvolution.map(i => i.cantidadSesiones ?? 0),
                itemStyle: {
                    color: "#405189"
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                            offset: 0,
                            color: "rgba(64, 81, 137, 0.5)"
                        },
                        {
                            offset: 1,
                            color: "rgba(64, 81, 137, 0.01)"
                        }
                    ])
                }
            }
        ]
    };

    chartEv.setOption(optionEv);

    window.addEventListener("resize", function () {
        chartEv.resize();
    });
}

function initStatusChart(dataStatus) {
    const chartElement = document.getElementById("chartStatus");

    if (!chartElement || typeof echarts === "undefined") {
        return;
    }

    const chartSt = echarts.init(chartElement);

    const optionSt = {
        tooltip: {
            trigger: "item"
        },
        legend: {
            bottom: "0%",
            left: "center"
        },
        series: [
            {
                name: "Estado",
                type: "pie",
                radius: ["40%", "70%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: "#fff",
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: "center"
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: "bold"
                    }
                },
                data: dataStatus.map(i => {
                    return {
                        value: i.cantidad ?? 0,
                        name: i.estado || "Sin estado",
                        itemStyle: {
                            color: getStatusColor(i.estado)
                        }
                    };
                })
            }
        ]
    };

    chartSt.setOption(optionSt);

    window.addEventListener("resize", function () {
        chartSt.resize();
    });
}

function initQuickDateFilters() {
    document.querySelectorAll("[data-range]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const now = new Date();
            const type = btn.dataset.range;

            let dStart;
            let dEnd;

            if (type === "today") {
                dStart = now;
                dEnd = now;
            }

            if (type === "week") {
                const current = new Date();
                const day = current.getDay() || 7;

                current.setDate(current.getDate() - day + 1);

                dStart = current;
                dEnd = addDays(current, 6);
            }

            if (type === "month") {
                dStart = new Date(now.getFullYear(), now.getMonth(), 1);
                dEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }

            const fechaDesde = document.getElementById("fechaDesde");
            const fechaHasta = document.getElementById("fechaHasta");

            if (fechaDesde && dStart) {
                fechaDesde.value = formatInputDate(dStart);
            }

            if (fechaHasta && dEnd) {
                fechaHasta.value = formatInputDate(dEnd);
            }
        });
    });
}

function getStatusColor(estado) {
    const value = (estado || "").toLowerCase();

    if (value.includes("completado")) {
        return "#0ab39c";
    }

    if (value.includes("avanzado")) {
        return "#299cdb";
    }

    if (value.includes("en proceso")) {
        return "#f7b84b";
    }

    if (value.includes("sin iniciar")) {
        return "#f06548";
    }

    if (value.includes("sin avance")) {
        return "#878a99";
    }

    return "#ccc";
}

function formatDateOnly(value) {
    if (!value) {
        return "";
    }

    return value.toString().substring(0, 10);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}