const { AuditLog } = require('../Models');

// Create audit log manually
exports.createAuditLog = async (req, res) => {
  try {
    const { actor_id, actor_role, action, details } = req.body;
    const log = await AuditLog.create({ actor_id, actor_role, action, details });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create audit log' });
  }
};

// Get all audit logs (filterable)
exports.getAuditLogs = async (req, res) => {
  try {
    const { actor_id, actor_role, action } = req.query;
    const where = {};
    if (actor_id) where.actor_id = actor_id;
    if (actor_role) where.actor_role = actor_role;
    if (action) where.action = action;

    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// Get one log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

// Clear all logs
exports.clearAuditLogs = async (req, res) => {
  try {
    await AuditLog.destroy({ where: {} });
    res.json({ message: 'All logs cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};
