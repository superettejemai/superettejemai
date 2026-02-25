const express = require('express');
const router = express.Router();
const printController = require('../Controllers/printController');

// Existing receipt print
router.post('/print', printController.printReceipt);

// NEW: Print sales report
router.post('/print-sales-report', printController.printSalesReport);

module.exports = router;