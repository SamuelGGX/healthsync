require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL  || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS) || 1000;

function randomBetween(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateNormal(bedId) {
  return {
    bed_id:      bedId,
    bpm:         randomBetween(60, 100),
    spo2:        randomBetween(95, 99),
    temperature: randomBetween(36.0, 37.5),
  };
}

async function fetchBeds() {
  while (true) {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/beds`);
      if (data.length > 0) {
        console.log(`[SIM] Found ${data.length} beds. Starting simulation...`);
        return data.map(b => b.id);
      }
    } catch (err) {
      console.log('[SIM] Backend not ready, retrying in 3s...');
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

async function run() {
  const bedIds = await fetchBeds();

  setInterval(async () => {
    for (const bedId of bedIds) {
      axios.post(`${BACKEND_URL}/vitals`, generateNormal(bedId)).catch(err =>
        console.error(`[SIM] Error bed ${bedId}:`, err.message)
      );
    }
  }, INTERVAL_MS);
}

run();
