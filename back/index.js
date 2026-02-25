// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./container/Models');
const errorHandler = require('./container/middlewares/error.middleware');
const { initializeDatabase } = require('./container/database/init');
const { initializeDefaultTemplate } = require('./container/Controllers/template.controller');

const authRoutes = require('./container/Routes/auth.routes');
const usersRoutes = require('./container/Routes/users.routes');
const productsRoutes = require('./container/Routes/products.routes');
const ordersRoutes = require('./container/Routes/orders.routes');
const reportsRoutes = require('./container/Routes/reports.routes');
const auditRoutes = require('./container/Routes/audit.routes');
const templateRoutes = require('./container/Routes/template.routes');
const statsRoutes = require('./container/Routes/stats.routes');
const printRoutes = require("./container/Routes/printRoutes");
const factureRoutes = require('./container/Routes/facture.routes');
const dbRoutes = require("./container/Routes/db.routes");
const changeRoutes = require("./container/Routes/change.routes");
const deviceRoutes = require("./container/Routes/deviceCheck");


const app = express();
const allowedOrigins = [
  'https://superettejemai.vercel.app',
  'http://localhost:3000'
];


app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options('*', cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/stats', statsRoutes);
app.use("/api", printRoutes);
app.use('/api/factures', factureRoutes);
app.use("/api", dbRoutes);
app.use("/api", changeRoutes);
app.use("/api/device", deviceRoutes);
app.get('/', (req, res) => res.json({ message: 'Offline POS Backend' }));

app.use(errorHandler);

const PORT =  4000;
(async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Then connect with Sequelize
    await sequelize.authenticate();
    console.log('DB connected');
    
    // Sync database models
    await sequelize.sync({ force: false });
    
    // Initialize default template
    await initializeDefaultTemplate();
    
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  } catch (err) {
    console.error('Unable to start server:', err);
  }
})();
