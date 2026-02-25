const { User } = require('../Models');
const { comparePassword } = require('../utils/password');
const { sign } = require('../utils/jwt');
const { logAudit } = require('../utils/audit.utils');

async function login(req, res) {
  const { email, password } = req.body;
  
  try {
    // Check if both email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'email' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'الحساب غير نشط' });
    }

    // Verify password
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'passw' });
    }

    // Generate token
    const token = sign({ 
      id: user.id, 
      role: user.role, 
      name: user.name,
      email: user.email 
    });

    // Log the login action
    await logAudit({
      actor_id: user.id,
      actor_role: user.role,
      action: 'LOGIN',
      details: `User ${user.name} logged in`,
    });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        email: user.email
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'خطأ في تسجيل الدخول', error: err.message });
  }
}

async function logout(req, res) {
  try {
    const userId = req.user?.id;
    await logAudit({
      actor_id: userId || null,
      actor_role: req.user?.role || "guest",
      action: "logout",
      details: "User logged out",
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Logout failed" });
  }
}

async function getWorkers(req, res) {
  try {
    console.log('🔍 [getWorkers] Starting to fetch workers...');
    
    const workers = await User.findAll({ 
      where: { 
        role: 'worker',
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'role', 'is_active'],
      order: [['name', 'ASC']]
    });
    
    console.log(`✅ [getWorkers] Found ${workers.length} active workers`);
    
    workers.forEach(worker => {
      console.log(`   👤 ${worker.name} (ID: ${worker.id}, Email: ${worker.email})`);
    });
    
    res.json(workers);
  } catch (err) {
    console.error('❌ [getWorkers] Error:', err);
    res.status(500).json({ 
      message: 'Error fetching workers', 
      error: err.message 
    });
  }
}

module.exports = { login, logout, getWorkers };