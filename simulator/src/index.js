require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS) || 1000;
const REFRESH_MS  = 3000; // cada 3s re-checa qué camas deben simular

const http = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'X-API-Key': process.env.SIMULATOR_API_KEY || '' },
});

let activeBedIds = [];

function randomBetween(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateVital(bedId) {
  return {
    bed_id:      bedId,
    bpm:         randomBetween(60, 100),
    spo2:        randomBetween(95, 99),
    temperature: randomBetween(36.0, 37.5),
  };
}

async function waitForBackend() {
  while (true) {
    try {
      await http.get('/beds');
      console.log('[SIM] Backend ready');
      return;
    } catch (err) {
      console.log('[SIM] Backend not ready, retrying in 3s...');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function refreshActiveBeds() {
  try {
    const { data } = await http.get('/beds');
    // Solo filtramos por auto_simulate. Si una cama está 'disconnected' pero
    // tiene auto_simulate=TRUE, igual mandamos data — el monitor la auto-reconectará.
    // Las desconexiones manuales (botón Desconectar) ponen auto_simulate=FALSE,
    // así que esas sí se respetan.
    const newActive = data
      .filter((b) => b.auto_simulate)
      .map((b) => b.id);

    if (newActive.length !== activeBedIds.length) {
      console.log(`[SIM] Active beds changed: ${activeBedIds.length} -> ${newActive.length}`);
    }
    activeBedIds = newActive;
  } catch (err) {
    // el backend puede estar caído momentáneamente; no spamear logs
  }
}

async function sendVitals() {
  for (const bedId of activeBedIds) {
    try {
      await http.post('/vitals', generateVital(bedId));
    } catch (err) {
      console.error(`[SIM] Error bed ${bedId}: ${err.message}`);
    }
  }
}

async function run() {
  await waitForBackend();
  await refreshActiveBeds();

  setInterval(refreshActiveBeds, REFRESH_MS);
  setInterval(sendVitals,        INTERVAL_MS);
}

run();
