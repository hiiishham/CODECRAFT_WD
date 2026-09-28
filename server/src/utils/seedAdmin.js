import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../models/Admin.js';
import { seedDepartments } from './seedDepartments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Ensures the initial Super Admin exists based on environment variables
 * Idempotent: Never duplicates or overwrites if already present
 */
export const seedInitialAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ems.com').toLowerCase().trim();
    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    // Check if an admin with the configured email already exists
    const existingAdminByEmail = await Admin.findOne({ email: adminEmail });

    if (existingAdminByEmail) {
      // Ensure role is admin and status is active
      if (existingAdminByEmail.role !== 'admin' || existingAdminByEmail.status !== 'Active') {
        existingAdminByEmail.role = 'admin';
        existingAdminByEmail.status = 'Active';
        await existingAdminByEmail.save();
      }
      console.log(`[Seed] Super Admin (${adminEmail}) verified.`);
    } else {
      // Also check if any admin exists at all
      const anyAdmin = await Admin.findOne({ role: 'admin' });
      if (!anyAdmin) {
        const createdAdmin = await Admin.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
          department: 'Executive',
          status: 'Active',
          mustChangePassword: false,
        });
        console.log(`[Seed] Initial Super Admin successfully created: ${createdAdmin.email}`);
      } else {
        console.log(`[Seed] An administrator already exists (${anyAdmin.email}).`);
      }
    }

    // Seed default departments and StaffPulse real data idempotently
    await seedDepartments();
    const { seedStaffPulse } = await import('./seedStaffPulse.js');
    await seedStaffPulse();
  } catch (error) {
    console.error(`[Seed Error] Initial Super Admin creation error:`, error.message);
  }
};

// Standalone CLI runner: node src/utils/seedAdmin.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  mongoose.connect(mongoUri).then(async () => {
    console.log('[Seed CLI] Connected to database.');
    await seedInitialAdmin();
    console.log('[Seed CLI] Seeding completed.');
    process.exit(0);
  }).catch((err) => {
    console.error('[Seed CLI Error]:', err.message);
    process.exit(1);
  });
}

export default seedInitialAdmin;
