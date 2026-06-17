const PHYSICAL_RANGES = {
  bpm: { min: 20, max: 250 },
  spo2: { min: 50, max: 100 },
  temperature: { min: 25, max: 45 }
};

const ANOMALY_RULES = [
  { metric: 'bpm', test: (v) => v > 150, type: 'tachycardia', message: 'Elevated heart rate' },
  { metric: 'bpm', test: (v) => v < 40, type: 'bradycardia', message: 'Low heart rate' },
  { metric: 'spo2', test: (v) => v < 90, type: 'low_oxygen', message: 'Low oxygen saturation' }
];

function validatePhysicalRange(vital) {
  for (const metric of Object.keys(PHYSICAL_RANGES)) {
    const value = vital[metric];
    if (value === undefined || value === null) continue;
    const { min, max } = PHYSICAL_RANGES[metric];
    if (value < min || value > max) {
      return {
        valid: false,
        metric,
        value,
        reason: `${metric}=${value} out of physical range [${min}, ${max}]`
      };
    }
  }
  return { valid: true };
}

function detectAnomalies(vital) {
  const anomalies = [];
  for (const rule of ANOMALY_RULES) {
    const value = vital[rule.metric];
    if (value === undefined || value === null) continue;
    if (rule.test(value)) {
      anomalies.push({
        type: rule.type,
        message: rule.message,
        metric: rule.metric,
        value
      });
    }
  }
  return anomalies;
}

module.exports = { validatePhysicalRange, detectAnomalies };
