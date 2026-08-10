import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // Without a URI the app starts a throwaway in-memory MongoDB — fine for
    // local dev, useless in production (Vercel functions are stateless).
    if (!uri) {
      if (process.env.VERCEL) {
        throw new Error('MONGODB_URI is required in production (Vercel). Set it in the project environment.');
      }
      console.log('No MONGODB_URI provided. Starting in-memory MongoDB for local development...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
};