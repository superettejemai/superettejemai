// models/order.model.js
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    total: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    tax: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    paid_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    change_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0.00 },
    payment_method: { type: DataTypes.ENUM('cash','card','other'), defaultValue: 'cash' },
    note: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'orders', timestamps: false });
};
