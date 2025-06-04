const express = require('express');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
    process.exit(1);
  }
}

connectToMongo();

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

    res.status(200).json({
      message: 'Login successful',
      username,
      sessionToken,
      subscriptionEnd: user.subscriptionEnd || null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/validate-session', async (req, res) => {
  try {
    const { username, sessionToken } = req.body;
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ username, sessionToken });

    if (!user) {
      return res.status(401).json({ valid: false });
    }

    res.status(200).json({
      valid: true,
      isSubscribed: user.subscriptionEnd > new Date().getTime(),
      subscriptionEnd: user.subscriptionEnd || null
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ valid: false });
  }
});

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

app.post('/api/submit-code', async (req, res) => {
  try {
    const { username, code, subscriptionMonths } = req.body;
    const usersCollection = db.collection('users');
    const now = new Date().getTime();
    const monthsInMs = subscriptionMonths * 30 * 24 * 60 * 60 * 1000;

    const firstLetter = username.charAt(0).toUpperCase();
    const usernameCodes = {
      A: { threeMonths: { initial: '222978', renewal: '000000' }, sevenMonths: { initial: '111000', renewal: '300000' } },
      B: { threeMonths: { initial: '223978', renewal: '001000' }, sevenMonths: { initial: '112000', renewal: '301000' } },
      // Add other letters as needed
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

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});