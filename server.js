// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcrypt');

dotenv.config();
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connectToMongo() {
  try {
    await client.connect();
    db = client.db('stings');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectToMongo();

// Register User
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(username)) {
      return res.status(400).json({ error: 'Username must start with a letter and contain only letters, numbers, or underscores' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({ username, password: hashedPassword });

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sessionToken = Math.random().toString(36).substr(2) + Date.now().toString(36);
    await usersCollection.updateOne(
      { username },
      { $set: { sessionToken, sessionTimestamp: new Date().getTime() } }
    );

    res.status(200).json({ message: 'Login successful', username, sessionToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout User
app.post('/api/logout', async (req, res) => {
  try {
    const { username } = req.body;
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { username },
      { $unset: { sessionToken: '', sessionTimestamp: '' } }
    );
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Submit Access Code
app.post('/api/submit-code', async (req, res) => {
  try {
    const { username, code, subscriptionMonths } = req.body;
    const usersCollection = db.collection('users');
    const now = new Date().getTime();
    const monthsInMs = subscriptionMonths * 30 * 24 * 60 * 60 * 1000;

    const firstLetter = username.charAt(0).toUpperCase();
    const usernameCodes = {
      // Your existing usernameCodes object (omitted for brevity, copy from scripts.txt)
      A: {
    threeMonths: { initial: "222978", renewal: "000000" },
    sevenMonths: { initial: "111000", renewal: "300000" },
  },
  B: {
    threeMonths: { initial: "222496", renewal: "111111" },
    sevenMonths: { initial: "111001", renewal: "310000" },
  },
  C: {
    threeMonths: { initial: "222110", renewal: "222222" },
    sevenMonths: { initial: "111002", renewal: "320000" },
  },
  D: {
    threeMonths: { initial: "222111", renewal: "333333" },
    sevenMonths: { initial: "111003", renewal: "330000" },
  },
  E: {
    threeMonths: { initial: "222112", renewal: "444444" },
    sevenMonths: { initial: "111004", renewal: "340000" },
  },
  F: {
    threeMonths: { initial: "222113", renewal: "555555" },
    sevenMonths: { initial: "111005", renewal: "350000" },
  },
  G: {
    threeMonths: { initial: "222114", renewal: "666666" },
    sevenMonths: { initial: "111006", renewal: "360000" },
  },
  H: {
    threeMonths: { initial: "222115", renewal: "777777" },
    sevenMonths: { initial: "111007", renewal: "370000" },
  },
  I: {
    threeMonths: { initial: "222116", renewal: "888888" },
    sevenMonths: { initial: "111008", renewal: "380000" },
  },
  J: {
    threeMonths: { initial: "222117", renewal: "999999" },
    sevenMonths: { initial: "111009", renewal: "390000" },
  },
  K: {
    threeMonths: { initial: "222118", renewal: "100000" },
    sevenMonths: { initial: "111010", renewal: "400000" },
  },
  L: {
    threeMonths: { initial: "222119", renewal: "110000" },
    sevenMonths: { initial: "111011", renewal: "410000" },
  },
  M: {
    threeMonths: { initial: "222120", renewal: "120000" },
    sevenMonths: { initial: "111012", renewal: "420000" },
  },
  N: {
    threeMonths: { initial: "222121", renewal: "130000" },
    sevenMonths: { initial: "111013", renewal: "430000" },
  },
  O: {
    threeMonths: { initial: "222122", renewal: "140000" },
    sevenMonths: { initial: "111014", renewal: "440000" },
  },
  P: {
    threeMonths: { initial: "222123", renewal: "150000" },
    sevenMonths: { initial: "111015", renewal: "450000" },
  },
  Q: {
    threeMonths: { initial: "222124", renewal: "160000" },
    sevenMonths: { initial: "111016", renewal: "460000" },
  },
  R: {
    threeMonths: { initial: "222125", renewal: "170000" },
    sevenMonths: { initial: "111017", renewal: "470000" },
  },
  S: {
    threeMonths: { initial: "222126", renewal: "180000" },
    sevenMonths: { initial: "111018", renewal: "480000" },
  },
  T: {
    threeMonths: { initial: "222127", renewal: "190000" },
    sevenMonths: { initial: "111019", renewal: "490000" },
  },
  U: {
    threeMonths: { initial: "222128", renewal: "200000" },
    sevenMonths: { initial: "111020", renewal: "500000" },
  },
  V: {
    threeMonths: { initial: "222129", renewal: "210000" },
    sevenMonths: { initial: "111021", renewal: "510000" },
  },
  W: {
    threeMonths: { initial: "222130", renewal: "220000" },
    sevenMonths: { initial: "111022", renewal: "520000" },
  },
  X: {
    threeMonths: { initial: "222131", renewal: "230000" },
    sevenMonths: { initial: "111023", renewal: "530000" },
  },
  Y: {
    threeMonths: { initial: "222132", renewal: "240000" },
    sevenMonths: { initial: "111024", renewal: "540000" },
  },
  Z: {
    threeMonths: { initial: "222133", renewal: "250000" },
    sevenMonths: { initial: "111025", renewal: "550000" },
  },
};


    if (!usernameCodes[firstLetter]) {
      return res.status(400).json({ error: 'Invalid username: First letter must be A-Z' });
    }

    const planKey = subscriptionMonths === 3 ? 'threeMonths' : 'sevenMonths';
    const user = await usersCollection.findOne({ username });
    const isExpired = !user.subscriptionEnd || user.subscriptionEnd <= now;
    const expectedCode = isExpired
      ? usernameCodes[firstLetter][planKey].initial
      : usernameCodes[firstLetter][planKey].renewal;

    if (code !== expectedCode) {
      return res.status(400).json({ error: `Invalid access code for ${subscriptionMonths}-month plan` });
    }

    await usersCollection.updateOne(
      { username },
      { $set: { subscriptionEnd: now + monthsInMs, subscriptionMonths } }
    );

    res.status(200).json({ message: `Subscription activated for ${subscriptionMonths} months`, subscriptionEnd: now + monthsInMs });
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({ error: 'Failed to process code' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});