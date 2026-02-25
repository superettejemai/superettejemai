const { sequelize } = require('../Models');

async function dailySummary(req, res) {
  try {
    const [results] = await sequelize.query(`
      SELECT DATE(created_at) as day, COUNT(*) as orders_count, SUM(total) as total_sales
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY day DESC
      LIMIT 30;
    `);
    
    res.json({ 
      success: true,
      data: results 
    });
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = { dailySummary };