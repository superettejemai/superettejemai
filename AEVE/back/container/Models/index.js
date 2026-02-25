// container/Models/index.js
const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const User = require('./user.model')(sequelize, Sequelize.DataTypes);
const Product = require('./product.model')(sequelize, Sequelize.DataTypes);
const ProductImage = require('./productImage.model')(sequelize, Sequelize.DataTypes);
const Order = require('./order.model')(sequelize, Sequelize.DataTypes);
const OrderItem = require('./orderItem.model')(sequelize, Sequelize.DataTypes);
const AuditLog = require('./audit.model')(sequelize, Sequelize.DataTypes);
const Template = require('./template.model')(sequelize, Sequelize.DataTypes);
const Facture = require('./facture.model')(sequelize, Sequelize.DataTypes);
const FactureItem = require('./factureItem.model')(sequelize, Sequelize.DataTypes);

// Existing Associations
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

// New Facture Associations
Facture.hasMany(FactureItem, { foreignKey: 'facture_id' });
FactureItem.belongsTo(Facture, { foreignKey: 'facture_id' });

Product.hasMany(FactureItem, { foreignKey: 'product_id' });
FactureItem.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Facture, { foreignKey: 'created_by' });
Facture.belongsTo(User, { foreignKey: 'created_by' });

module.exports = {
  sequelize, // Make sure sequelize is exported
  Sequelize,
  User, 
  Product, 
  ProductImage, 
  Order, 
  OrderItem, 
  AuditLog, 
  Template,
  Facture,
  FactureItem
};