const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = 3000;

// Database setup
const db = new Database('coupling.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('technical', 'non-technical')),
    country TEXT NOT NULL,
    university TEXT NOT NULL,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS technical_profiles (
    user_id INTEGER PRIMARY KEY,
    skills TEXT,
    previous_projects TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS non_technical_profiles (
    user_id INTEGER PRIMARY KEY,
    idea_title TEXT NOT NULL,
    idea_description TEXT NOT NULL,
    timeline TEXT NOT NULL,
    equity_offered TEXT,
    budget TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    swiper_id INTEGER NOT NULL,
    swiped_id INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('left', 'right')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(swiper_id, swiped_id),
    FOREIGN KEY (swiper_id) REFERENCES users(id),
    FOREIGN KEY (swiped_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );
`);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'coupling-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(express.static('public'));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name, userType, country, university, bio,
            skills, previousProjects, githubUrl, portfolioUrl,
            ideaTitle, ideaDescription, timeline, equityOffered, budget } = req.body;

    // Validate required fields
    if (!email || !password || !name || !userType || !country || !university) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const insertUser = db.prepare(`
      INSERT INTO users (email, password, name, user_type, country, university, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertUser.run(email, hashedPassword, name, userType, country, university, bio || '');
    const userId = result.lastInsertRowid;

    // Insert profile data based on user type
    if (userType === 'technical') {
      const insertTech = db.prepare(`
        INSERT INTO technical_profiles (user_id, skills, previous_projects, github_url, portfolio_url)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertTech.run(userId, skills || '', previousProjects || '', githubUrl || '', portfolioUrl || '');
    } else {
      const insertNonTech = db.prepare(`
        INSERT INTO non_technical_profiles (user_id, idea_title, idea_description, timeline, equity_offered, budget)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertNonTech.run(userId, ideaTitle || '', ideaDescription || '', timeline || '', equityOffered || '', budget || '');
    }

    req.session.userId = userId;
    res.json({ success: true, userId });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.post('/api/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    res.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/signout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, user_type, country, university, bio
    FROM users WHERE id = ?
  `).get(req.session.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let profile = null;
  if (user.user_type === 'technical') {
    profile = db.prepare('SELECT * FROM technical_profiles WHERE user_id = ?').get(user.id);
  } else {
    profile = db.prepare('SELECT * FROM non_technical_profiles WHERE user_id = ?').get(user.id);
  }

  res.json({ ...user, profile });
});

app.get('/api/potential-matches', requireAuth, (req, res) => {
  const currentUser = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.session.userId);

  // Get opposite user type
  const targetType = currentUser.user_type === 'technical' ? 'non-technical' : 'technical';

  // Get users who haven't been swiped yet
  const potentialMatches = db.prepare(`
    SELECT u.id, u.name, u.user_type, u.country, u.university, u.bio
    FROM users u
    WHERE u.user_type = ?
    AND u.id != ?
    AND u.id NOT IN (
      SELECT swiped_id FROM swipes WHERE swiper_id = ?
    )
    ORDER BY RANDOM()
    LIMIT 10
  `).all(targetType, req.session.userId, req.session.userId);

  // Get profiles for each user
  const matchesWithProfiles = potentialMatches.map(user => {
    let profile = null;
    if (user.user_type === 'technical') {
      profile = db.prepare('SELECT * FROM technical_profiles WHERE user_id = ?').get(user.id);
    } else {
      profile = db.prepare('SELECT * FROM non_technical_profiles WHERE user_id = ?').get(user.id);
    }
    return { ...user, profile };
  });

  res.json(matchesWithProfiles);
});

app.post('/api/swipe', requireAuth, (req, res) => {
  const { targetUserId, direction } = req.body;

  // Record swipe
  const insertSwipe = db.prepare(`
    INSERT OR IGNORE INTO swipes (swiper_id, swiped_id, direction)
    VALUES (?, ?, ?)
  `);
  insertSwipe.run(req.session.userId, targetUserId, direction);

  // Check for match if it's a right swipe
  let isMatch = false;
  if (direction === 'right') {
    const mutualSwipe = db.prepare(`
      SELECT * FROM swipes
      WHERE swiper_id = ? AND swiped_id = ? AND direction = 'right'
    `).get(targetUserId, req.session.userId);

    if (mutualSwipe) {
      // Create match
      const user1 = Math.min(req.session.userId, targetUserId);
      const user2 = Math.max(req.session.userId, targetUserId);

      const insertMatch = db.prepare(`
        INSERT OR IGNORE INTO matches (user1_id, user2_id)
        VALUES (?, ?)
      `);
      insertMatch.run(user1, user2);
      isMatch = true;
    }
  }

  res.json({ success: true, isMatch });
});

app.get('/api/matches', requireAuth, (req, res) => {
  const matches = db.prepare(`
    SELECT m.id as match_id, m.created_at,
           u.id, u.name, u.user_type, u.country, u.university, u.bio
    FROM matches m
    JOIN users u ON (u.id = m.user1_id OR u.id = m.user2_id)
    WHERE (m.user1_id = ? OR m.user2_id = ?)
    AND u.id != ?
    ORDER BY m.created_at DESC
  `).all(req.session.userId, req.session.userId, req.session.userId);

  // Get profiles and last message for each match
  const matchesWithDetails = matches.map(match => {
    let profile = null;
    if (match.user_type === 'technical') {
      profile = db.prepare('SELECT * FROM technical_profiles WHERE user_id = ?').get(match.id);
    } else {
      profile = db.prepare('SELECT * FROM non_technical_profiles WHERE user_id = ?').get(match.id);
    }

    const lastMessage = db.prepare(`
      SELECT content, created_at, sender_id
      FROM messages
      WHERE match_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(match.match_id);

    return { ...match, profile, lastMessage };
  });

  res.json(matchesWithDetails);
});

app.get('/api/messages/:matchId', requireAuth, (req, res) => {
  const { matchId } = req.params;

  // Verify user is part of this match
  const match = db.prepare(`
    SELECT * FROM matches
    WHERE id = ? AND (user1_id = ? OR user2_id = ?)
  `).get(matchId, req.session.userId, req.session.userId);

  if (!match) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.match_id = ?
    ORDER BY m.created_at ASC
  `).all(matchId);

  res.json(messages);
});

app.post('/api/messages', requireAuth, (req, res) => {
  const { matchId, content } = req.body;

  // Verify user is part of this match
  const match = db.prepare(`
    SELECT * FROM matches
    WHERE id = ? AND (user1_id = ? OR user2_id = ?)
  `).get(matchId, req.session.userId, req.session.userId);

  if (!match) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const insertMessage = db.prepare(`
    INSERT INTO messages (match_id, sender_id, content)
    VALUES (?, ?, ?)
  `);
  const result = insertMessage.run(matchId, req.session.userId, content);

  const message = db.prepare(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // Emit to socket
  io.to(`match_${matchId}`).emit('new_message', message);

  res.json(message);
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(`match_${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

server.listen(PORT, () => {
  console.log(`Coupling server running on http://localhost:${PORT}`);
});
