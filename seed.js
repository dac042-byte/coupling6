const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('coupling.db');

// Promisify database methods
const dbRun = (sql, ...params) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, ...params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function seed() {
  console.log('Seeding database with placeholder users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Technical users
  const technicalUsers = [
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@stanford.edu',
      country: 'United States',
      university: 'Stanford University',
      bio: 'CS senior passionate about AI/ML and building scalable systems. Love hackathons and coffee!',
      skills: 'Python, TensorFlow, React, Node.js, AWS, Docker',
      previousProjects: 'Built an AI-powered study assistant app (50k+ users)\nDeveloped a real-time collaboration tool for remote teams\nContributed to open-source ML libraries'
    },
    {
      name: 'Alex Kumar',
      email: 'alex.kumar@mit.edu',
      country: 'United States',
      university: 'MIT',
      bio: 'Full-stack developer with a passion for creating intuitive user experiences.',
      skills: 'JavaScript, TypeScript, React, Vue.js, GraphQL, PostgreSQL',
      previousProjects: 'Created a campus food delivery platform\nBuilt a blockchain-based voting system\nDeveloped mobile apps with 10k+ downloads',
      githubUrl: 'https://github.com/alexkumar',
      portfolioUrl: 'https://alexkumar.dev'
    },
    {
      name: 'Jordan Lee',
      email: 'jordan.lee@berkeley.edu',
      country: 'United States',
      university: 'UC Berkeley',
      bio: 'Backend engineer who loves solving complex problems and optimizing systems.',
      skills: 'Java, Spring Boot, Kubernetes, Redis, Microservices, Go',
      previousProjects: 'Architected a high-traffic e-commerce backend\nBuilt distributed systems for data processing\nCreated APIs used by 100k+ users daily'
    },
    {
      name: 'Maya Patel',
      email: 'maya.patel@caltech.edu',
      country: 'United States',
      university: 'Caltech',
      bio: 'Mobile developer and UI/UX enthusiast. Winner of 3 hackathons.',
      skills: 'Swift, Kotlin, Flutter, React Native, Firebase, UI/UX Design',
      previousProjects: 'Developed a mental health tracking app\nCreated a AR-based campus navigation app\nBuilt cross-platform apps for startups',
      githubUrl: 'https://github.com/mayapatel'
    },
    {
      name: 'Chris Martinez',
      email: 'chris.m@cmu.edu',
      country: 'United States',
      university: 'Carnegie Mellon University',
      bio: 'DevOps and cloud infrastructure specialist. Always learning new technologies.',
      skills: 'AWS, Azure, Terraform, CI/CD, Python, Linux, Docker',
      previousProjects: 'Set up infrastructure for 5+ startups\nAutomated deployment pipelines\nReduced cloud costs by 40% for a SaaS company'
    }
  ];

  // Non-technical users
  const nonTechnicalUsers = [
    {
      name: 'Emma Watson',
      email: 'emma.watson@harvard.edu',
      country: 'United States',
      university: 'Harvard University',
      bio: 'Business student with a passion for EdTech. Former intern at education startups.',
      ideaTitle: 'StudyBuddy - AI-Powered Study Group Matcher',
      ideaDescription: 'An app that uses AI to match students for study groups based on their classes, learning styles, and schedules. Students can rate their study partners and build long-term study relationships.',
      timeline: 'Week 1-2: User research and wireframing\nWeek 3-4: MVP development with basic matching\nWeek 5-6: Testing with 50 students\nWeek 7-8: Add AI recommendations and ratings\nWeek 9-10: Campus-wide launch',
      equityOffered: '15-20% equity for technical co-founder',
      budget: '$1000 for initial hosting and marketing'
    },
    {
      name: 'Marcus Johnson',
      email: 'marcus.j@yale.edu',
      country: 'United States',
      university: 'Yale University',
      bio: 'Economics major interested in fintech. Have validated idea through customer interviews.',
      ideaTitle: 'CampusCash - Student Micro-Lending Platform',
      ideaDescription: 'A peer-to-peer lending platform specifically for college students. Students can borrow small amounts ($20-$200) from other students with automatic repayment through campus employment.',
      timeline: 'Month 1: Build basic platform and payment integration\nMonth 2: Beta test with 100 students\nMonth 3: Add credit scoring system\nMonth 4: Launch at 3 universities\nMonth 5-6: Scale and refine',
      equityOffered: '25% equity + revenue sharing for first year'
    },
    {
      name: 'Olivia Brown',
      email: 'olivia.b@princeton.edu',
      country: 'United States',
      university: 'Princeton University',
      bio: 'Environmental science major passionate about sustainability and campus initiatives.',
      ideaTitle: 'GreenCampus - Sustainability Tracking App',
      ideaDescription: 'Help students and universities track their carbon footprint through daily activities. Gamified system with challenges, leaderboards, and rewards from local eco-friendly businesses.',
      timeline: 'Phase 1 (Weeks 1-3): Core tracking features\nPhase 2 (Weeks 4-6): Gamification and social features\nPhase 3 (Weeks 7-9): Partner integration\nPhase 4 (Weeks 10-12): Launch and marketing',
      equityOffered: '20% equity for technical co-founder',
      budget: '$500 for API costs and initial marketing'
    },
    {
      name: 'Liam Zhang',
      email: 'liam.zhang@columbia.edu',
      country: 'United States',
      university: 'Columbia University',
      bio: 'Marketing major with experience in social media growth. Managed campaigns with 1M+ reach.',
      ideaTitle: 'EventHub - Campus Event Discovery Platform',
      ideaDescription: 'A centralized platform for discovering campus events, clubs, and activities. Features personalized recommendations, RSVP management, and social integration to help students find their community.',
      timeline: 'Sprint 1 (2 weeks): Event listing and search\nSprint 2 (2 weeks): User profiles and recommendations\nSprint 3 (2 weeks): RSVP and calendar integration\nSprint 4 (2 weeks): Social features and club pages\nSprint 5 (2 weeks): Launch campaign',
      equityOffered: 'Free project for portfolio building + profit sharing if monetized'
    },
    {
      name: 'Sophia Rodriguez',
      email: 'sophia.r@cornell.edu',
      country: 'United States',
      university: 'Cornell University',
      bio: 'Psychology major focused on mental health. Conducted research on student wellbeing.',
      ideaTitle: 'MindfulU - Anonymous Peer Support Network',
      ideaDescription: 'A platform connecting students anonymously for mental health support. Features trained peer listeners, resources, and crisis intervention connections. All conversations are confidential and moderated.',
      timeline: 'Month 1: Platform development and safety features\nMonth 2: Recruit and train peer listeners\nMonth 3: Soft launch with psychology department\nMonth 4: Add resource library and crisis features\nMonth 5-6: Full launch with counseling center partnership',
      equityOffered: '30% equity for technical co-founder + grant funding opportunities',
      budget: '$2000 from university grant for mental health initiatives'
    },
    {
      name: 'David Kim',
      email: 'david.kim@upenn.edu',
      country: 'United States',
      university: 'University of Pennsylvania',
      bio: 'Business analytics student. Built financial models for 3 student startups.',
      ideaTitle: 'RoommateMatch Pro - Smart Roommate Finder',
      ideaDescription: 'Advanced roommate matching using personality tests, lifestyle preferences, and compatibility algorithms. Includes lease management, expense splitting, and conflict resolution tools.',
      timeline: 'Q1: Matching algorithm and core features\nQ2: Beta test with 200 students\nQ3: Add financial tools and lease management\nQ4: Expand to 10 universities',
      equityOffered: '15% equity + $500 upfront for initial development'
    }
  ];

  try {
    // Insert technical users
    for (const user of technicalUsers) {
      const result = await dbRun(
        `INSERT INTO users (email, password, name, user_type, country, university, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        user.email,
        hashedPassword,
        user.name,
        'technical',
        user.country,
        user.university,
        user.bio
      );

      await dbRun(
        `INSERT INTO technical_profiles (user_id, skills, previous_projects, github_url, portfolio_url)
         VALUES (?, ?, ?, ?, ?)`,
        result.lastID,
        user.skills,
        user.previousProjects,
        user.githubUrl || '',
        user.portfolioUrl || ''
      );

      console.log(`✓ Created technical user: ${user.name}`);
    }

    // Insert non-technical users
    for (const user of nonTechnicalUsers) {
      const result = await dbRun(
        `INSERT INTO users (email, password, name, user_type, country, university, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        user.email,
        hashedPassword,
        user.name,
        'non-technical',
        user.country,
        user.university,
        user.bio
      );

      await dbRun(
        `INSERT INTO non_technical_profiles (user_id, idea_title, idea_description, timeline, equity_offered, budget)
         VALUES (?, ?, ?, ?, ?, ?)`,
        result.lastID,
        user.ideaTitle,
        user.ideaDescription,
        user.timeline,
        user.equityOffered,
        user.budget || ''
      );

      console.log(`✓ Created non-technical user: ${user.name}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nYou can log in with any of these accounts:');
    console.log('Password for all accounts: password123\n');
    console.log('Technical users:');
    technicalUsers.forEach(u => console.log(`  - ${u.email}`));
    console.log('\nNon-technical users:');
    nonTechnicalUsers.forEach(u => console.log(`  - ${u.email}`));

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

seed();
