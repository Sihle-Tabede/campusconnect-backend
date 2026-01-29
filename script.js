
// API Base URL
const API_BASE = 'http://localhost:3000/api';



// Utility functions
function showMessage(message, type = 'error') {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
    setTimeout(() => {
      messageDiv.innerHTML = '';
    }, 5000);
  }
}

function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

// Registration handler
async function handleRegister(event) {
  event.preventDefault();
  
  const formData = {
    userType: document.getElementById('userType').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value.toLowerCase(),
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value
  };

  // Add student or staff number based on user type
  if (formData.userType === 'student') {
    formData.studentNumber = document.getElementById('studentNumber').value;
  } else if (formData.userType === 'staff') {
    formData.staffNumber = document.getElementById('staffNumber').value;
  }

  // Email validation for TUT domain
  if (!formData.email.endsWith('@tut4life.ac.za')) {
    showMessage('Email must end with @tut4life.ac.za');
    return;
  }

  // Validation
  if (formData.password !== formData.confirmPassword) {
    showMessage('Passwords do not match');
    return;
  }

  if (formData.password.length < 6) {
    showMessage('Password must be at least 6 characters long');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('Account created successfully! You can now log in.', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showMessage(result.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('Network error. Please try again.');
  }
}

// Login handler
async function handleLogin(event) {
  event.preventDefault();
  
  const formData = {
    userType: document.getElementById('userType').value,
    identifier: document.getElementById('identifier').value,
    password: document.getElementById('password').value
  };

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      setCurrentUser(result.user);
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      showMessage(result.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Network error. Please try again.');
  }
}

// Logout function
function logout() {
  clearCurrentUser();
  localStorage.removeItem('requests');
  window.location.href = 'index.html';
}

// Submit support request
async function submitRequest() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const type = document.getElementById('supportType').value;
  const details = document.getElementById('supportDetails').value;

  if (!type || !details) {
    alert('Please complete all fields');
    return;
  }

  const requestData = {
    userId: user.id,
    type: type,
    details: details,
    status: 'Pending',
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      document.getElementById('supportType').value = '';
      document.getElementById('supportDetails').value = '';
      alert('Request submitted successfully!');
      loadRequests();
    } else {
      alert('Failed to submit request. Please try again.');
    }
  } catch (error) {
    console.error('Request submission error:', error);
    // Fallback to localStorage for offline functionality
    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    requests.push({
      ...requestData,
      id: Date.now()
    });
    localStorage.setItem('requests', JSON.stringify(requests));
    
    document.getElementById('supportType').value = '';
    document.getElementById('supportDetails').value = '';
    alert('Request submitted successfully!');
    loadRequests();
  }
}

// Load user requests
async function loadRequests() {
  const user = getCurrentUser();
  if (!user) return;

  const container = document.getElementById('requests');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE}/requests/${user.id}`);
    
    if (response.ok) {
      const requests = await response.json();
      displayRequests(requests);
    } else {
      throw new Error('Failed to load from server');
    }
  } catch (error) {
    console.error('Load requests error:', error);
    // Fallback to localStorage
    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    displayRequests(requests);
  }
}

function displayRequests(requests) {
  const container = document.getElementById('requests');
  if (!container) return;

  container.innerHTML = '';

  if (requests.length === 0) {
    container.innerHTML = '<p>No requests submitted yet.</p>';
    return;
  }

  requests.forEach(request => {
    const div = document.createElement('div');
    div.className = 'card';
    
    let statusColor = 'status';
    if (request.status === 'Approved') statusColor = 'status approved';
    if (request.status === 'Pending') statusColor = 'status pending';
    
    div.innerHTML = `
      <strong>${request.type}</strong><br>
      ${request.details}<br>
      <small>Submitted: ${new Date(request.timestamp).toLocaleDateString()}</small><br>
      Status: <span class="${statusColor}">${request.status}</span>
      ${request.response ? `<br><strong>Response:</strong> ${request.response}` : ''}
      <br><button onclick="trackRequest('${request.id}')" style="margin-top: 10px; padding: 5px 10px; background: var(--tut-blue); color: white; border: none; border-radius: 3px; cursor: pointer;">Track Status</button>
    `;
    container.appendChild(div);
  });
}

// Track request function
function trackRequest(requestId) {
  alert(`Tracking request ${requestId}. Status updates will be shown here.`);
}

// Submit feedback
async function submitFeedback() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const feedbackType = document.getElementById('feedbackType').value;
  const feedback = document.getElementById('feedback').value;
  
  if (!feedback) {
    alert('Please enter feedback');
    return;
  }

  const feedbackData = {
    userId: user.id,
    type: feedbackType,
    feedback: feedback,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });

    if (response.ok) {
      alert('Thank you for your feedback!');
      document.getElementById('feedback').value = '';
    } else {
      alert('Failed to submit feedback. Please try again.');
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
    alert('Thank you for your feedback!');
    document.getElementById('feedback').value = '';
  }
}

// Load announcements
async function loadAnnouncements() {
  const container = document.getElementById('announcements');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE}/announcements`);
    
    if (response.ok) {
      const announcements = await response.json();
      displayAnnouncements(announcements);
    } else {
      throw new Error('Failed to load announcements');
    }
  } catch (error) {
    console.error('Load announcements error:', error);
    // Fallback announcements
    const fallbackAnnouncements = [
      {
        id: '1',
        title: 'Semester Tests',
        content: 'Semester tests start next week. Please check your timetable for specific dates and venues.',
        type: 'academic',
        timestamp: new Date().toISOString()
      },
      {
        id: '2', 
        title: 'Career Expo',
        content: 'Join us for the annual Career Expo on 15 March at Pretoria Campus. Meet potential employers and explore career opportunities.',
        type: 'event',
        timestamp: new Date().toISOString()
      }
    ];
    displayAnnouncements(fallbackAnnouncements);
  }
}

function displayAnnouncements(announcements) {
  const container = document.getElementById('announcements');
  if (!container) return;

  container.innerHTML = '';

  if (announcements.length === 0) {
    container.innerHTML = '<p>No announcements at this time.</p>';
    return;
  }

  announcements.forEach(announcement => {
    const div = document.createElement('div');
    div.className = 'card announcement-card';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <strong>📢 ${announcement.title}</strong><br>
      <p>${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''}</p>
      <small>Posted: ${new Date(announcement.timestamp).toLocaleDateString()}</small>
      <br><a href="#" onclick="viewAnnouncement('${announcement.id}')" style="color: var(--tut-blue);">Read More</a>
    `;
    container.appendChild(div);
  });
}

function viewAnnouncement(id) {
  // This would open a modal or detailed view
  alert('Full announcement view would open here');
}