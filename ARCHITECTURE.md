# CareerAI Architecture and Data Flow

## 1. System Overview

CareerAI is a decoupled full-stack application built for production-readiness. The platform is designed specifically to keep AI integration secure (server-side only) and code highly modular.

### Tech Stack Breakdown
- **Client**: React + TypeScript + Vite, using TailwindCSS for styling and shadcn/ui for accessible UI components. Zustand is used for lightweight global state.
- **Server**: Node.js + Express + TypeScript, implementing a Controller-Service-Route pattern.
- **Database**: MongoDB (Mongoose).
- **AI Core**: Anthropic Claude API for reasoning, mock interviews, and resume processing.
- **Matching Core**: Xenova Transformers (or similar local/API vector store) paired with Cosine Similarity for intelligent job-to-resume matching.

## 2. Directory Structure

### Frontend (`/client`)
```text
client/
├── src/
│   ├── components/         # Reusable shadcn/ui and custom UI components
│   ├── features/           # Domain-specific modules (e.g. /features/resume, /features/jobs)
│   ├── hooks/              # Custom React hooks
│   ├── layouts/            # Page wrappers (e.g. DashboardLayout, AuthLayout)
│   ├── lib/                # Utility functions, API clients, and constants
│   ├── pages/              # Top-level route components
│   ├── store/              # Zustand state slices
│   └── types/              # Global TypeScript interfaces
```

### Backend (`/server`)
```text
server/
├── src/
│   ├── config/             # Environment variables and DB initialization
│   ├── controllers/        # Express route controllers (handle req/res)
│   ├── middlewares/        # Express middlewares (auth, validation, error handling)
│   ├── models/             # Mongoose schemas and DB models
│   ├── routes/             # Express API route declarations
│   ├── services/           # Heavy business logic (AI calls, DB queries)
│   ├── utils/              # Helper functions (similarity calculators, formatters)
│   └── types/              # Global TypeScript interfaces
```

## 3. Data Flow

1. **Client Request**: A user interacts with the React frontend (e.g., uploads a resume). The frontend calls the corresponding backend endpoint (e.g., `POST /api/resume/upload`).
2. **Server Middleware**: The request passes through Express middlewares such as Helmet (security headers), CORS, JWT Authentication (for protected routes), and Input Validation.
3. **Controller**: The controller receives the sanitized request, extracts the necessary payload, and passes it to the Service layer.
4. **Service**: 
   - Queries the MongoDB database via Mongoose if historical data is needed.
   - For AI workflows, the service crafts a specialized prompt and securely calls the Anthropic Claude API.
   - For matching workflows, the service converts text to embeddings and calculates cosine similarity scores.
5. **Response**: The service returns the processed data back to the controller, which formats a standardized JSON response and sends it back to the client.
6. **State Update**: The client receives the response, updates the Zustand store if necessary, and re-renders the UI with the new data.

## 4. Key Architectural Decisions

- **Server-Side AI Only**: Under no circumstances are API keys (like Anthropic) exposed to the client. All generative AI tasks happen securely within the Node.js backend.
- **Service Layer Abstraction**: Business logic is decoupled from Express controllers. This makes writing unit tests easier and allows services to be reused (e.g., calling the `MatchingService` from both the `JobController` and a cron job).
- **Environment Parity**: `.env.example` files are strictly maintained to ensure seamless onboarding without leaking production secrets.
