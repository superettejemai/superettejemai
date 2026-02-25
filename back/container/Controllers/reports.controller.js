const { sequelize } = require('../Models');
async function dailySummary(req, res) {
  const [results] = await sequelize.query(`
    SELECT DATE(created_at) as day, COUNT(*) as orders_count, SUM(total) as total_sales
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30;
  `);
  res.json({ summary: results });
}
module.exports = { dailySummary };