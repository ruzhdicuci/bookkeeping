require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ✅ Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch {
    res.status(403).json({ message: 'Invalid token' });
  }
}

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set. Please check environment variables.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 45000
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB initial connection error:', err);
});

const app = express();
const allowedOrigins = [
  'https://we-search.ch',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/mobile/mobile.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

const SECRET = process.env.JWT_SECRET || 'fallback-secret';

// ✅ Mongoose models
const Balance = mongoose.model('Balance', new mongoose.Schema({
  userId: String,
  balances: Object
}));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
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
  currency: String,
  status: {
    type: String,
    enum: ['Open', 'Paid'],
    default: 'Paid'
  }
}));

const Note = mongoose.model('Note', new mongoose.Schema({
  _id: String,
  userId: String,
  title: String,
  content: String,
  done: Boolean,
  createdAt: Date,
  synced: Boolean,
  lastUpdated: Number
}));

const Limit = mongoose.model('Limit', new mongoose.Schema({
  userId: String,
  limits: Object,
  locked: Boolean
}));

const CustomCard = mongoose.model('CustomCard', new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  limit: { type: Number, required: true },
  synced: Boolean,
  lastUpdated: Number
}, { versionKey: false }));

// ✅ Auth routes
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

// ✅ User admin routes
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

// ✅ Entries CRUD
app.get('/api/entries', auth, async (req, res) => {
  const entries = await Entry.find({ userId: req.user.userId });
  res.json(entries);
});

app.post('/api/entries', auth, async (req, res) => {
  const entry = await Entry.create({ ...req.body, userId: req.user.userId });
  res.json(entry);
});

app.put('/api/entries/:id', auth, async (req, res) => {
  const updated = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
});

app.delete('/api/entries/delete-all', auth, async (req, res) => {
  await Entry.deleteMany({ userId: req.user.userId });
  res.json({ success: true });
});

app.delete('/api/entries/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid entry ID' });
  }
  await Entry.deleteOne({ _id: id, userId: req.user.userId });
  res.json({ success: true });
});

// ✅ Bank balances
app.post('/api/balances', auth, async (req, res) => {
  await Balance.findOneAndUpdate(
    { userId: req.user.userId },
    { balances: req.body },
    { upsert: true }
  );
  res.json({ success: true });
});

app.get('/api/balances', auth, async (req, res) => {
  const doc = await Balance.findOne({ userId: req.user.userId });
  res.json(doc?.balances || {});
});



// ✅ Notes
app.get('/api/notes', auth, async (req, res) => {
  const notes = await Note.find({ userId: req.user.userId }).sort({ createdAt: -1 });
  res.json(notes);
});

app.post('/api/notes', auth, async (req, res) => {
  const { _id, title, content, done, createdAt, synced, lastUpdated } = req.body;
  if (!_id || typeof _id !== 'string') return res.status(400).json({ message: 'Missing or invalid _id' });
  if (!title || !content) return res.status(400).json({ message: 'Missing title or content' });
  if (!req.user.userId) return res.status(401).json({ message: 'User ID missing or not authenticated' });

  try {
    const note = await Note.create({
      _id,
      userId: req.user.userId,
      title,
      content,
      done: done ?? false,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      synced: synced ?? false,
      lastUpdated: lastUpdated ?? Date.now()
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', auth, async (req, res) => {
  const updated = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid note ID format' });
  try {
    await Note.deleteOne({ _id: id, userId: req.user.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ✅ Custom Cards
app.get('/api/custom-limits', auth, async (req, res) => {
  const cards = await CustomCard.find({ userId: req.user.userId });
  res.json({ cards });
});

app.post('/api/custom-limits', auth, async (req, res) => {
  const cards = req.body.cards || [];
  try {
    // Delete old cards for this user
    await CustomCard.deleteMany({ userId: req.user.userId });

    // Sanitize: remove _id from incoming cards to prevent ObjectId errors
 const toInsert = cards.map(card => {
  const { _id, ...rest } = card;
  return {
    ...rest,
    userId: req.user.userId,
    lastUpdated: Date.now(),
    synced: true
  };
});

    await CustomCard.insertMany(toInsert);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to save custom cards:', err);
   res.status(500).json({ error: 'Failed to save custom cards', details: err.message });
  }
});

// ✅ Save locked state only (for dynamic cards)
app.post('/api/limits', auth, async (req, res) => {
  const userId = req.user.userId;
  const { locked } = req.body;

  if (typeof locked !== 'boolean') {
    return res.status(400).json({ error: 'locked must be boolean' });
  }

  try {
    // Upsert the locked state (no need to touch limits object anymore)
    await Limit.findOneAndUpdate(
      { userId },
      { locked },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save lock state:", err);
    res.status(500).json({ error: 'Failed to save lock state' });
  }
});


app.patch('/api/entries/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Whitelist of fields that are allowed to be updated
    const allowedFields = ['note', 'amount', 'category', 'person', 'bank', 'status', 'type', 'currency', 'description', 'date'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // ✅ Always update timestamp and sync flag
    updates.lastUpdated = Date.now();
    updates.synced = true;

    const updated = await Entry.findOneAndUpdate(
      { _id: id, userId: req.user.userId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error('❌ Failed to update entry:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// ✅ Global error fallback
app.use((err, req, res, next) => {
  console.error("❌ Unexpected server error:", err);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Start server
const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});