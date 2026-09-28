import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Department from '../models/Department.js';

// Setup __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const defaultDepartments = [
  {
    name: 'Engineering',
    description: 'Software development, engineering architecture, and technology infrastructure.',
    status: 'Active',
  },
  {
    name: 'HR',
    description: 'Talent acquisition, employee welfare, organizational development, and compliance.',
    status: 'Active',
  },
  {
    name: 'Design',
    description: 'User interface, product design, brand systems, and creative user experience.',
    status: 'Active',
  },
  {
    name: 'Sales',
    description: 'Business development, client relationships, revenue growth, and partnerships.',
    status: 'Active',
  },
  {
    name: 'Marketing',
    description: 'Brand growth, digital campaigns, product marketing, and public relations.',
    status: 'Active',
  },
  {
    name: 'Finance',
    description: 'Financial accounting, corporate budgeting, auditing, and payroll management.',
    status: 'Active',
  },
];

export const seedDepartments = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';

    if (mongoose.connection.readyState !== 1) {
      console.log('[Department Seed] Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('[Department Seed] Connected to database.');
    }

    console.log('--------------------------------------------------');
    for (const dept of defaultDepartments) {
      const exists = await Department.findOne({
        name: { $regex: `^${dept.name}$`, $options: 'i' },
      });

      if (exists) {
        console.log(`[Department Seed] Department "${dept.name}" already exists. Skipped.`);
      } else {
        const created = await Department.create(dept);
        console.log(`[Department Seed] Created Department: "${created.name}"`);
      }
    }
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error(`[Department Seed Error]: ${error.message}`);
    throw error;
  }
};

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDepartments()
    .then(() => {
      console.log('[Department Seed] Seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Department Seed Error]:', err);
      process.exit(1);
    });
}
