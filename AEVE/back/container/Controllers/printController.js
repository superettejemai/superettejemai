const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { print } = require("pdf-to-printer");
const { SerialPort } = require("serialport");
const { Template } = require('../Models');
const { sequelize, Order, OrderItem, Product, User } = require('../Models');

// === Helper function to check if file exists ===
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// === Helper function to format currency ===
function formatCurrency(amount) {
  return `${parseFloat(amount).toFixed(3)} DT`;
}

// === Drawer Function ===
async function tryPort(portName) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portName,
      baudRate: 9600,
      autoOpen: false,
    });
    port.open((err) => {
      if (err) return reject(err);
      // Command: ESC p m t1 t2  → open cash drawer pulse
      const command = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
      port.write(command, (err) => {
        port.close();
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

async function openDrawer() {
  console.log("🔍 Searching for cash drawer port...");
  for (let i = 1; i <= 20; i++) {
    const portName = `COM${i}`;
    try {
      await tryPort(portName);
      console.log(`✅ Drawer opened on ${portName}!`);
      return true;
    } catch {
      console.log(`❌ Not on ${portName}`);
    }
  }
  console.log("⚠️ No working cash drawer port found.");
  return false;
}

// === Get Current Template - FIXED VERSION ===
async function getCurrentTemplate() {
  try {
    console.log('🔍 Fetching current template from database...');
    // First try to get current template
    let template = await Template.findOne({ where: { is_current: true } });
    // If no current template, get default template
    if (!template) {
      console.log('🔍 No current template, looking for default...');
      template = await Template.findOne({ where: { is_default: true } });
    }
    // If still no template, create a default one
    if (!template) {
      console.log('⚠️ No template found, creating default...');
      template = await Template.create({
        business_name: 'Taher Store',
        address: 'Kef Ouest',
        phone: '+216 28-888-XXX',
        email: '',
        website: '',
        tax_number: '',
        thank_you_message: 'Merci pour votre achat !',
        return_policy: 'Retours acceptés dans un délai d\'un jour avec le reçu original.',
        is_default: true,
        is_current: true
      });
    }
    console.log('✅ Using template:', template.business_name);
    console.log('🖼️ Logo path:', template.logo_path);
    return template;
  } catch (error) {
    console.error('❌ Error getting template from database:', error);
    // Return fallback template
    return {
      business_name: 'Taher Store',
      address: 'Kef Ouest',
      phone: '+216 28-888-XXX',
      email: '',
      website: '',
      tax_number: '',
      thank_you_message: 'Merci pour votre achat !',
      return_policy: 'Retours acceptés dans un délai d\'un jour avec le reçu original.'
    };
  }
}

// === EXISTING: Receipt Printing Function - UPDATED WITH LOGO SUPPORT & NO TAX ===
exports.printReceipt = async (req, res) => {
  const outputPath = path.join(process.cwd(), `receipt_${Date.now()}.pdf`);
  try {
    const { order, cartItems } = req.body;
    console.log('🖨️ Starting print process...');
    console.log('📦 Order items:', cartItems?.length || 0);
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('No cart items provided for printing');
    }
    // Get template data from database
    const template = await getCurrentTemplate();
    if (!template) {
      throw new Error('No template found in database');
    }
    console.log('📝 Using template for printing:', template.business_name);
    console.log('🖼️ Logo available:', !!template.logo_path);
    // Calculate dynamic height based on content
    const baseHeight = 240; // Increased base height to accommodate logo
    const itemHeight = cartItems.length * 16; // Increased height per item for better spacing
    const receiptHeight = Math.max(380, baseHeight + itemHeight); // Ensure proper height for content
    // PERFECT 80mm PAPER SETTINGS
    const PAPER_WIDTH = 227;
    const LEFT_MARGIN = 15;
    const RIGHT_MARGIN = PAPER_WIDTH - LEFT_MARGIN;
    // Create PDF
    const doc = new PDFDocument({
      size: [PAPER_WIDTH, receiptHeight],
      margins: { top: 10, bottom: 25, left: LEFT_MARGIN, right: LEFT_MARGIN },
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    let y = 10; // Start a bit lower to accommodate logo
    // === LOGO SECTION ===
    if (template.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../', template.logo_path);
        console.log('🖼️ Looking for logo at:', logoPath);
        if (fileExists(logoPath)) {
          console.log('✅ Logo file found, adding to receipt...');
          // Add logo at the top - centered
          const logoWidth = 70; // Fixed width for logo
          const logoHeight = 70; // Fixed height for logo
          const logoX = (PAPER_WIDTH - logoWidth) / 2; // Center the logo
          doc.image(logoPath, logoX, y, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
            align: 'center'
          });
          y += logoHeight + 10; // Space after logo
          console.log('✅ Logo added successfully');
        } else {
          console.log('⚠️ Logo file not found at:', logoPath);
        }
      } catch (logoError) {
        console.error('❌ Error adding logo:', logoError.message);
      }
    }
    // --- HEADER ---
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(template.business_name, 0, y, { align: "center", width: PAPER_WIDTH });
    y += 16;
    // Address and contact details
    if (template.address) {
      doc.fontSize(9)
        .font('Helvetica')
        .text(template.address, 0, y, { align: "center", width: PAPER_WIDTH });
      y += 10;
    }
    const contactLines = [];
    if (template.phone) contactLines.push(template.phone);
    if (template.email) contactLines.push(template.email);
    if (template.website) contactLines.push(template.website);
    if (template.tax_number) contactLines.push(template.tax_number);
    contactLines.forEach(line => {
      doc.fontSize(8)
        .font('Helvetica')
        .text(line, 0, y, { align: "center", width: PAPER_WIDTH });
      y += 8;
    });
    y += 10;
    // Divider Line
    doc.lineWidth(0.5);
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;
    // --- DATE & TIME ---
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR');
    const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Date:', LEFT_MARGIN, y);
    doc.fontSize(8)
      .font('Helvetica')
      .text(formattedDate, LEFT_MARGIN + 35, y);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Heure:', LEFT_MARGIN + 100, y);
    doc.fontSize(8)
      .font('Helvetica')
      .text(formattedTime, LEFT_MARGIN + 140, y);
    y += 12;
    // Divider Line
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;
    // --- ITEMS ---
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('ARTICLES', LEFT_MARGIN, y);
    y += 12;
    // --- ITEM LIST ---
    cartItems.forEach((item) => {
      const total = (item.price * item.quantity).toFixed(3);
      const itemText = `${item.name} (${item.quantity}x)`;
      doc.fontSize(9)
        .font('Helvetica')
        .text(itemText, LEFT_MARGIN, y, { width: 120, align: 'left' });
      doc.fontSize(9)
        .font('Helvetica')
        .text(`${total} TND`, 145, y, { width: 45, align: "right" });
      y += 14; // Increased height per item for better spacing
    });
    y += 10;
    // Divider Line
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;
    // --- TOTALS ---
    const subtotal = cartItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const total = subtotal; // No tax, total equals subtotal
    const paid = order?.paid_amount || total;
    const change = (paid - total).toFixed(3);
    // Total Section
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text('TOTAL :', LEFT_MARGIN, y);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(`${total.toFixed(3)} TND`, 145, y, { width: 45, align: "right" });
    y += 16;
    // Payment Info
    doc.fontSize(9)
      .font('Helvetica')
      .text(`Montant reçu : ${paid.toFixed(3)} TND`, LEFT_MARGIN, y);
    y += 10;
    doc.fontSize(9)
      .font('Helvetica-Bold')
      .text(`Monnaie rendue : ${change} TND`, LEFT_MARGIN, y);
    y += 16;
    // --- FOOTER ---
    y += 20;
    // Thank you message
    if (template.thank_you_message) {
      doc.fontSize(8)
        .font('Helvetica')
        .text(template.thank_you_message, 0, y, { align: "center", width: PAPER_WIDTH - (LEFT_MARGIN * 2) });
      y += 14;
    }
    // Return policy
    if (template.return_policy) {
      y += 4;
      doc.fontSize(8)
        .font('Helvetica')
        .text(template.return_policy, LEFT_MARGIN, y, { align: "center", width: PAPER_WIDTH - (LEFT_MARGIN * 2) });
    }

     y += 8;
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;

     doc.fontSize(8)
      .font('Helvetica-Oblique')
      .text(`AEVE Software - Powered by Afek Plus`, 0, y, { 
        align: "center", 
        width: PAPER_WIDTH 
      });
    
    doc.end();
    // Wait for PDF to finish writing
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
    console.log("🖨️ Printing receipt...");
    // Print the PDF
    await print(outputPath, {
      printer: undefined,
      paperSize: "80mm",
      copies: 1,
    });
    console.log("✅ Ticket imprimé avec succès !");
    // Open drawer after successful print
    await openDrawer();
    res.json({ success: true, message: "Receipt printed successfully" });
  } catch (err) {
    console.error("❌ Print error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Failed to print receipt"
    });
  } finally {
    // Clean up file
    setTimeout(() => {
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log("🧹 Temporary file cleaned up");
        }
      } catch (cleanupErr) {
        console.log("⚠️ Cleanup warning:", cleanupErr.message);
      }
    }, 1000);
  }
};

