const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

//const PORT = 3000;
const PORT = process.env.PORT || 3000;

// NB: Just a test log to indicate server start( recently added)
console.log(`🚀CampusConnect Server started`);



// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Data storage files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const REQUESTS_FILE = path.join(__dirname, 'data', 'requests.json');
const FEEDBACK_FILE = path.join(__dirname, 'data', 'feedback.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Initialize data files if they don't exist
function initializeDataFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initializeDataFile(USERS_FILE);
initializeDataFile(REQUESTS_FILE);
initializeDataFile(FEEDBACK_FILE);

// Helper functions
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Routes

// Register new user
app.post('/api/register', (req, res) => {
  const { userType, firstName, lastName, email, password, studentNumber, staffNumber } = req.body;

  // Validation
  if (!userType || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (userType === 'student' && !studentNumber) {
    return res.status(400).json({ message: 'Student number is required' });
  }

  if (userType === 'staff' && !staffNumber) {
    return res.status(400).json({ message: 'Staff number is required' });
  }

  const users = readJsonFile(USERS_FILE);
  
  // Check if user already exists
  const identifier = userType === 'student' ? studentNumber : staffNumber;
  const existingUser = users.find(user => 
    (user.studentNumber === identifier || user.staffNumber === identifier) ||
    user.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return res.status(400).json({ message: 'User already exists with this email or number' });
  }

  // Validate TUT email domain
  if (!email.toLowerCase().endsWith('@tut4life.ac.za')) {
    return res.status(400).json({ message: 'Email must end with @tut4life.ac.za' });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    userType,
    firstName,
    lastName,
    email: email.toLowerCase(),
    password, // In production, this should be hashed
    studentNumber: userType === 'student' ? studentNumber : null,
    staffNumber: userType === 'staff' ? staffNumber : null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  
  if (writeJsonFile(USERS_FILE, users)) {
    res.status(201).json({ message: 'User registered successfully' });
  } else {
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// Login user
app.post('/api/login', (req, res) => {
  const { userType, identifier, password } = req.body;

  if (!userType || !identifier || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const users = readJsonFile(USERS_FILE);
  
  // Find user by identifier and type
  const user = users.find(u => 
    u.userType === userType &&
    (u.studentNumber === identifier || u.staffNumber === identifier) &&
    u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Return user data (excluding password)
  const { password: _, ...userWithoutPassword } = user;
  res.json({ 
    message: 'Login successful',
    user: userWithoutPassword
  });
});

// Submit service request
app.post('/api/requests', (req, res) => {
  const { userId, type, details } = req.body;

  if (!userId || !type || !details) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const requests = readJsonFile(REQUESTS_FILE);
  
  const newRequest = {
    id: Date.now().toString(),
    userId,
    type,
    details,
    status: 'Pending',
    timestamp: new Date().toISOString()
  };

  requests.push(newRequest);
  
  if (writeJsonFile(REQUESTS_FILE, requests)) {
    res.status(201).json({ message: 'Request submitted successfully', request: newRequest });
  } else {
    res.status(500).json({ message: 'Failed to submit request' });
  }
});

// Get user requests
app.get('/api/requests/:userId', (req, res) => {
  const { userId } = req.params;
  const requests = readJsonFile(REQUESTS_FILE);
  
  const userRequests = requests.filter(request => request.userId === userId);
  res.json(userRequests);
});

// Submit feedback
app.post('/api/feedback', (req, res) => {
  const { userId, type, feedback } = req.body;

  if (!userId || !feedback) {
    return res.status(400).json({ message: 'User ID and feedback are required' });
  }

  const feedbackData = readJsonFile(FEEDBACK_FILE);
  
  const newFeedback = {
    id: Date.now().toString(),
    userId,
    type: type || 'General',
    feedback,
    timestamp: new Date().toISOString()
  };

  feedbackData.push(newFeedback);
  
  if (writeJsonFile(FEEDBACK_FILE, feedbackData)) {
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } else {
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Get announcements
app.get('/api/announcements', (req, res) => {
  const announcementsFile = path.join(__dirname, 'data', 'announcements.json');
  initializeDataFile(announcementsFile);
  const announcements = readJsonFile(announcementsFile);
  res.json(announcements);
});

// Admin routes

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
  const users = readJsonFile(USERS_FILE);
  const safeUsers = users.map(({ password, ...user }) => user);
  res.json(safeUsers);
});

// Get all requests (admin only)
app.get('/api/admin/requests', (req, res) => {
  const requests = readJsonFile(REQUESTS_FILE);
  const users = readJsonFile(USERS_FILE);
  
  const requestsWithUsers = requests.map(request => {
    const user = users.find(u => u.id === request.userId);
    return {
      ...request,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    };
  });
  
  res.json(requestsWithUsers);
});

// Update request status (admin only)
app.put('/api/admin/requests/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const requests = readJsonFile(REQUESTS_FILE);
  const requestIndex = requests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ message: 'Request not found' });
  }
  
  requests[requestIndex].status = status;
  
  if (writeJsonFile(REQUESTS_FILE, requests)) {
    res.json({ message: 'Request updated successfully' });
  } else {
    res.status(500).json({ message: 'Failed to update request' });
  }
});

// Add response to request (admin only)
app.put('/api/admin/requests/:id/response', (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  
  const requests = readJsonFile(REQUESTS_FILE);
  const requestIndex = requests.findIndex(r => r.id === id);
  
  if (requestIndex === -1) {
    return res.status(404).json({ message: 'Request not found' });
  }
  
  requests[requestIndex].response = response;
  
  if (writeJsonFile(REQUESTS_FILE, requests)) {
    res.json({ message: 'Response added successfully' });
  } else {
    res.status(500).json({ message: 'Failed to add response' });
  }
});

// Post announcement (admin only)
app.post('/api/admin/announcements', (req, res) => {
  const { title, content, type } = req.body;
  
  const announcementsFile = path.join(__dirname, 'data', 'announcements.json');
  initializeDataFile(announcementsFile);
  
  const announcements = readJsonFile(announcementsFile);
  
  const newAnnouncement = {
    id: Date.now().toString(),
    title,
    content,
    type: type || 'general',
    timestamp: new Date().toISOString()
  };
  
  announcements.unshift(newAnnouncement);
  
  if (writeJsonFile(announcementsFile, announcements)) {
    res.status(201).json({ message: 'Announcement posted successfully' });
  } else {
    res.status(500).json({ message: 'Failed to post announcement' });
  }
});

// Delete announcement (admin only)
app.delete('/api/admin/announcements/:id', (req, res) => {
  const { id } = req.params;
  
  const announcementsFile = path.join(__dirname, 'data', 'announcements.json');
  const announcements = readJsonFile(announcementsFile);
  
  const filteredAnnouncements = announcements.filter(a => a.id !== id);
  
  if (writeJsonFile(announcementsFile, filteredAnnouncements)) {
    res.json({ message: 'Announcement deleted successfully' });
  } else {
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

// Get all feedback (admin only)
app.get('/api/admin/feedback', (req, res) => {
  const feedback = readJsonFile(FEEDBACK_FILE);
  const users = readJsonFile(USERS_FILE);
  
  const feedbackWithUsers = feedback.map(item => {
    const user = users.find(u => u.id === item.userId);
    return {
      ...item,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Anonymous'
    };
  });
  
  res.json(feedbackWithUsers);
});

// Get admin statistics
app.get('/api/admin/stats', (req, res) => {
  const users = readJsonFile(USERS_FILE);
  const requests = readJsonFile(REQUESTS_FILE);
  const feedback = readJsonFile(FEEDBACK_FILE);
  
  const stats = {
    totalUsers: users.length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'Pending').length,
    totalFeedback: feedback.length,
    studentCount: users.filter(u => u.userType === 'student').length,
    staffCount: users.filter(u => u.userType === 'staff').length
  };
  
  res.json(stats);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CampusConnect Server running on http://localhost:${PORT}`);
  console.log(`📁 Data files stored in: ${dataDir}`);
  console.log('📋 Available endpoints:');
  console.log('   POST /api/register - Register new user');
  console.log('   POST /api/login - User login');
  console.log('   POST /api/requests - Submit service request');
  console.log('   GET /api/requests/:userId - Get user requests');
  console.log('   POST /api/feedback - Submit feedback');
});