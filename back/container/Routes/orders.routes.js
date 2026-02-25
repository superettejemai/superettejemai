// container/Routes/orders.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth.middleware');
const { createOrder, getOrders, getOrderItems } = require('../Controllers/orders.controller');

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getOrders);
// FIXED ROUTE: Make sure this route is properly defined
router.get('/:orderId/items', authenticate, getOrderItems);

module.exports = router;