const { Sequelize } = require('sequelize');
const path = require('path');

// Database file path (offline/local)
const dbPath = path.resolve(__dirname, '../database/offline_pos.db');

// Ensure directory exists (Sequelize will create file but keep path sane)
// Create a Sequelize instance using sqlite dialect
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false // set to console.log for debugging
});

module.exports = sequelize;
