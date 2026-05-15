function detect({ bpm, spo2 }) {
  if (bpm != null) {
    if (bpm > 150) return { type: 'tachycardia', message: `BPM ${bpm} supera 150`, value: bpm };
    if (bpm < 40)  return { type: 'bradycardia', message: `BPM ${bpm} por debajo de 40`, value: bpm };
  }
  if (spo2 != null && spo2 < 90) {
    return { type: 'low_oxygen', message: `SpO2 ${spo2}% por debajo de 90%`, value: spo2 };
  }
  return null;
}

function isInvalidTemperature(temperature) {
  if (temperature == null) return false;
  return temperature < 30 || temperature > 45;
}

module.exports = { detect, isInvalidTemperature };
