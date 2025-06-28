const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set. Please check environment variables.');
  process.exit(1);
}


// ✅ MongoDB Connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 45000
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB initial connection error:', err);
});

const app = express(); // ✅ Define app AFTER all setup
// ✅ Updated CORS setup
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json());

// Optional: second logger
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.url}`);
  next();
});



// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Route to mobile version
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/mobile/mobile.html'));
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

const SECRET = 'rudi-bookkeeping-secret'; // replace with env var for production

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
  console.log("🛠️ Received update:", req.body); // 👈 see what's coming in
  const updated = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
});

app.delete('/api/entries/delete-all', auth, async (req, res) => {
  console.log("🧹 Reached DELETE-ALL route");
  console.log(`🔴 DELETE all entries for user: ${req.userId}`);

  await Entry.deleteMany({ userId: req.userId });
  res.json({ success: true });
});



app.delete('/api/entries/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid entry ID' });
  }

  await Entry.deleteOne({ _id: id, userId: req.userId });
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
    cembra: 10000
  };

  if (doc) {
    const safeLimits = { ...defaultLimits, ...doc.limits };
    res.json({ ...safeLimits, locked: doc.locked });
  } else {
    res.json({ ...defaultLimits, locked: true });
  }
});

// POST (save) limits
app.post('/api/limits', auth, async (req, res) => {
  const { ubs, corner, pfm, cembra, locked } = req.body;
  await Limit.findOneAndUpdate(
    { userId: req.userId },
    { limits: { ubs, corner, pfm, cembra }, locked },
    { upsert: true }
  );
  res.json({ success: true });
});




// add notes
const Note = mongoose.model('Note', new mongoose.Schema({
  _id: String, // ✅ Accept Dexie-generated UUIDs
  userId: String,
  title: String,
  content: String,
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  synced: Boolean,
  lastUpdated: Number
}));

// Get all notes for the current user
app.get('/api/notes', auth, async (req, res) => {
  const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(notes);
});

// Create a new note
app.post('/api/notes', auth, async (req, res) => {
  const { _id, title, content, done, createdAt, synced, lastUpdated } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Missing title or content' });
  }

  try {
    const note = await Note.create({
      _id, // ✅ Let Dexie-generated ID be saved
      userId: req.userId,
      title,
      content,
      done: done ?? false,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      synced: synced ?? false,
      lastUpdated: lastUpdated ?? Date.now()
    });

    res.json(note);
  } catch (err) {
    console.error('❌ Failed to create note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note (e.g., mark as done or edit title/content)
app.put('/api/notes/:id', auth, async (req, res) => {
  const updated = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { new: true }
  );
  res.json(updated);
});

// Delete a note
app.delete('/api/notes/:id', auth, async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  try {
    await Note.deleteOne({ _id: id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to delete note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});