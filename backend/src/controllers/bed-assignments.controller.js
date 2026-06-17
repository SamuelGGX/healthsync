const repo  = require('../repositories/bed-assignments.repository');
const audit = require('../repositories/audit.repository');
const { notifyReconnect } = require('../services/stale-beds-monitor');

async function assign(req, res) {
  const { bed_id, patient_id } = req.body ?? {};
  if (!bed_id || !patient_id) {
    return res.status(400).json({ error: 'bed_id y patient_id son requeridos' });
  }
  try {
    const occupied = await repo.findActiveBed(Number(bed_id));
    if (occupied) {
      return res.status(409).json({ error: 'La cama ya tiene un paciente asignado' });
    }
    const assignment = await repo.insert({
      bed_id:           Number(bed_id),
      patient_id:       Number(patient_id),
      assigned_user_id: req.user.id,
    });

    // Auditoría
    await audit.log({
      user_id:    req.user.id,
      action:     'BED_ASSIGN',
      table_name: 'bed_assignments',
      record_id:  assignment.id,
      new_value:  { bed_id: assignment.bed_id, patient_id: assignment.patient_id },
    });

    // Avisar al dashboard + gracia al stale-monitor
    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: Number(bed_id), status: 'active' });
    notifyReconnect(Number(bed_id));

    res.status(201).json(assignment);
  } catch (err) {
    console.error('[BedAssignmentsController] assign:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function end(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const assignment = await repo.end(id);
    if (!assignment) return res.status(404).json({ error: 'Asignación no encontrada o ya cerrada' });

    await audit.log({
      user_id:    req.user.id,
      action:     'BED_RELEASE',
      table_name: 'bed_assignments',
      record_id:  assignment.id,
      new_value:  { bed_id: assignment.bed_id, ended_at: assignment.ended_at },
    });

    const io = req.app.get('io');
    if (io) io.emit('bed_status', { bed_id: assignment.bed_id, status: 'inactive' });

    res.json(assignment);
  } catch (err) {
    console.error('[BedAssignmentsController] end:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { assign, end };
