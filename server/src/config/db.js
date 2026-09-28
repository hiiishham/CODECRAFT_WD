import mongoose from 'mongoose';
import { seedInitialAdmin } from '../utils/seedAdmin.js';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/employee_management';

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    
    // Automatically verify/seed initial Super Admin from environment variables
    await seedInitialAdmin();
  } catch (primaryError) {
    if (primaryUri !== localFallbackUri) {
      console.warn(`[Database] Primary MongoDB connection failed: ${primaryError.message}. Attempting local fallback (${localFallbackUri})...`);
      try {
        const localConn = await mongoose.connect(localFallbackUri);
        console.log(`[Database] MongoDB Connected (Local Fallback): ${localConn.connection.host}`);
        await seedInitialAdmin();
        return;
      } catch (localError) {
        console.error(`[Database Error] Local fallback failed: ${localError.message}`);
      }
    }
    console.error(`[Database Error] ${primaryError.message}`);
    process.exit(1);
  }
};

export default connectDB;
