const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ✅ CORS config
app.use(cors({
  origin: 'https://we-search.ch',
  credentials: true
}));
app.options('*', cors());

const SECRET = 'rudi-bookkeeping-secret'; // replace with env var for production

app.use(cors());
app.use(express.json());


mongoose.connect('mongodb+srv://ruzhdicuci:9BgBDMYEJBjMGFid@bookkeeping.bcakntz.mongodb.net/bookkeeping?retryWrites=true&w=majority&appName=bookkeeping', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define MongoDB Schemas
const Balance = mongoose.model('Balance', new mongoose.Schema({
  userId: String,
  balances: Object
}));

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  password: String
}));

const Entry = mongoose.model('Entry', new mongoose.Schema({
  userId: String,
  description: String,
  amount: Number,
  type: String,
  date: String,
  person: String,
  bank: String,
   category: String,
  currency: String
}));

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Routes
app.post('/api/register', async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed });
  res.json({ message: 'Registered' });
});

app.post('/api/login', async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, SECRET);
  res.json({ token });
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'email');
  res.json(users.map(u => u.email));
});

app.delete('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  if (email === 'default') return res.status(403).json({ message: 'Cannot delete default user' });
  await User.deleteOne({ email });
  res.json({ message: 'User deleted' });
});

app.put('/api/users/:email/password', async (req, res) => {
  const { email } = req.params;
  const { password } = req.body;

  if (!password || password.length < 3) {
    return res.status(400).json({ message: 'Password too short' });
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.updateOne({ email }, { password: hashed });

  res.json({ message: 'Password updated' });
});

app.get('/api/entries', auth, async (req, res) => {
  const entries = await Entry.find({ userId: req.userId });
  res.json(entries);
});

app.post('/api/entries', auth, async (req, res) => {
  const entry = await Entry.create({ ...req.body, userId: req.userId });
  res.json(entry);
});

app.put('/api/entries/:id', auth, async (req, res) => {
  const updated = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
});

app.delete('/api/entries/:id', auth, async (req, res) => {
  await Entry.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

app.delete('/api/entries/delete-all', auth, async (req, res) => {
  await Entry.deleteMany({ userId: req.userId });
  res.json({ success: true });
});

// Balances per user
app.post('/api/balances', auth, async (req, res) => {
  await Balance.findOneAndUpdate(
    { userId: req.userId },
    { balances: req.body },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/api/balances', auth, async (req, res) => {
  const doc = await Balance.findOne({ userId: req.userId });
  res.json(doc?.balances || {});
});

app.listen(3210, () => {
  console.log('✅ API running on https://bookkeeping-i8e0.onrender.com');
});


app.post('/api/balances', auth, async (req, res) => {
  await Balance.findOneAndUpdate(
    { userId: req.userId },
    { balances: req.body },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/api/balances', auth, async (req, res) => {
  const doc = await Balance.findOne({ userId: req.userId });
  res.json(doc?.balances || {});
});


const Limit = mongoose.model('Limit', new mongoose.Schema({
  userId: String,
  limits: {
    ubs: Number,
    corner: Number,
    pfm: Number,
    cembra: Number
  },
  locked: Boolean
}));




// GET limits + lock state
app.get('/api/limits', auth, async (req, res) => {
  const doc = await Limit.findOne({ userId: req.userId });

  const defaultLimits = {
    ubs: 3000,
    corner: 9900,
    pfm: 1000,
    cembra: 10000  // ✅ Default value if missing
  };

  if (doc) {
    // Safely merge with defaults to ensure missing fields like cembra are included
    const safeLimits = { ...defaultLimits, ...doc.limits };
    res.json({ ...safeLimits, locked: doc.locked });
  } else {
    res.json({ ...defaultLimits, locked: true });
  }
});

app.post('/api/limits', auth, async (req, res) => {
  const { ubs, corner, pfm, cembra, locked } = req.body;
  await Limit.findOneAndUpdate(
    { userId: req.userId },
    { limits: { ubs, corner, pfm, cembra }, locked },
    { upsert: true }
  );
  res.json({ success: true });
});