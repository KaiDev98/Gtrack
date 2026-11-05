import ApexCharts from "apexcharts";

const BRAND = "#465fff";
const GREEN = "#12b76a";
const ORANGE = "#f79009";

function isDark() {
  return document.documentElement.classList.contains("dark");
}

function baseOptions() {
  const dark = isDark();
  return {
    chart: {
      fontFamily: "Outfit, sans-serif",
      foreColor: dark ? "#98a2b3" : "#667085",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 450 },
      background: "transparent",
    },
    theme: { mode: dark ? "dark" : "light" },
    grid: {
      borderColor: dark ? "#1d2939" : "#eaecf0",
      strokeDashArray: 4,
      padding: { left: 4, right: 4, top: 0, bottom: 0 },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: { formatter: (v) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v) },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: dark ? "#98a2b3" : "#667085" } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: dark ? "#98a2b3" : "#667085" },
        formatter: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)),
      },
    },
    legend: {
      labels: { colors: dark ? "#98a2b3" : "#475467" },
      markers: { size: 6 },
    },
  };
}

function destroy(el) {
  if (el?.__apexChart) {
    try {
      el.__apexChart.destroy();
    } catch {
      /* noop */
    }
    el.__apexChart = null;
  }
}

export function renderArea(el, { categories = [], values = [], name = "Volume", color = BRAND, suffix = "" } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    ...baseOptions(),
    series: [{ name, data: values }],
    chart: { ...baseOptions().chart, type: "area", height: 300, sparkline: { enabled: false } },
    colors: [color],
    stroke: { curve: "smooth", width: 3 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: { ...baseOptions().xaxis, categories },
    tooltip: {
      ...baseOptions().tooltip,
      y: { formatter: (v) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v)} ${suffix}`.trim() },
    },
    yaxis: baseOptions().yaxis,
    grid: baseOptions().grid,
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function renderBar(el, { categories = [], values = [], name = "Volume", color = BRAND, suffix = "", horizontal = false, height = 300 } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    ...baseOptions(),
    series: [{ name, data: values }],
    chart: { ...baseOptions().chart, type: "bar", height },
    colors: [color],
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 6,
        columnWidth: "46%",
        borderRadiusApplication: "end",
        distributed: false,
      },
    },
    stroke: { show: false },
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.3, gradientToColors: [dark ? "#7592ff" : "#9cb9ff"], stops: [0, 100] } },
    xaxis: { ...baseOptions().xaxis, categories },
    tooltip: {
      ...baseOptions().tooltip,
      y: { formatter: (v) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v)} ${suffix}`.trim() },
    },
    yaxis: baseOptions().yaxis,
    grid: baseOptions().grid,
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function renderDonut(el, { labels = [], values = [], colors = [], totalLabel = "Sesi" } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    chart: { ...baseOptions().chart, type: "donut", height: 280 },
    series: values,
    labels,
    colors: colors.length ? colors : [BRAND, "#7c3aed", ORANGE, "#06b6d4", "#ec4899"],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: "bottom",
      fontSize: "13px",
      labels: { colors: dark ? "#98a2b3" : "#475467" },
      markers: { size: 6 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: totalLabel,
              color: dark ? "#98a2b3" : "#667085",
              fontSize: "12px",
              formatter: () => String(values.reduce((a, b) => a + b, 0)),
            },
            value: {
              color: dark ? "#f2f4f7" : "#101828",
              fontSize: "26px",
              fontWeight: 600,
              formatter: (v) => v,
            },
            name: { color: dark ? "#98a2b3" : "#667085", fontSize: "12px" },
          },
        },
      },
    },
    tooltip: { theme: dark ? "dark" : "light" },
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function renderLine(el, { categories = [], series = [], height = 280, suffix = "", colors = [BRAND, GREEN] } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    ...baseOptions(),
    series,
    chart: { ...baseOptions().chart, type: "line", height },
    colors,
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 3, hover: { size: 5 } },
    xaxis: { ...baseOptions().xaxis, categories },
    tooltip: {
      ...baseOptions().tooltip,
      y: { formatter: (v) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v)} ${suffix}`.trim() },
    },
    yaxis: { ...baseOptions().yaxis, labels: { ...baseOptions().yaxis.labels, formatter: (v) => `${Math.round(v)}` } },
    grid: baseOptions().grid,
    legend: { ...baseOptions().legend, position: "top", horizontalAlign: "right" },
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function renderDualLine(el, { categories = [], series = [], height = 300 } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    ...baseOptions(),
    series,
    chart: { ...baseOptions().chart, type: "line", height },
    colors: [BRAND, ORANGE],
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 3, hover: { size: 6 } },
    xaxis: { ...baseOptions().xaxis, categories },
    yaxis: [
      {
        labels: { style: { fontSize: "11px", colors: dark ? "#98a2b3" : "#667085" } },
      },
      {
        opposite: true,
        labels: { style: { fontSize: "11px", colors: [ORANGE] } },
      },
    ],
    grid: baseOptions().grid,
    legend: { ...baseOptions().legend, position: "top", horizontalAlign: "right" },
    tooltip: { theme: dark ? "dark" : "light" },
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function renderMixed(el, { categories = [], barValues = [], lineValues = [], barName = "Volume", lineName = "Berat badan", height = 300 } = {}) {
  if (!el) return null;
  destroy(el);
  const dark = isDark();
  const chart = new ApexCharts(el, {
    ...baseOptions(),
    series: [
      { name: barName, type: "column", data: barValues },
      { name: lineName, type: "line", data: lineValues },
    ],
    chart: { ...baseOptions().chart, type: "line", height },
    colors: [BRAND, ORANGE],
    stroke: { width: [0, 3], curve: "smooth" },
    plotOptions: { bar: { columnWidth: "42%", borderRadius: 4 } },
    xaxis: { ...baseOptions().xaxis, categories },
    yaxis: [
      { ...baseOptions().yaxis },
      { opposite: true, labels: { style: { fontSize: "11px", colors: [ORANGE] }, formatter: (v) => v.toFixed(0) } },
    ],
    grid: baseOptions().grid,
    legend: { ...baseOptions().legend, position: "top", horizontalAlign: "right" },
  });
  chart.render();
  el.__apexChart = chart;
  return chart;
}

export function destroyCharts(root = document) {
  root.querySelectorAll(".__apexChart").forEach(() => {});
}

export function themeMode() {
  return isDark() ? "dark" : "light";
}

export { ApexCharts };
