// Basic Express server for user sign-in data storage
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


// Connect to MongoDB (local instance)
const mongoURI = 'mongodb://localhost:27017/kisansetu';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  console.log('Server will continue without MongoDB. Data will not be persisted.');
});

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  console.log('Server continuing without database...');
});
db.once('open', () => console.log('Connected to MongoDB:', mongoURI));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: String,
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// Order schema for storing orders
const orderSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  items: Array,
  shipping: Object,
  payment: Object,
  total: Number,
  orderDate: { type: Date, default: Date.now },
  status: { type: String, default: 'confirmed' }
});
const Order = mongoose.model('Order', orderSchema);

// API endpoint to store sign-in data
app.post('/api/signin', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, returning mock response');
      // Return success for frontend testing
      return res.json({ 
        success: true, 
        user: { username, email },
        message: 'Demo mode - data not saved'
      });
    }
    
    const user = new User({ username, email });
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error('Sign-in error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create order endpoint (public for demo)
app.post('/api/orders', async (req, res) => {
  try {
    const obj = req.body;
    if (!obj || !obj.items) return res.status(400).json({ success: false, message: 'Invalid order' });

    if (mongoose.connection.readyState === 1) {
      const order = new Order(obj);
      await order.save();
      return res.json({ success: true, order });
    }

    // If DB not connected, echo back the order with a mock id
    const mock = Object.assign({ _id: String(Date.now()), orderDate: new Date() }, obj);
    return res.json({ success: true, order: mock, message: 'Demo mode - not persisted' });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Simple admin middleware: check x-admin-token header or query param
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || 'dev-secret-token';
  const token = req.header('x-admin-token') || req.query.adminToken || req.header('admin-token');
  if (token && token === expected) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized - admin token required' });
}

// Admin: list orders
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    console.log('[ADMIN] GET /api/admin/orders', {
      headers: req.headers,
      query: req.query
    });
    if (mongoose.connection.readyState === 1) {
      const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
      const q = req.query.q || '';
      const filter = q ? { $or: [ { userEmail: new RegExp(q, 'i') }, { userId: new RegExp(q, 'i') }, { status: new RegExp(q, 'i') } ] } : {};
      const orders = await Order.find(filter).sort({ orderDate: -1 }).limit(limit).exec();
      console.log('[ADMIN] Orders found:', orders.length);
      return res.json(orders);
    }
    // demo mode: return empty array
    console.log('[ADMIN] MongoDB not connected, returning empty array');
    return res.json([]);
  } catch (err) {
    console.error('[ADMIN] List orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: get single order
app.get('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const o = await Order.findById(req.params.id).exec();
      if (!o) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json(o);
    }
    return res.status(404).json({ success: false, message: 'Not found (demo mode)' });
  } catch (err) {
    console.error('Get order error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/', (req, res) => res.send('Kisan Setu backend running'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
