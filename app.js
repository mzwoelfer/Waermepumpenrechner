// Wärmepumpen Rechner – UI (Vue 3 global build, no build step).
// The calculation lives in calc.js (loaded before this file).
const { createApp, reactive, computed, watch, onMounted, ref, nextTick } = Vue;

const fmtEur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const fmtEur2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});
const fmtNum = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

createApp({
  setup() {
    // Default values taken 1:1 from the ODS file.
    const p = reactive({
      startYear: new Date().getFullYear(),
      years: 30,
      // Bestehende Heizung
      heatingType: 'Gas',
      annualConsumption: 20000,
      fuelPrice: 0.1,
      fuelPriceIncrease: 0.02,
      efficiency: 0.8,
      purchasePriceExisting: 0,
      interest: 0,
      // Wärmepumpe Sofort
      elecPrice: 0.22,
      elecPriceIncrease: 0.01,
      cop: 3,
      purchasePrice: 30000,
      subsidy: 0.55,
      // Wärmepumpe Später
      installYear: 2045,
      enableLater: false,
      copLater: 3.5,
      costLater: 20000,
      subsidyLater: 0.35,
      newHeatDemand: null,
    });

    const result = computed(() => calculate(p));

    // Consumption and price are stored internally in kWh / €/kWh. The fuel type
    // only changes how they are *displayed*: for Öl we convert via 10.9 kWh/Liter.
    // Because toggling never writes the stored value, switching back and forth is
    // loss-free (no rounding drift).
    const OIL_KWH_PER_L = 10.9;
    const isOil = computed(() => p.heatingType === 'Öl');
    const fuelUnit = computed(() => (isOil.value ? 'Liter' : 'kWh'));

    function setFuel(type) {
      p.heatingType = type;
    }

    const round2 = (v) => Math.round(v * 100) / 100;
    const round4 = (v) => Math.round(v * 10000) / 10000;

    const consumptionDisplay = computed({
      get: () => (isOil.value ? round2(p.annualConsumption / OIL_KWH_PER_L) : p.annualConsumption),
      set: (val) => {
        p.annualConsumption = isOil.value ? val * OIL_KWH_PER_L : val;
      },
    });
    const fuelPriceDisplay = computed({
      get: () => (isOil.value ? round4(p.fuelPrice * OIL_KWH_PER_L) : p.fuelPrice),
      set: (val) => {
        p.fuelPrice = isOil.value ? val / OIL_KWH_PER_L : val;
      },
    });

    // Inputs are shown as percentages while the model uses decimals (0.02 <-> 2 %).
    // pct() builds a get/set proxy that converts on the fly.
    function pct(key) {
      return computed({
        get: () => {
          const v = p[key];
          return v == null ? v : Math.round(v * 10000) / 100;
        },
        set: (val) => {
          p[key] = val == null || val === '' ? null : val / 100;
        },
      });
    }
    const fuelPriceIncreasePct = pct('fuelPriceIncrease');
    const elecPriceIncreasePct = pct('elecPriceIncrease');
    const efficiencyPct = pct('efficiency');
    const subsidyPct = pct('subsidy');
    const subsidyLaterPct = pct('subsidyLater');
    const interestPct = pct('interest');

    let chart = null;
    const chartCanvas = ref(null);

    function renderChart() {
      if (!chartCanvas.value) return;
      const rows = result.value.rows;
      const labels = rows.map((r) => r.year);
      const dataA = rows.map((r) => r.cumExisting);
      const dataB = rows.map((r) => r.cumImmediate);
      const labelA = p.enableLater ? 'Alte Heizung & WP Später' : 'Bestehende Heizung';

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = dataA;
        chart.data.datasets[0].label = labelA;
        chart.data.datasets[1].data = dataB;
        chart.update();
        return;
      }

      chart = new Chart(chartCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: labelA,
              data: dataA,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220,38,38,.1)',
              tension: 0.2,
              pointRadius: 0,
            },
            {
              label: 'Wärmepumpe Sofort',
              data: dataB,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,.1)',
              tension: 0.2,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${fmtEur.format(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            y: {
              ticks: { callback: (v) => fmtEur.format(v) },
              title: { display: true, text: 'Gesamtkosten' },
            },
            x: { title: { display: true, text: 'Jahr' } },
          },
        },
      });
    }

    watch(result, () => nextTick(renderChart), { deep: true });
    onMounted(() => nextTick(renderChart));

    function resetDefaults() {
      Object.assign(p, {
        startYear: new Date().getFullYear(), years: 30, heatingType: 'Gas', annualConsumption: 20000,
        fuelPrice: 0.1, fuelPriceIncrease: 0.02, efficiency: 0.8,
        purchasePriceExisting: 0, interest: 0, elecPrice: 0.22,
        elecPriceIncrease: 0.01, cop: 3, purchasePrice: 30000, subsidy: 0.55,
        installYear: 2045, enableLater: false, copLater: 3.5, costLater: 20000,
        subsidyLater: 0.35, newHeatDemand: null,
      });
    }

    return {
      p, result, chartCanvas, resetDefaults, fmtEur, fmtEur2, fmtNum,
      setFuel, fuelUnit, isOil, consumptionDisplay, fuelPriceDisplay,
      fuelPriceIncreasePct, elecPriceIncreasePct, efficiencyPct,
      subsidyPct, subsidyLaterPct, interestPct,
    };
  },
}).mount('#app');
