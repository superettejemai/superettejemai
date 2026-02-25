// container/Controllers/orders.controller.js
const { sequelize, Order, OrderItem, Product } = require('../Models');
const { buildReceipt } = require('../utils/printerSimulator');
const { logAudit } = require('../utils/audit.utils');

async function createOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    
    const { items, paid_amount, payment_method = 'cash', note } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No items in order' });
    }

    // Compute totals and reduce stock
    let total = 0;
    const orderItemsData = [];
    
    for (const item of items) {
    
      
      const product = await Product.findByPk(item.product_id, {
        transaction: t
      });
      
      if (!product) {
        await t.rollback();
        return res.status(400).json({ message: `Product ${item.product_id} not found` });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      const lineTotal = parseFloat(product.price) * qty;
      total += lineTotal;
      
      orderItemsData.push({
        product_id: product.id,
        name: product.name,
        unit_price: product.price,
        quantity: qty,
        total: lineTotal,
      });

      // Decrement stock
      if (product.stock - qty < 0) {
        await t.rollback();
        return res.status(400).json({ 
          message: `Stock insuffisant pour ${product.name}. Stock disponible: ${product.stock}` 
        });
      }
      
      await product.update({ 
        stock: product.stock - qty 
      }, { 
        transaction: t 
      });
      
      console.log(`Updated stock for ${product.name}: ${product.stock} -> ${product.stock - qty}`);
    }

    const paidAmount = parseFloat(paid_amount) || total;
    const change_amount = Math.max(0, paidAmount - total);
    
    console.log('Creating order with:', {
      total,
      paid_amount: paidAmount,
      change_amount,
      payment_method,
      user_id: req.user?.id
    });

    const order = await Order.create(
      {
        user_id: req.user ? req.user.id : null,
        total,
        tax: 0,
        paid_amount: paidAmount,
        change_amount: change_amount,
        payment_method,
        note,
      },
      { transaction: t }
    );

    console.log('Order created with ID:', order.id);

    // Create order items
    for (const oi of orderItemsData) {
      await OrderItem.create({ 
        order_id: order.id, 
        ...oi 
      }, { 
        transaction: t 
      });
    }



    await t.commit();
    console.log('Transaction committed successfully');

    // Prepare receipt
    const itemsFromDb = await OrderItem.findAll({ 
      where: { order_id: order.id } 
    });
    
    const receipt = buildReceipt(order, itemsFromDb);

    res.status(201).json({ 
      success: true,
      order, 
      receipt,
      message: 'Order created successfully'
    });

  } catch (err) {
    await t.rollback();
    console.error('Order creation failed:', err);
    res.status(500).json({ 
      success: false,
      message: 'Order creation failed', 
      error: err.message,
      details: err.toString()
    });
  }
}

async function getOrders(req, res) {
  try {
    const orders = await Order.findAll({ 
      order: [['created_at', 'DESC']], 
      limit: 200 
    });
    
    res.json({ 
      success: true,
      orders 
    });

    if (req.user) {
      await logAudit({
        actor_id: req.user.id,
        actor_role: req.user.role,
        action: 'VIEW_ORDERS',
        details: `User ${req.user.name} fetched orders list`,
      });
    }
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
}

// FIXED: Get order items by order ID
async function getOrderItems(req, res) {
  try {
    const { orderId } = req.params;
    
    console.log('Fetching order items for order ID:', orderId);

    // First, verify the order exists
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    // Get order items with product information
    const orderItems = await OrderItem.findAll({
      where: { order_id: orderId },
      include: [{
        model: Product,
        attributes: ['id', 'name', 'barcode', 'category'],
        required: false // Use left join in case product is deleted
      }],
      raw: true,
      nest: true
    });

    console.log('Found order items:', orderItems.length);

    if (!orderItems || orderItems.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No items found for this order' 
      });
    }

    // Transform the data to include product information
    const itemsWithProductInfo = orderItems.map(item => {
      // Use the name from OrderItem (saved at time of order) as fallback
      const productName = item.name || (item.Product ? item.Product.name : 'Product Not Found');
      
      return {
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total),
        product_name: productName,
        product_barcode: item.Product ? item.Product.barcode : null,
        product_category: item.Product ? item.Product.category : null
      };
    });

    res.json({ 
      success: true,
      items: itemsWithProductInfo 
    });

  } catch (err) {
    console.error('Error fetching order items:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching order items', 
      error: err.message 
    });
  }
}

module.exports = { createOrder, getOrders, getOrderItems };