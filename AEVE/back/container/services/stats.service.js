const { sequelize, Order, OrderItem, Product } = require('../Models');
const { Op } = require('sequelize');

class StatsService {
  /**
   * Get product statistics with filters - using raw SQL to avoid association issues
   */
  async getProductStats(filters) {
    const { startDate, endDate, category, productName, cashierId } = filters;
    console.log('Stats filters:', { startDate, endDate, category, productName, cashierId });

    try {
      // Build WHERE conditions
      let whereConditions = [];
      let queryParams = [];

      // Handle date range - create proper date objects
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // If it's a single day, set end time to end of day
      if (startDate === endDate) {
        endDateObj.setHours(23, 59, 59, 999);
      }

      whereConditions.push(`o.created_at BETWEEN ? AND ?`);
      queryParams.push(startDateObj, endDateObj);

      // Cashier filter
      if (cashierId) {
        whereConditions.push(`o.user_id = ?`);
        queryParams.push(cashierId);
      }

      // Product conditions
      if (category) {
        whereConditions.push(`p.category = ?`);
        queryParams.push(category);
      } else if (productName) {
        whereConditions.push(`p.name LIKE ?`);
        queryParams.push(`%${productName}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const sqlQuery = `
        SELECT
          COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
          COALESCE(SUM(oi.total), 0) as total_revenue,
          COALESCE(COUNT(DISTINCT oi.order_id), 0) as total_orders,
          COALESCE(SUM((oi.unit_price - COALESCE(p.cost_price, 0)) * oi.quantity), 0) as total_profit
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN products p ON oi.product_id = p.id
        ${whereClause}
      `;

      console.log('SQL Query:', sqlQuery);
      console.log('Query params:', queryParams);

      // Don't use array destructuring - handle empty results properly
      const results = await sequelize.query(sqlQuery, {
        replacements: queryParams,
        type: sequelize.QueryTypes.SELECT
      });

      console.log('Raw SQL results:', results);
      console.log('Results type:', Array.isArray(results) ? 'Array' : typeof results);

      // Handle both array and object results safely
      let firstResult;
      if (Array.isArray(results)) {
        firstResult = results[0] || {};
      } else {
        firstResult = results || {};
      }

      const totalRevenue = parseFloat(firstResult.total_revenue || 0);
      const totalProfit = parseFloat(firstResult.total_profit || 0);
      const totalCost = totalRevenue - totalProfit;

      return {
        totalCost: isNaN(totalCost) ? 0 : totalCost,
        totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
        totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
        totalOrders: parseInt(firstResult.total_orders || 0),
        totalQuantitySold: parseInt(firstResult.total_quantity_sold || 0),
        period: {
          startDate,
          endDate,
          isSingleDay: startDate === endDate
        },
        filter: category ? { category } : productName ? { productName } : { all: 'all' }
      };
    } catch (error) {
      console.error('Stats calculation error:', error);
      throw new Error(`Stats calculation failed: ${error.message}`);
    }
  }

  /**
   * Get detailed sales report with product breakdown
   */
  async getDetailedSalesReport(filters) {
    const { startDate, endDate, category, productName, cashierId } = filters;
    console.log('Detailed report filters:', { startDate, endDate, category, productName, cashierId });

    try {
      // Build WHERE conditions
      let whereConditions = [];
      let queryParams = [];

      // Handle date range
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // If it's a single day, set end time to end of day
      if (startDate === endDate) {
        endDateObj.setHours(23, 59, 59, 999);
      }

      whereConditions.push(`o.created_at BETWEEN ? AND ?`);
      queryParams.push(startDateObj, endDateObj);

      // Cashier filter
      if (cashierId) {
        whereConditions.push(`o.user_id = ?`);
        queryParams.push(cashierId);
      }

      // Product conditions
      if (category) {
        whereConditions.push(`p.category = ?`);
        queryParams.push(category);
      } else if (productName) {
        whereConditions.push(`p.name LIKE ?`);
        queryParams.push(`%${productName}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Query to get product breakdown
      const productQuery = `
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.category as product_category,
          p.barcode as product_barcode,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.total) as total_revenue,
          AVG(oi.unit_price) as avg_price,
          COALESCE(SUM((oi.unit_price - COALESCE(p.cost_price, 0)) * oi.quantity), 0) as total_profit
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN products p ON oi.product_id = p.id
        ${whereClause}
        GROUP BY p.id, p.name, p.category, p.barcode
        ORDER BY total_revenue DESC
      `;

      console.log('Product breakdown query:', productQuery);
      console.log('Query params:', queryParams);

      // Don't use array destructuring
      const products = await sequelize.query(productQuery, {
        replacements: queryParams,
        type: sequelize.QueryTypes.SELECT
      });

      // Query to get summary stats
      const summaryQuery = `
        SELECT
          COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
          COALESCE(SUM(oi.total), 0) as total_revenue,
          COALESCE(COUNT(DISTINCT oi.order_id), 0) as total_orders,
          COALESCE(SUM((oi.unit_price - COALESCE(p.cost_price, 0)) * oi.quantity), 0) as total_profit,
          COALESCE(COUNT(DISTINCT o.user_id), 0) as unique_cashiers
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN products p ON oi.product_id = p.id
        ${whereClause}
      `;

      console.log('Summary query:', summaryQuery);

      // Don't use array destructuring
      const summaryResults = await sequelize.query(summaryQuery, {
        replacements: queryParams,
        type: sequelize.QueryTypes.SELECT
      });

      console.log('Summary results:', summaryResults);
      console.log('Summary type:', Array.isArray(summaryResults) ? 'Array' : typeof summaryResults);

      // Handle both array and object results properly
      let summaryData;
      if (Array.isArray(summaryResults)) {
        summaryData = summaryResults[0] || {};
      } else {
        summaryData = summaryResults || {};
      }

      const totalRevenue = parseFloat(summaryData.total_revenue || 0);
      const totalProfit = parseFloat(summaryData.total_profit || 0);

      // Get cashier info if filtered
      let cashierInfo = null;
      if (cashierId) {
        const cashierQuery = `
          SELECT id, name, role, email, phone 
          FROM users 
          WHERE id = ?
        `;
        // Don't use array destructuring
        const cashiers = await sequelize.query(cashierQuery, {
          replacements: [cashierId],
          type: sequelize.QueryTypes.SELECT
        });
        if (cashiers.length > 0) {
          cashierInfo = cashiers[0];
        }
      }

      return {
        products: (products || []).map(p => ({
          product_id: p.product_id,
          product_name: p.product_name,
          product_category: p.product_category,
          product_barcode: p.product_barcode,
          total_quantity: parseInt(p.total_quantity || 0),
          total_revenue: parseFloat(p.total_revenue || 0),
          avg_price: parseFloat(p.avg_price || 0),
          total_profit: parseFloat(p.total_profit || 0)
        })),
        summary: {
          totalQuantitySold: parseInt(summaryData.total_quantity_sold || 0),
          totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
          totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
          totalCost: totalRevenue - totalProfit,
          totalOrders: parseInt(summaryData.total_orders || 0),
          uniqueCashiers: parseInt(summaryData.unique_cashiers || 0)
        },
        period: {
          startDate,
          endDate,
          isSingleDay: startDate === endDate
        },
        cashier: cashierInfo,
        filter: category ? { category } : productName ? { productName } : { all: 'all' }
      };
    } catch (error) {
      console.error('Detailed report calculation error:', error);
      throw new Error(`Detailed report calculation failed: ${error.message}`);
    }
  }

  /**
   * Get available categories for filtering
   */
  async getCategories() {
    try {
      const categories = await Product.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
        ],
        where: {
          category: {
            [Op.not]: null,
            [Op.ne]: ''
          }
        },
        raw: true
      });

      return categories.map(item => item.category).filter(Boolean);
    } catch (error) {
      console.error('Categories fetch error:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  /**
   * Get popular products for suggestions
   */
  async getProductSuggestions(searchTerm) {
    try {
      const products = await Product.findAll({
        attributes: ['id', 'name', 'category', 'barcode'],
        where: {
          name: {
            [Op.like]: `%${searchTerm}%`
          }
        },
        limit: 50, // Increased from 10 to show more products
        raw: true
      });

      return products;
    } catch (error) {
      console.error('Product suggestions error:', error);
      throw new Error(`Failed to fetch product suggestions: ${error.message}`);
    }
  }

  /**
   * Get all products and categories for filter modal
   */
  async getAllProductsAndCategories() {
    try {
      // Get all products
      const products = await Product.findAll({
        attributes: ['id', 'name', 'category', 'barcode'],
        where: {
          deleted_at: null // Only non-deleted products
        },
        order: [['name', 'ASC']],
        raw: true
      });

      // Get all categories
      const categories = await Product.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
        ],
        where: {
          category: {
            [Op.not]: null,
            [Op.ne]: ''
          },
          deleted_at: null
        },
        raw: true
      });

      const categoryList = categories.map(item => item.category).filter(Boolean);

      return {
        products,
        categories: categoryList
      };
    } catch (error) {
      console.error('Get all products and categories error:', error);
      throw new Error(`Failed to fetch products and categories: ${error.message}`);
    }
  }
}

module.exports = new StatsService();