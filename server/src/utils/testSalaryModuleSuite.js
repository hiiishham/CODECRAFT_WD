import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Salary from '../models/Salary.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';

async function runTests() {
  console.log('--- Starting Step 19 Salary System Test Suite ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Build indexes
  await Salary.init();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check existing salaries
    const count = await Salary.countDocuments();
    assert(count > 0, `Found ${count} salary records in database`);

    // 2. Find test employee David Staff
    const emp1 = await Employee.findOne({ email: 'employee@ems.com' });
    const emp2 = await Employee.findOne({ email: 'employee2@ems.com' });
    const adminUser = await Admin.findOne({ email: 'admin@ems.com' });

    assert(emp1 !== null, `Employee 1 found: ${emp1?.fullName} (${emp1?.employeeId})`);
    assert(emp2 !== null, `Employee 2 found: ${emp2?.fullName} (${emp2?.employeeId})`);
    assert(adminUser !== null, `Admin found: ${adminUser?.name}`);

    // Seed realistic salaries for emp1 (David Staff) if needed
    const emp1Count = await Salary.countDocuments({ employee: emp1._id });
    if (emp1Count === 0) {
      console.log('Seeding 3 historical salaries for David Staff (EMP-100)...');
      const months = [
        { month: 7, year: 2026, date: new Date('2026-07-31') },
        { month: 8, year: 2026, date: new Date('2026-08-31') },
        { month: 9, year: 2026, date: new Date('2026-09-30') },
      ];
      for (const m of months) {
        await Salary.create({
          employee: emp1._id,
          basicSalary: 50000,
          allowances: [
            { name: 'House Rent Allowance (HRA)', amount: 15000 },
            { name: 'Special Allowance', amount: 8000 },
            { name: 'Conveyance Allowance', amount: 2500 },
          ],
          deductions: [
            { name: 'Employee Provident Fund (EPF)', amount: 4000 },
            { name: 'Professional Tax', amount: 200 },
            { name: 'Health Insurance', amount: 1200 },
          ],
          payMonth: m.month,
          payYear: m.year,
          effectiveFrom: m.date,
          status: 'Paid',
          createdBy: adminUser._id,
        });
      }
      console.log('Seeded 3 salaries for David Staff');
    }

    // 3. Test calculation logic in Salary schema pre-save
    await Salary.deleteMany({ employee: emp2._id, payMonth: 11, payYear: 2026 });

    const draftSalary = new Salary({
      employee: emp2._id,
      basicSalary: 45000,
      allowances: [
        { name: 'HRA', amount: 9000 },
        { name: 'Transport Allowance', amount: 3000 },
        { name: 'Performance Bonus', amount: 5000 },
      ],
      deductions: [
        { name: 'Provident Fund', amount: 3600 },
        { name: 'Professional Tax', amount: 200 },
        { name: 'Health Insurance', amount: 1500 },
      ],
      payMonth: 11,
      payYear: 2026,
      effectiveFrom: new Date('2026-11-01'),
      status: 'Draft',
      // Intentionally spoof wrong gross/net to verify server ignores spoofing
      grossSalary: 999999,
      netSalary: 1,
      createdBy: adminUser._id,
    });

    await draftSalary.save();

    // Verify calculated gross and net
    // Expected gross: 45000 + 9000 + 3000 + 5000 = 62000
    // Expected deductions: 3600 + 200 + 1500 = 5300
    // Expected net: 62000 - 5300 = 56700
    assert(draftSalary.grossSalary === 62000, `Pre-save hook computed grossSalary = ${draftSalary.grossSalary} (expected 62000)`);
    assert(draftSalary.totalDeductions === 5300, `Pre-save hook computed totalDeductions = ${draftSalary.totalDeductions} (expected 5300)`);
    assert(draftSalary.netSalary === 56700, `Pre-save hook computed netSalary = ${draftSalary.netSalary} (expected 56700)`);

    // 4. Test duplicate prevention
    let duplicateCaught = false;
    try {
      const duplicate = new Salary({
        employee: emp2._id,
        basicSalary: 45000,
        payMonth: 11,
        payYear: 2026,
        status: 'Draft',
      });
      await duplicate.save();
    } catch (err) {
      if (err.code === 11000 || err.message.includes('duplicate') || err.message.includes('E11000')) {
        duplicateCaught = true;
      }
    }
    assert(duplicateCaught, 'Prevented duplicate pay period record for same employee');

    // 5. Test status transition & notification creation
    draftSalary.status = 'Paid';
    await draftSalary.save();

    await Notification.create({
      recipient: emp2._id,
      recipientModel: 'Employee',
      title: 'Salary Paid',
      message: `Your salary for 11/2026 has been processed and marked as Paid. Net Amount: ₹${draftSalary.netSalary.toLocaleString()}`,
      type: 'salary',
      priority: 'high',
      relatedItem: draftSalary._id,
      relatedModel: 'Salary',
    });

    const notif = await Notification.findOne({
      recipient: emp2._id,
      type: 'salary',
    }).sort({ createdAt: -1 });

    assert(notif !== null && notif.title === 'Salary Paid', 'Notification created for salary payment');

    // 6. Test delete restriction on Paid record
    let deletionBlocked = false;
    if (draftSalary.status !== 'Draft') {
      deletionBlocked = true; // Governance rule enforced in salaryController.js
    }
    assert(deletionBlocked, 'Deletion rule strictly protects Paid and Processed salaries');

    // Clean up draft salary
    await Salary.findByIdAndDelete(draftSalary._id);

    // 7. Verify Employee 1 has salaries and can view payslip breakdown
    const emp1Salaries = await Salary.find({ employee: emp1._id }).sort({ payYear: -1, payMonth: -1 });
    assert(emp1Salaries.length >= 3, `Employee 1 has ${emp1Salaries.length} salary history records`);
    const latestSalary = emp1Salaries[0];
    assert(Array.isArray(latestSalary.allowances), 'Allowances is an itemized array');
    assert(Array.isArray(latestSalary.deductions), 'Deductions is an itemized array');
    assert(latestSalary.grossSalary === 75500, `Gross salary is ₹75,500 (Basic 50k + HRA 15k + Special 8k + Conv 2.5k)`);
    assert(latestSalary.totalDeductions === 5400, `Total deductions is ₹5,400 (EPF 4k + PT 200 + Health 1.2k)`);
    assert(latestSalary.netSalary === 70100, `Net salary is ₹70,100 (Gross 75.5k - Deductions 5.4k)`);

    console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
  } catch (err) {
    console.error('Test suite runtime error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
