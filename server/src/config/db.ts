import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // If no URI is provided, spin up an in-memory MongoDB instance for development!
    if (!uri) {
      console.log('No MONGODB_URI provided. Starting in-memory MongoDB for local development...');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host} (Using In-Memory Database)`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};
