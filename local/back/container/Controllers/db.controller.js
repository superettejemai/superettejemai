const { 
  User, Product, ProductImage, Order, OrderItem, Facture, FactureItem, Template, AuditLog 
} = require("../Models");

// Map of models for easy access
const modelsMap = { 
  users: User, 
  products: Product, 
  product_images: ProductImage, 
  orders: Order, 
  order_items: OrderItem, 
  factures: Facture, 
  facture_items: FactureItem, 
  templates: Template, 
  audit_logs: AuditLog 
};

// Define table relationships for automatic backup
const relationships = {
  users: ["orders", "factures"],
  products: ["product_images", "order_items", "facture_items"],
  orders: ["order_items"],
  factures: ["facture_items"],
  templates: [],
  audit_logs: [],
  product_images: [],
  order_items: [],
  facture_items: []
};

// ---------------- BACKUP ----------------
exports.backup = async (req, res) => {
  try {
    const { tables } = req.body;
    if (!tables || !tables.length) return res.status(400).json({ error: "Aucune table sélectionnée." });

    const backupData = {};
    const visited = new Set();

    // Recursively collect tables and dependencies
    const collectTables = (table) => {
      if (visited.has(table)) return;
      visited.add(table);

      // First add dependencies
      const deps = relationships[table] || [];
      deps.forEach(dep => collectTables(dep));
    };

    tables.forEach(t => collectTables(t));

    // Fetch data for all collected tables
    for (let table of visited) {
      if (!modelsMap[table]) continue;
      backupData[table] = await modelsMap[table].findAll({ raw: true });
    }

    res.json(backupData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde." });
  }
};

// ---------------- RESTORE ----------------
exports.restore = async (req, res) => {
  const { data } = req.body;

  try {
    if (!data || typeof data !== "object") 
      return res.status(400).json({ error: "Données invalides pour la restauration." });

    // Smart restore order: parents first, then children
    const restoreOrder = [
      "users",
      "products",
      "orders",
      "factures",
      "templates",
      "audit_logs",
      "product_images",
      "order_items",
      "facture_items"
    ];

    for (let table of restoreOrder) {
      if (!data[table] || !modelsMap[table]) continue;
      for (let row of data[table]) {
        await modelsMap[table].upsert(row); // preserves IDs
      }
    }

    res.json({ message: "Restauration terminée avec succès." });
  } catch (err) {
    console.error("Erreur restore:", err);
    res.status(500).json({ error: "Erreur lors de la restauration." });
  }
};

// ---------------- DELETE ----------------
exports.deleteTables = async (req, res) => {
  const { tables } = req.body;

  try {
    if (!tables || !tables.length) return res.status(400).json({ error: "Aucune table sélectionnée." });

    const allTablesToDelete = new Set();

    const collectDependencies = (table) => {
      if (allTablesToDelete.has(table)) return;
      allTablesToDelete.add(table);
      const deps = relationships[table] || [];
      deps.forEach(dep => collectDependencies(dep));
    };

    tables.forEach(t => collectDependencies(t));

    // Delete in reverse dependency order
    const deletionOrder = Array.from(allTablesToDelete).reverse();

    for (let table of deletionOrder) {
      if (!modelsMap[table]) continue;
      await modelsMap[table].destroy({ where: {}, truncate: true, force: true });
    }

    res.json({ message: "Suppression terminée avec succès." });
  } catch (err) {
    console.error("Erreur delete:", err);
    res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};
