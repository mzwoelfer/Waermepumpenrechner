// Core calculation for the Wärmepumpen Rechner.
// Reproduces the original "Wärmepumpen Rechner.ods" (v1.2).
// All prices in €, energy in kWh. Pure function, no DOM/Vue dependency.
function calculate(p) {
  const rows = [];

  // Consumption and fuel price are kept internally in kWh and €/kWh, regardless
  // of the fuel type. The UI handles unit display/conversion (Öl: 10.9 kWh/L).

  // Useful heat the building needs per year (kWh of heat).
  // consumption (kWh) * burner efficiency = delivered heat.
  const heatDemand = p.annualConsumption * p.efficiency;
  // For the "later" heat pump an optionally reduced heat demand can be used
  // (e.g. after insulation). Empty -> same as today.
  const heatDemandLater =
    p.newHeatDemand && p.newHeatDemand > 0 ? p.newHeatDemand : heatDemand;

  let cumExisting = 0; // "Alte Heizung & WP Später"
  let cumImmediate = 0; // "Wärmepumpe Sofort"
  let interestBalance = 0; // savings invested at interest rate

  for (let i = 0; i <= p.years; i++) {
    const year = p.startYear + i;
    const fuelPrice = p.fuelPrice * Math.pow(1 + p.fuelPriceIncrease, i);
    const elecPrice = p.elecPrice * Math.pow(1 + p.elecPriceIncrease, i);

    // --- Scenario A: keep existing heating, switch to heat pump later ---
    // The later switch (e.g. assumed gas/oil ban after the install year) can be
    // turned off via p.enableLater; then the existing heating runs the whole time.
    let existingAnnual;
    let heatingLabel;
    if (!p.enableLater || year < p.installYear) {
      heatingLabel = p.heatingType;
      existingAnnual = p.annualConsumption * fuelPrice;
      if (i === 0) existingAnnual += p.purchasePriceExisting;
    } else {
      heatingLabel = 'WP';
      existingAnnual = (heatDemandLater / p.copLater) * elecPrice;
      if (year === p.installYear) {
        existingAnnual += p.costLater * (1 - p.subsidyLater);
      }
    }

    // --- Scenario B: install heat pump immediately ---
    let immediateAnnual = (heatDemand / p.cop) * elecPrice;
    if (i === 0) immediateAnnual += p.purchasePrice * (1 - p.subsidy);

    cumExisting += existingAnnual;
    cumImmediate += immediateAnnual;

    const advantagePerYear = existingAnnual - immediateAnnual;
    // Cumulative advantage of "WP Sofort" including the opportunity cost of capital:
    // each year's difference is carried forward and accrues interest. The early,
    // large heat-pump investment therefore keeps "costing" interest every year,
    // which pushes the break-even later. With p.interest = 0 this reduces to the
    // plain cumulative difference (cumExisting - cumImmediate).
    interestBalance = interestBalance * (1 + (p.interest || 0)) + advantagePerYear;
    const advantageTotal = interestBalance;
    // Interest portion that was added on top of the plain difference (for display).
    const interest = advantageTotal - (cumExisting - cumImmediate);

    rows.push({
      i, year, elecPrice, fuelPrice, heatingLabel,
      existingAnnual, cumExisting, immediateAnnual, cumImmediate,
      advantagePerYear, advantageTotal, interest,
    });
  }

  // Break-even: first year where the immediate heat pump is cheaper overall.
  const breakEven = rows.find((r) => r.advantageTotal >= 0);

  return { rows, breakEven, heatDemand, heatDemandLater };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculate };
}
