const express = require('express');
const router = express.Router();
const { printReceipt } = require('../Controllers/printController');
const authenticate = require('../middlewares/auth.middleware');

// Print receipt route - NO authentication for now to test
router.post('/print', printReceipt);

// If you want authentication later, use this:
// router.post('/print', authenticate, printReceipt);

module.exports = router;