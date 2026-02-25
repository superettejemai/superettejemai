const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authenticate = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { listProducts, createProduct, updateProduct, getProduct, deleteProduct } = require('../Controllers/products.controller');

// Configure multer for product image upload with proper file naming
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/products/'),
  filename: (req, file, cb) => {
    // Preserve original file extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + extension);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '../../uploads/products/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Only Admin can create products
router.post('/', authenticate, upload.single('productImage'), createProduct); 
router.get('/', authenticate, listProducts);
router.get('/:id', authenticate, getProduct);
router.put('/:id', authenticate, requireRole('admin'),upload.single('productImage'), updateProduct);
router.delete('/:id', authenticate, requireRole('admin'), deleteProduct);

module.exports = router;