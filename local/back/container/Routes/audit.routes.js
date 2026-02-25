const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const {
  createAuditLog,
  getAuditLogs,
  getAuditLogById,
  clearAuditLogs
} = require('../Controllers/audit.controller');

router.use(authenticate); // protect all
router.use(requireRole('admin')); // admin only

router.post('/', createAuditLog); // create log manually
router.get('/', getAuditLogs); // get all logs, filterable
router.get('/:id', getAuditLogById); // get log by id
router.delete('/', clearAuditLogs); // clear all logs

module.exports = router;
