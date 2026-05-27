const repo  = require('../repositories/patients.repository');
const audit = require('../repositories/audit.repository');

async function getAll(req, res) {
  try {
    const unassigned = req.query.unassigned === 'true';
    const patients = await repo.findAll({ unassigned });
    res.json(patients);
  } catch (err) {
    console.error('[PatientsController] getAll:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function getOne(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const patient = await repo.findById(id);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(patient);
  } catch (err) {
    console.error('[PatientsController] getOne:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function create(req, res) {
  const { full_name, document_id, birth_date, blood_type } = req.body ?? {};
  if (!full_name?.trim() || !document_id?.trim() || !birth_date) {
    return res.status(400).json({ error: 'full_name, document_id y birth_date son requeridos' });
  }
  try {
    const patient = await repo.insert({ full_name, document_id, birth_date, blood_type });
    await audit.log({
      user_id:    req.user.id,
      action:     'CREATE',
      table_name: 'patients',
      record_id:  patient.id,
      new_value:  { full_name: patient.full_name, document_id: patient.document_id },
    });
    res.status(201).json(patient);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El documento ya existe' });
    }
    console.error('[PatientsController] create:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  // password ya fue consumido por verifyPassword; se excluye del update
  const { full_name, document_id, birth_date, blood_type } = req.body ?? {};
  try {
    const patient = await repo.update(id, { full_name, document_id, birth_date, blood_type });
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    await audit.log({
      user_id:    req.user.id,
      action:     'UPDATE',
      table_name: 'patients',
      record_id:  id,
      new_value:  { full_name, document_id, birth_date, blood_type },
    });
    res.json(patient);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El documento ya existe' });
    }
    console.error('[PatientsController] update:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function discharge(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const result = await repo.discharge(id);
    if (!result) return res.status(409).json({ error: 'El paciente ya fue dado de alta' });

    await audit.log({
      user_id:    req.user.id,
      action:     'UPDATE',
      table_name: 'patients',
      record_id:  id,
      new_value:  { discharged_at: result.patient.discharged_at, freed_beds: result.freedBedIds },
    });

    // Avisar al dashboard que las camas liberadas quedaron apagadas
    const io = req.app.get('io');
    if (io) {
      for (const bedId of result.freedBedIds) {
        io.emit('bed_status', { bed_id: bedId, status: 'inactive' });
      }
    }

    res.json(result.patient);
  } catch (err) {
    console.error('[PatientsController] discharge:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function readmit(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const patient = await repo.readmit(id);
    if (!patient) {
      return res.status(409).json({ error: 'El paciente no está dado de alta (o no existe)' });
    }

    await audit.log({
      user_id:    req.user.id,
      action:     'UPDATE',
      table_name: 'patients',
      record_id:  id,
      new_value:  { readmitted: true, admitted_at: patient.admitted_at },
    });

    res.json(patient);
  } catch (err) {
    console.error('[PatientsController] readmit:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { getAll, getOne, create, update, discharge, readmit };
