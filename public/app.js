// Global state
let currentUser = null;
let potentialMatches = [];
let currentMatchIndex = 0;
let currentChatMatchId = null;
let socket = null;

// Theme management
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon();

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const theme = document.documentElement.getAttribute('data-theme');
  const icon = document.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Initialize app
async function init() {
  try {
    const response = await fetch('/api/user');
    if (!response.ok) {
      window.location.href = '/';
      return;
    }
    currentUser = await response.json();

    // Initialize Socket.IO
    socket = io();

    // Load initial view
    await loadPotentialMatches();
    setupNavigation();
  } catch (error) {
    console.error('Init error:', error);
    window.location.href = '/';
  }
}

// Navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      showView(view);

      // Update active nav item
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function showView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.classList.remove('active'));

  const targetView = document.getElementById(`${viewName}View`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Load data for specific views
  if (viewName === 'matches') {
    loadMatches();
  } else if (viewName === 'profile') {
    loadProfile();
  }
}

// Sign out
async function signout() {
  await fetch('/api/signout', { method: 'POST' });
  window.location.href = '/';
}

// Discover/Swipe functionality
async function loadPotentialMatches() {
  try {
    const response = await fetch('/api/potential-matches');
    potentialMatches = await response.json();
    currentMatchIndex = 0;
    renderCurrentCard();
  } catch (error) {
    console.error('Error loading matches:', error);
  }
}

function renderCurrentCard() {
  const cardStack = document.getElementById('cardStack');
  const noMoreCards = document.getElementById('noMoreCards');
  const swipeButtons = document.getElementById('swipeButtons');

  // Clear existing cards
  const existingCards = cardStack.querySelectorAll('.swipe-card');
  existingCards.forEach(card => card.remove());

  if (currentMatchIndex >= potentialMatches.length) {
    noMoreCards.style.display = 'flex';
    swipeButtons.style.display = 'none';
    return;
  }

  noMoreCards.style.display = 'none';
  swipeButtons.style.display = 'flex';

  const user = potentialMatches[currentMatchIndex];
  const card = createCard(user);
  cardStack.appendChild(card);
}

function createCard(user) {
  const card = document.createElement('div');
  card.className = 'swipe-card';

  const isTechnical = user.user_type === 'technical';

  let profileContent = '';

  if (isTechnical && user.profile) {
    const skills = user.profile.skills ? user.profile.skills.split(',').map(s => s.trim()) : [];
    profileContent = `
      <div class="card-section">
        <h3>Skills</h3>
        <div class="card-tags">
          ${skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
        </div>
      </div>

      ${user.profile.previous_projects ? `
        <div class="card-section">
          <h3>Previous Projects</h3>
          <p>${user.profile.previous_projects}</p>
        </div>
      ` : ''}

      ${user.profile.github_url ? `
        <div class="card-section">
          <h3>GitHub</h3>
          <p>${user.profile.github_url}</p>
        </div>
      ` : ''}

      ${user.profile.portfolio_url ? `
        <div class="card-section">
          <h3>Portfolio</h3>
          <p>${user.profile.portfolio_url}</p>
        </div>
      ` : ''}
    `;
  } else if (!isTechnical && user.profile) {
    profileContent = `
      ${user.profile.idea_title ? `
        <div class="card-section">
          <h3>Project Idea</h3>
          <p><strong>${user.profile.idea_title}</strong></p>
        </div>
      ` : ''}

      ${user.profile.idea_description ? `
        <div class="card-section">
          <h3>Description</h3>
          <p>${user.profile.idea_description}</p>
        </div>
      ` : ''}

      ${user.profile.timeline ? `
        <div class="card-section">
          <h3>Timeline</h3>
          <p>${user.profile.timeline}</p>
        </div>
      ` : ''}

      ${user.profile.equity_offered ? `
        <div class="card-section">
          <h3>Offering</h3>
          <p>${user.profile.equity_offered}</p>
        </div>
      ` : ''}

      ${user.profile.budget ? `
        <div class="card-section">
          <h3>Budget</h3>
          <p>${user.profile.budget}</p>
        </div>
      ` : ''}
    `;
  }

  card.innerHTML = `
    <div class="card-header">
      <h2>${user.name}</h2>
      <div class="card-meta">
        <span>🎓 ${user.university}</span>
        <span>🌍 ${user.country}</span>
        <span>💼 ${isTechnical ? 'Technical' : 'Idea Maker'}</span>
      </div>
    </div>

    ${user.bio ? `
      <div class="card-section">
        <h3>About</h3>
        <p>${user.bio}</p>
      </div>
    ` : ''}

    <div class="card-content">
      ${profileContent}
    </div>
  `;

  return card;
}

async function swipe(direction) {
  if (currentMatchIndex >= potentialMatches.length) return;

  const user = potentialMatches[currentMatchIndex];

  // Animate card
  const card = document.querySelector('.swipe-card');
  if (card) {
    card.style.transform = direction === 'left'
      ? 'translateX(-150%) rotate(-30deg)'
      : 'translateX(150%) rotate(30deg)';
    card.style.opacity = '0';
  }

  // Send swipe to server
  try {
    const response = await fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: user.id,
        direction: direction
      })
    });

    const data = await response.json();

    if (data.isMatch) {
      showMatchModal();
    }
  } catch (error) {
    console.error('Swipe error:', error);
  }

  // Move to next card
  setTimeout(() => {
    currentMatchIndex++;
    renderCurrentCard();
  }, 300);
}

// Match modal
function showMatchModal() {
  const modal = document.getElementById('matchModal');
  modal.classList.add('active');
}

function closeMatchModal() {
  const modal = document.getElementById('matchModal');
  modal.classList.remove('active');
}

