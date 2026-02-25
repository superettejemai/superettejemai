const { Product, ProductImage } = require('../Models');
const { logAudit } = require('../utils/audit.utils'); 
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// List Products - Only show non-deleted products
// List Products - Only show non-deleted products
// In your products.controller.js
async function listProducts(req, res) {
  try {
    const q = req.query.q || '';
    const barcode = req.query.barcode || '';
    
    let where = {};
    
    // If specific barcode query parameter is provided
    if (barcode) {
      where.barcode = barcode;
    } 
    // If general search query is provided
    else if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { barcode: { [Op.like]: `%${q}%` } },
        { category: { [Op.like]: `%${q}%` } } // ADD THIS LINE
      ];
    }

    console.log('Search query:', { q, barcode, where });

    const products = await Product.findAll({ 
      where,
      include: [ProductImage],
      paranoid: true
    });
    
    console.log('Found products:', products.length);
    
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
async function getProduct(req, res) {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        deleted_at: null // Only return if not deleted
      },
      include: [ProductImage]
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Create Product (with Image)
async function createProduct(req, res) {
  try {
    const { name, price, stock, barcode, description, sku, cost_price, category } = req.body;

    // Validate required fields
    if (!name || !price) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
        });
      }
      return res.status(400).json({ message: 'Product name and price are required' });
    }

    // First create the product
    const product = await Product.create({ 
      name, 
      price: parseFloat(price), 
      stock: parseInt(stock) || 0, 
      barcode, 
      description, 
      sku,
      cost_price: cost_price ? parseFloat(cost_price) : parseFloat(price),
      category 
    });

    // Then handle image upload if present
    if (req.file) {
      const imageUrl = `/uploads/products/${req.file.filename}`;
      
      // Save the image to the ProductImage table
      await ProductImage.create({
        product_id: product.id,
        url: imageUrl,
        is_primary: true,
      });

      console.log('Image saved:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }

    // Log the creation action
    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'CREATE_PRODUCT',
      details: `Created product ${product.name}`,
    });

    res.status(201).json({ 
      product,
      image: req.file ? {
        url: `/uploads/products/${req.file.filename}`,
        filename: req.file.filename
      } : null
    });

  } catch (err) {
    console.error('Error creating product:', err);
    
    // Clean up uploaded file if product creation failed
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
      });
    }
    
    res.status(500).json({ message: err.message });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    
    // Find product with images (only non-deleted products)
    const product = await Product.findOne({
      where: {
        id: id,
        deleted_at: null // Only allow updates on non-deleted products
      },
      include: ['ProductImages']
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Parse numeric fields
    const updateData = { ...req.body };
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.cost_price) updateData.cost_price = parseFloat(updateData.cost_price);

    // Handle empty SKU - don't update if empty to avoid unique constraint violation
    if (updateData.sku === '') {
      delete updateData.sku; // Remove SKU from update data if empty
    }

    // Handle image upload if file exists
    if (req.file) {
      console.log('New image uploaded:', req.file.filename);
      
      // Create the image URL - adjust this based on your server configuration
      const imageUrl = `/uploads/products/${req.file.filename}`;
      
      // Check if product already has images
      if (product.ProductImages && product.ProductImages.length > 0) {
        // Update the first image (or you might want to handle multiple images)
        await product.ProductImages[0].update({
          url: imageUrl,
          filename: req.file.filename
        });
      } else {
        // Create new image record
        await ProductImage.create({
          product_id: product.id,
          url: imageUrl,
          filename: req.file.filename,
          is_primary: true
        });
      }
    }

    // Update product data (only if there's data to update)
    if (Object.keys(updateData).length > 0) {
      await product.update(updateData);
    }

    // Reload product with updated images
    const updatedProduct = await Product.findByPk(product.id, {
      include: ['ProductImages']
    });

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'UPDATE_PRODUCT',
      details: `Updated product ${product.name}`,
    });

    res.json({ 
      success: true,
      product: updatedProduct 
    });
    
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: err.message });
  }
}

// Soft Delete Product
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Method 1: Using Sequelize's destroy for soft delete
    await product.destroy(); // This will set deleted_at automatically

    // Method 2: Manual approach (if above doesn't work)
    // await product.update({ 
    //   deleted_at: new Date() 
    // });

    await logAudit({
      actor_id: req.user.id,
      actor_role: req.user.role,
      action: 'DELETE_PRODUCT',
      details: `Soft deleted product ${product.name}`,
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };