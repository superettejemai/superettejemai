// container/Models/orderItem.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
    unit_price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    total: { type: DataTypes.DECIMAL(12,2), allowNull: false }
  }, { 
    tableName: 'order_items', 
    timestamps: false 
  });

  return OrderItem;
};