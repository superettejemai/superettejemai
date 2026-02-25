// container/Routes/db.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file upload - store directly in the database directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const targetDir = path.join(__dirname, '../database');
    
    // Create directory if it doesn't exist
    fs.mkdir(targetDir, { recursive: true }).then(() => {
      cb(null, targetDir);
    }).catch(err => {
      cb(err, targetDir);
    });
  },
  filename: function (req, file, cb) {
    // Always save as offline_pos.db - this will replace the existing file
    cb(null, 'offline_pos.db');
  }
});

const fileFilter = (req, file, cb) => {
  // Check if file is a .db file
  if (file.mimetype === 'application/octet-stream' || 
      file.mimetype === 'application/x-sqlite3' ||
      file.originalname.endsWith('.db')) {
    cb(null, true);
  } else {
    cb(new Error('Only database files (.db) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for safety
  }
});

// POST /api/change-db - Upload and replace the database file
router.post('/change-db', upload.single('database'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No database file uploaded' 
      });
    }

    const finalFilePath = req.file.path; // This is already in container/database/offline_pos.db

    console.log('Database file replaced successfully:', finalFilePath);

    res.json({
      success: true,
      message: 'Database replaced successfully',
      filePath: finalFilePath,
      fileName: 'offline_pos.db'
    });

  } catch (error) {
    console.error('Error replacing database:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error replacing database file',
      error: error.message
    });
  }
});





module.exports = router;