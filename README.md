# Graphora

Graphora is a full-stack interview preparation platform that combines DSA practice, realistic mock interviews, coding analytics, mentorship, and career intelligence into one product.

It is designed for students and developers who want more than a question bank: structured preparation, actionable feedback, and direct guidance from industry mentors.

## Why Graphora

- Practice interview-grade DSA problems with an integrated coding workflow
- Run company-focused mock interviews with 3 curated problems per session
- Track coding performance through a profile-style analytics dashboard
- Follow domain roadmaps for focused learning (Web, Data Science, and more)
- Book paid one-to-one mentoring with video calls and messaging
- Explore company insights: hiring roles, salary ranges, company type, and interview context

## Core Features

### 1. DSA Practice Engine

- Curated problem sets with filters and metadata
- In-browser code solving flow
- Submission history and progress statistics

### 2. Mock Interviews

- 3-problem mock sessions
- Generation based on:
	- company (Amazon, Microsoft, etc.)
	- difficulty (easy, medium, hard)
	- pattern (two pointers, greedy, etc.)
- Session history, scoring, and leaderboard-ready data models

### 3. Coding Profile Analytics

- Personal coding profile inspired by platforms like Codolio
- Tracks solved counts, performance trends, and activity insights
- Supports richer profile data through dedicated backend models

### 4. Roadmaps

- Domain-focused learning paths
- Examples: Data Science, Web Development, and broader engineering tracks
- Progression-friendly structure for long-term preparation

### 5. Paid Mentorship (Mentor Connect)

- Mentor discovery and profile browsing
- Paid booking flow
- One-to-one session support
- Real-time messaging and video call integration
- Notifications, reminders, and email workflows

### 6. Company Intelligence

- Company classification (product-based, service-based, etc.)
- Typical roles and hiring positions
- Salary range references
- Interview-relevant company information for candidate preparation

## Monorepo Structure

```text
interviewprep/
	backend/      # Express + TypeScript API, business logic, schedulers, sockets
	frontend/     # React + Vite application
	common/       # Shared package used by frontend and backend
```

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite
- React Router
- Monaco Editor (`@monaco-editor/react`)
- Socket.IO client
- Framer Motion

### Backend

- Node.js + Express 5
- TypeScript
- MongoDB + Mongoose
- JWT-based authentication
- Razorpay payments
- Socket.IO (real-time chat/events)
- Nodemailer + Handlebars email templates
- Security middleware: Helmet, rate limiting, sanitization, HPP

## High-Level Architecture

```text
React (Frontend)
	 |
	 | HTTP + WebSocket
	 v
Express API (Backend)
	 |
	 +--> MongoDB (core data)
	 +--> Redis (cache/session helpers)
	 +--> Razorpay (payments)
	 +--> Email service (notifications)
	 +--> Socket.IO (chat/realtime)
```

## API Modules

Primary API namespaces exposed under `/api/*`:

- `/api/auth` - authentication, profile, password and OTP flows
- `/api/problems` - DSA problem listing, filtering, and management
- `/api/submit` - code runs and final submissions
- `/api/mocks` - mock interview lifecycle
- `/api/mentors` - mentor discovery and onboarding
- `/api/bookings` - mentorship booking operations
- `/api/payments` - payment creation, verification, webhooks
- `/api/chat` - conversation and message APIs
- `/api/notifications` - notification feeds and read state
- `/api/admin` - administrative workflows

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
cd common
npm install

cd ../backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Create a `.env` file inside `backend/` and set values similar to:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/graphora
JWT_SECRET=replace_with_secure_secret
FRONTEND_URL=http://localhost:5173

# Optional integrations
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
REDIS_URL=redis://127.0.0.1:6379
```

Add additional keys required by your local setup (email provider, webhooks, etc.).

### 3. Run the backend

```bash
cd backend
npm run dev
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

### 5. Build for production

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

## Product Vision

Graphora aims to become an end-to-end career prep operating system for software candidates:

- Learn with roadmaps
- Practice with DSA
- Simulate with mocks
- Improve with analytics
- Accelerate with mentors
- Target with company intelligence

## Development Status

This repository is under active development. Core modules exist across practice, mocks, mentorship, notifications, and payments, with continuous iteration on UX and data quality.

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit clear, scoped changes
4. Open a pull request with context and screenshots/logs where relevant

Please keep changes focused and consistent with the existing TypeScript and project structure.

## License

This project is currently unlicensed for public distribution by default. Add a license file before open-source release.