// === NEW: Print Summary Sales Report ===
exports.printSalesReport = async (req, res) => {
  const outputPath = path.join(process.cwd(), `sales_report_${Date.now()}.pdf`);
  try {
    const { reportData } = req.body;
    console.log('🖨️ Starting sales report print process...');
    console.log('📊 Report period:', reportData.period);
    console.log('📦 Products count:', reportData.products?.length || 0);

    if (!reportData || !reportData.products) {
      throw new Error('No report data provided for printing');
    }

    // Get template data from database
    const template = await getCurrentTemplate();
    console.log('📝 Using template for report:', template.business_name);

    // Calculate dynamic height based on content
    const baseHeight = 300;
    const itemHeight = reportData.products.length * 18;
    const receiptHeight = Math.max(500, baseHeight + itemHeight);

    // 80mm PAPER SETTINGS
    const PAPER_WIDTH = 227;
    const LEFT_MARGIN = 15;
    const RIGHT_MARGIN = PAPER_WIDTH - LEFT_MARGIN;

    // Create PDF
    const doc = new PDFDocument({
      size: [PAPER_WIDTH, receiptHeight],
      margins: { top: 10, bottom: 25, left: LEFT_MARGIN, right: LEFT_MARGIN },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    let y = 10;

    // === LOGO SECTION ===
    if (template.logo_path) {
      try {
        const logoPath = path.join(__dirname, '../../', template.logo_path);
        if (fileExists(logoPath)) {
          const logoWidth = 70;
          const logoHeight = 70;
          const logoX = (PAPER_WIDTH - logoWidth) / 2;
          doc.image(logoPath, logoX, y, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
            align: 'center'
          });
          y += logoHeight + 10;
        }
      } catch (logoError) {
        console.error('Error adding logo:', logoError.message);
      }
    }

    // --- HEADER ---
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text('RAPPORT DE VENTES', 0, y, { align: "center", width: PAPER_WIDTH });
    y += 18;

    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(template.business_name, 0, y, { align: "center", width: PAPER_WIDTH });
    y += 16;

    // Address and contact details
    if (template.address) {
      doc.fontSize(9)
        .font('Helvetica')
        .text(template.address, 0, y, { align: "center", width: PAPER_WIDTH });
      y += 10;
    }

    const contactLines = [];
    if (template.phone) contactLines.push(`Tél: ${template.phone}`);
    if (template.email) contactLines.push(`Email: ${template.email}`);
    contactLines.forEach(line => {
      doc.fontSize(8)
        .font('Helvetica')
        .text(line, 0, y, { align: "center", width: PAPER_WIDTH });
      y += 8;
    });

    y += 10;

    // Divider Line
    doc.lineWidth(0.5);
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;

    // --- PERIOD INFO ---
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('PÉRIODE DU RAPPORT', LEFT_MARGIN, y);
    y += 10;

    const startDate = new Date(reportData.period.startDate).toLocaleDateString('fr-FR');
    const endDate = new Date(reportData.period.endDate).toLocaleDateString('fr-FR');
    const periodText = reportData.period.isSingleDay 
      ? `Date: ${startDate}`
      : `Du: ${startDate}\nAu: ${endDate}`;

    doc.fontSize(9)
      .font('Helvetica')
      .text(periodText, LEFT_MARGIN, y);
    y += 20;

    // --- CASHIER INFO (if filtered) ---
    if (reportData.cashier) {
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('CAISSIER', LEFT_MARGIN, y);
      y += 10;

      doc.fontSize(9)
        .font('Helvetica')
        .text(`Nom: ${reportData.cashier.name}`, LEFT_MARGIN, y);
      y += 10;

      if (reportData.cashier.phone) {
        doc.fontSize(9)
          .font('Helvetica')
          .text(`Téléphone: ${reportData.cashier.phone}`, LEFT_MARGIN, y);
        y += 10;
      }

      y += 5;
      doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
      y += 12;
    }

    // --- SUMMARY SECTION ---
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('RÉSUMÉ DES VENTES', LEFT_MARGIN, y);
    y += 12;

    const summaryItems = [
      { label: 'Total Commandes:', value: `${reportData.summary.totalOrders}` },
      { label: 'Produits Vendus:', value: `${reportData.summary.totalQuantitySold}` },
      { label: 'Chiffre d\'Affaires:', value: formatCurrency(reportData.summary.totalRevenue) },
      { label: 'Coût Total:', value: formatCurrency(reportData.summary.totalCost) },
      { label: 'Bénéfice Net:', value: formatCurrency(reportData.summary.totalProfit) }
    ];

    summaryItems.forEach(item => {
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .text(item.label, LEFT_MARGIN, y);
      doc.fontSize(9)
        .font('Helvetica')
        .text(item.value, 145, y, { width: 45, align: "right" });
      y += 12;
    });

    y += 8;
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;

    // --- PRODUCTS BREAKDOWN ---
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .text('DÉTAIL DES PRODUITS', LEFT_MARGIN, y);
    y += 12;

    // Table header
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Produit', LEFT_MARGIN, y);
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Qté', 130, y, { width: 30, align: "left" });
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text('Total', 165, y, { width: 45, align: "left" });
    y += 10;

    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 8;

    // Products list
    reportData.products.forEach((product) => {
      const productName = product.product_name.length > 25 
        ? product.product_name.substring(0, 25) + '...'
        : product.product_name;

      doc.fontSize(8)
        .font('Helvetica')
        .text(productName, LEFT_MARGIN, y, { width: 115, align: 'left' });

      doc.fontSize(8)
        .font('Helvetica')
        .text(`${product.total_quantity}`, 130, y, { width: 30, align: "left" });

      doc.fontSize(8)
        .font('Helvetica-Bold')
        .text(formatCurrency(product.total_revenue), 165, y, { width: 45, align: "left" });

      y += 16;
    });

    y += 8;
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;

    // --- FOOTER ---
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR');
    const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    doc.fontSize(8)
      .font('Helvetica-Oblique')
      .text(`Rapport généré le ${formattedDate} à ${formattedTime}`, 0, y, { 
        align: "center", 
        width: PAPER_WIDTH 
      });
    y += 12;

    if (template.thank_you_message) {
      y += 8;
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .text(template.thank_you_message, 0, y, { align: "center", width: PAPER_WIDTH });
    }
 y += 12;

  y += 8;
    doc.moveTo(LEFT_MARGIN, y).lineTo(RIGHT_MARGIN, y).stroke();
    y += 12;

     doc.fontSize(8)
      .font('Helvetica-Oblique')
      .text(`AEVE Software - Powered by Afek Plus`, 0, y, { 
        align: "center", 
        width: PAPER_WIDTH 
      });
   

    doc.end();

    // Wait for PDF to finish writing
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log("🖨️ Printing sales report...");
    await print(outputPath, {
      printer: undefined,
      paperSize: "80mm",
      copies: 1,
    });

    console.log("✅ Rapport de ventes imprimé avec succès !");
    await openDrawer();

    res.json({ 
      success: true, 
      message: "Sales report printed successfully" 
    });
  } catch (err) {
    console.error("❌ Print error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Failed to print sales report"
    });
  } finally {
    // Clean up file
    setTimeout(() => {
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log("🧹 Temporary file cleaned up");
        }
      } catch (cleanupErr) {
        console.log("⚠️ Cleanup warning:", cleanupErr.message);
      }
    }, 1000);
  }
};