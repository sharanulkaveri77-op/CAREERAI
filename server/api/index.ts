import 'dotenv/config';
import { connectDB } from '../src/config/db';
import app from '../src/app';

// Vercel serverless entry: the whole Express app becomes a single function.
// Connect on (cold) start; warm instances reuse mongoose's cached connection.
connectDB().catch((error: Error) => {
  console.error('DB connect failed:', error.message);
});

export default app;