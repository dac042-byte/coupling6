# Coupling - Student Collaboration Marketplace

A Tinder-like matching platform that connects technical students with non-technical students to collaborate on projects. Think of it as Fiverr meets Tinder for ambitious college students.

## Features

- **Smart Matching**: Technical students only match with non-technical students and vice versa
- **User Profiles**:
  - Technical students showcase skills, previous projects, and portfolios
  - Non-technical students present detailed project ideas, timelines, and equity offerings
- **Tinder-style Swiping**: Swipe right to show interest, left to pass
- **Real-time Messaging**: Chat with your matches instantly
- **Theme Toggle**: Dark purplish theme or light pinkish theme
- **University-based**: Focused on college students with university verification

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Database**: SQLite with better-sqlite3
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: Session-based with bcrypt password hashing
- **Real-time**: Socket.IO for instant messaging

## Getting Started

### Installation

```bash
npm install
```

### Seed Database

Populate the database with placeholder users:

```bash
node seed.js
```

This creates realistic technical and non-technical user profiles. All accounts use password: `password123`

### Run the Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Usage

1. **Sign Up**: Create an account as either a technical or non-technical student
2. **Complete Profile**:
   - Technical: Add skills, previous projects, GitHub/portfolio links
   - Non-technical: Describe your idea, timeline, and what you're offering
3. **Start Swiping**: Discover potential collaborators
4. **Match & Chat**: When both users swipe right, start collaborating!

## Project Structure

```
coupling6/
├── server.js           # Express server & API routes
├── seed.js            # Database seeding script
├── package.json       # Dependencies
├── coupling.db        # SQLite database (created on first run)
└── public/
    ├── index.html     # Sign in page
    ├── signup.html    # Registration page
    ├── app.html       # Main application
    ├── app.js         # Frontend JavaScript
    └── styles.css     # Styling with theme support
```

## Features in Detail

### Authentication
- Secure password hashing with bcrypt
- Session-based authentication
- Protected API routes

### Matching Algorithm
- Only shows opposite user types
- Excludes already-swiped users
- Creates matches when both users swipe right

### Real-time Chat
- Socket.IO for instant messaging
- Message history persistence
- Last message preview in matches list

### Themes
- Dark theme: Purple and deep colors
- Light theme: Pink and warm colors
- Preference saved in localStorage

## Future Enhancements

- Swipe limits (premium feature)
- "See who liked you" feature
- User ratings and reviews
- Advanced filtering (by university, skills, etc.)
- Email notifications
- Video chat integration
- Project milestone tracking

## License

MIT