function goToMatches() {
  closeMatchModal();
  showView('matches');
  document.querySelector('[data-view="matches"]').classList.add('active');
  document.querySelector('[data-view="discover"]').classList.remove('active');
}

// Matches view
async function loadMatches() {
  try {
    const response = await fetch('/api/matches');
    const matches = await response.json();

    const matchesList = document.getElementById('matchesList');

    if (matches.length === 0) {
      matchesList.innerHTML = '<div class="loading">No matches yet. Keep swiping!</div>';
      return;
    }

    matchesList.innerHTML = matches.map(match => {
      const initial = match.name.charAt(0).toUpperCase();
      const lastMessageText = match.lastMessage
        ? match.lastMessage.content
        : 'Start a conversation!';

      return `
        <div class="match-item" onclick="openChat(${match.match_id}, '${match.name}')">
          <div class="match-avatar">${initial}</div>
          <div class="match-info">
            <div class="match-name">${match.name}</div>
            <div class="match-details">
              ${match.university} • ${match.user_type === 'technical' ? 'Technical' : 'Idea Maker'}
            </div>
            <div class="match-preview">${lastMessageText}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading matches:', error);
  }
}

// Chat functionality
async function openChat(matchId, userName) {
  currentChatMatchId = matchId;

  // Update chat header
  document.getElementById('chatUserName').textContent = userName;

  // Show chat view
  showView('chat');

  // Join socket room
  if (socket) {
    socket.emit('join_match', matchId);

    // Listen for new messages
    socket.off('new_message');
    socket.on('new_message', (message) => {
      if (currentChatMatchId === matchId) {
        appendMessage(message);
      }
    });
  }

  // Load messages
  await loadMessages(matchId);
}

async function loadMessages(matchId) {
  try {
    const response = await fetch(`/api/messages/${matchId}`);
    const messages = await response.json();

    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';

    messages.forEach(message => {
      appendMessage(message);
    });

    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function appendMessage(message) {
  const messagesList = document.getElementById('messagesList');
  const messageDiv = document.createElement('div');

  const isSent = message.sender_id === currentUser.id;
  messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageDiv.innerHTML = `
    ${!isSent ? `<div class="message-sender">${message.sender_name}</div>` : ''}
    <div class="message-content">${message.content}</div>
    <div class="message-time">${time}</div>
  `;

  messagesList.appendChild(messageDiv);
  messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();

  if (!content || !currentChatMatchId) return;

  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: currentChatMatchId,
        content: content
      })
    });

    input.value = '';
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Allow sending message with Enter key
document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
});

// Profile view
async function loadProfile() {
  try {
    const response = await fetch('/api/user');
    const user = await response.json();

    const profileContent = document.getElementById('profileContent');

    const isTechnical = user.user_type === 'technical';

    let profileSections = `
      <div class="profile-section">
        <h3>Basic Information</h3>
        <div class="profile-field">
          <strong>Name:</strong>
          <p>${user.name}</p>
        </div>
        <div class="profile-field">
          <strong>Email:</strong>
          <p>${user.email}</p>
        </div>
        <div class="profile-field">
          <strong>University:</strong>
          <p>${user.university}</p>
        </div>
        <div class="profile-field">
          <strong>Country:</strong>
          <p>${user.country}</p>
        </div>
        <div class="profile-field">
          <strong>Type:</strong>
          <p>${isTechnical ? 'Technical Student' : 'Non-Technical Student'}</p>
        </div>
        ${user.bio ? `
          <div class="profile-field">
            <strong>Bio:</strong>
            <p>${user.bio}</p>
          </div>
        ` : ''}
      </div>
    `;

    if (isTechnical && user.profile) {
      profileSections += `
        <div class="profile-section">
          <h3>Technical Profile</h3>
          ${user.profile.skills ? `
            <div class="profile-field">
              <strong>Skills:</strong>
              <p>${user.profile.skills}</p>
            </div>
          ` : ''}
          ${user.profile.previous_projects ? `
            <div class="profile-field">
              <strong>Previous Projects:</strong>
              <p>${user.profile.previous_projects}</p>
            </div>
          ` : ''}
          ${user.profile.github_url ? `
            <div class="profile-field">
              <strong>GitHub:</strong>
              <p><a href="${user.profile.github_url}" target="_blank">${user.profile.github_url}</a></p>
            </div>
          ` : ''}
          ${user.profile.portfolio_url ? `
            <div class="profile-field">
              <strong>Portfolio:</strong>
              <p><a href="${user.profile.portfolio_url}" target="_blank">${user.profile.portfolio_url}</a></p>
            </div>
          ` : ''}
        </div>
      `;
    } else if (!isTechnical && user.profile) {
      profileSections += `
        <div class="profile-section">
          <h3>Project Idea</h3>
          ${user.profile.idea_title ? `
            <div class="profile-field">
              <strong>Title:</strong>
              <p>${user.profile.idea_title}</p>
            </div>
          ` : ''}
          ${user.profile.idea_description ? `
            <div class="profile-field">
              <strong>Description:</strong>
              <p>${user.profile.idea_description}</p>
            </div>
          ` : ''}
          ${user.profile.timeline ? `
            <div class="profile-field">
              <strong>Timeline:</strong>
              <p>${user.profile.timeline}</p>
            </div>
          ` : ''}
          ${user.profile.equity_offered ? `
            <div class="profile-field">
              <strong>Offering:</strong>
              <p>${user.profile.equity_offered}</p>
            </div>
          ` : ''}
          ${user.profile.budget ? `
            <div class="profile-field">
              <strong>Budget:</strong>
              <p>${user.profile.budget}</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    profileContent.innerHTML = profileSections;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Initialize when page loads
init();
