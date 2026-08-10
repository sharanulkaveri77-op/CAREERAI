# CareerAI

CareerAI is an intelligent, AI-powered career coaching platform that helps job seekers align their skills with market demand, generate personalized learning roadmaps, and practice with mock technical interviews.

![Dashboard Preview](./client/public/dashboard-placeholder.png)

## Features
- **Resume Parsing & Scoring**: Upload your PDF/DOCX resume and get an instant ATS-style score.
- **Smart Job Matching**: Uses vector embeddings and Cosine Similarity to find the best fit among seed job listings.
- **AI Career Roadmaps**: Generates a month-by-month study plan based on your missing skills using the Groq AI API.
- **Mock Interview Simulator**: A chat-based interview room where AI acts as a technical recruiter, scoring your answers in real-time.
- **Premium Analytics**: Recharts-powered dashboard tracking your growth.

## Architecture
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose), JWT Auth.
- **AI**: Groq API (Llama 3.3 70B for reasoning, Llama 3.1 8B for fast lightweight calls).

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (Local or Atlas) - *Optional: App falls back to in-memory DB if no URI is provided.*
- Groq API Key - *Optional: App falls back to Mock logic if no key is provided.*

### Installation

1. Clone the repository.
2. Install dependencies for both client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `/server` directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GROQ_API_KEY=your_groq_api_key
   ```

4. Run the development servers:
   **Terminal 1 (Backend)**
   ```bash
   cd server
   npm run dev
   ```

   **Terminal 2 (Frontend)**
   ```bash
   cd client
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`.

## Testing
The backend features Jest unit tests for the core AI vector math.
```bash
cd server
npm test
```

## Deployment
This project is configured for automated CI/CD.
- **Frontend**: Configured for Vercel (`vercel.json`).
- **Backend**: Configured for Render (`render.yaml`).

Check the `deployment_checklist.md` for step-by-step launch instructions.
