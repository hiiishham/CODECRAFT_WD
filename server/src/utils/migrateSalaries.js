import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

export const migrateSalaries = async () => {
  const isDirectRun = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log('[Migration] Connected to MongoDB at', MONGODB_URI);
  }

  const salariesCollection = mongoose.connection.collection('salaries');
  const salaries = await salariesCollection.find({}).toArray();
  console.log(`[Migration] Found ${salaries.length} salary records to inspect.`);

  let updatedCount = 0;

  for (const doc of salaries) {
    const updates = {};
    let needsUpdate = false;

    // 1. Migrate allowances if numeric
    if (typeof doc.allowances === 'number') {
      updates.allowances = doc.allowances > 0
        ? [{ name: 'Standard Allowance', amount: doc.allowances }]
        : [];
      needsUpdate = true;
    } else if (!Array.isArray(doc.allowances)) {
      updates.allowances = [];
      needsUpdate = true;
    }

    // 2. Migrate deductions if numeric
    if (typeof doc.deductions === 'number') {
      updates.deductions = doc.deductions > 0
        ? [{ name: 'Standard Deduction', amount: doc.deductions }]
        : [];
      needsUpdate = true;
    } else if (!Array.isArray(doc.deductions)) {
      updates.deductions = [];
      needsUpdate = true;
    }

    const currentAllowances = updates.allowances || doc.allowances || [];
    const currentDeductions = updates.deductions || doc.deductions || [];

    const totalAllowances = currentAllowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const totalDeductions = currentDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const basicSalary = Number(doc.basicSalary) || 0;
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    if (doc.grossSalary === undefined || doc.grossSalary === null) {
      updates.grossSalary = grossSalary;
      needsUpdate = true;
    }

    if (doc.totalDeductions === undefined || doc.totalDeductions === null) {
      updates.totalDeductions = totalDeductions;
      needsUpdate = true;
    }

    if (doc.netSalary === undefined || doc.netSalary === null || doc.netSalary !== netSalary) {
      updates.netSalary = netSalary;
      needsUpdate = true;
    }

    // 3. Pay month and year
    const effectiveDate = doc.effectiveFrom ? new Date(doc.effectiveFrom) : (doc.createdAt ? new Date(doc.createdAt) : new Date());
    if (!doc.payMonth) {
      updates.payMonth = effectiveDate.getMonth() + 1;
      needsUpdate = true;
    }

    if (!doc.payYear) {
      updates.payYear = effectiveDate.getFullYear();
      needsUpdate = true;
    }

    // 4. Status
    if (!doc.status) {
      updates.status = 'Paid';
      needsUpdate = true;
    }

    if (needsUpdate) {
      await salariesCollection.updateOne(
        { _id: doc._id },
        { $set: updates }
      );
      updatedCount++;
    }
  }

  console.log(`[Migration] Successfully upgraded ${updatedCount} salary records.`);

  if (isDirectRun) {
    await mongoose.disconnect();
    console.log('[Migration] Disconnected from MongoDB.');
  }

  return { total: salaries.length, updated: updatedCount };
};

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  migrateSalaries().catch((err) => {
    console.error('[Migration Error]:', err);
    process.exit(1);
  });
}

export default migrateSalaries;
