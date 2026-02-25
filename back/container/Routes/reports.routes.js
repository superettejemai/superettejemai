const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { dailySummary } = require('../Controllers/reports.controller');

router.get('/daily', authenticate, dailySummary);

module.exports = router;
