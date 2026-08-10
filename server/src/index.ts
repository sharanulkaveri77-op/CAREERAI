import 'dotenv/config';
import { connectDB } from './config/db';
import app from './app';

const PORT = process.env.PORT || 5000;

connectDB()
  .catch((error: Error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});