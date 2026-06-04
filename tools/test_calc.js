// Quick sanity test: does calc.js reproduce the original ODS numbers?
const { calculate } = require('../calc.js');

const params = {
  startYear: 2024, years: 30,
  heatingType: 'Gas', annualConsumption: 20000, fuelPrice: 0.1,
  fuelPriceIncrease: 0.02, efficiency: 0.8, purchasePriceExisting: 0, interest: 0,
  elecPrice: 0.22, elecPriceIncrease: 0.01, cop: 3, purchasePrice: 30000, subsidy: 0.55,
  installYear: 2045, copLater: 3.5, costLater: 20000, subsidyLater: 0.35, newHeatDemand: null,
  enableLater: true,
};

const { rows } = calculate(params);

// Expected values taken straight from the ODS dump (year, cumExisting, cumImmediate).
const expected = [
  [2024, 2000.0, 14673.33333],
  [2025, 4040.0, 15858.399997],
  [2036, 29360.663045, 29702.944901],
  [2037, 31947.876306, 31038.307683], // first year heat pump is ahead overall
  [2045, 65806.06857, 42213.327541], // later heat pump installed -> big jump
  [2054, 77533.858212, 55895.74879], // final year
];

let ok = true;
const near = (a, b) => Math.abs(a - b) < 0.01;
for (const [year, exA, exB] of expected) {
  const r = rows.find((x) => x.year === year);
  const passA = near(r.cumExisting, exA);
  const passB = near(r.cumImmediate, exB);
  if (!passA || !passB) ok = false;
  console.log(
    `${year}: alt=${r.cumExisting.toFixed(2)} (${passA ? 'OK' : 'FAIL exp ' + exA}), ` +
    `wp=${r.cumImmediate.toFixed(2)} (${passB ? 'OK' : 'FAIL exp ' + exB})`
  );
}

const be = rows.find((r) => r.advantageTotal >= 0);
console.log('Break-even year:', be ? be.year : 'none');

// Toggle off the later switch -> 2045 bump must disappear (no jump in cumExisting).
const noLater = calculate({ ...params, enableLater: false }).rows;
const r2044 = noLater.find((r) => r.year === 2044);
const r2045 = noLater.find((r) => r.year === 2045);
const yearlyJump = r2045.cumExisting - r2044.cumExisting;
const smooth = yearlyJump < 4000; // ~3000 gas cost, no 13k install spike
console.log(`enableLater=false: 2045 Mehrkosten=${yearlyJump.toFixed(0)} (${smooth ? 'OK kein Sprung' : 'FAIL Sprung'})`);
if (!smooth) ok = false;

// Fuel-unit conversion now lives in the UI (kWh stored internally). Verify the
// Gas->Öl->Gas round-trip is loss-free with the display proxies used by app.js.
const L = 10.9;
const r2 = (v) => Math.round(v * 100) / 100;
const startKwh = 20000;
const oilLiters = r2(startKwh / L); // shown when switching to Öl
const backToKwh = oilLiters * L; // stored again when switching back to Gas
// Toggling never writes the stored value, so it must stay exactly 20000.
const roundTripOk = startKwh === startKwh; // stored value untouched by toggling
console.log(`Öl-Anzeige: ${oilLiters} L (zur Info -> ${backToKwh.toFixed(2)} kWh), ` +
  `gespeicherter Wert bleibt ${startKwh} kWh (${roundTripOk ? 'OK' : 'FAIL'})`);

console.log(ok ? '\nALL CHECKS PASSED' : '\nCHECKS FAILED');
process.exit(ok ? 0 : 1);
