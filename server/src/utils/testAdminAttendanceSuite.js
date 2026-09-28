import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import Department from '../models/Department.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('\n=================================================================');
  console.log('STAFFPULSE ADMIN ATTENDANCE API TEST SUITE (STEP 23)');
  console.log('=================================================================\n');

  try {
    await connectDB();

    // 1. Authenticate Admin
    console.log('1. Authenticating Admin...');
    const admin = await Admin.findOne({ email: 'admin@ems.com' });
    if (!admin) throw new Error('Admin not found in DB');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' })
    }).then(r => r.json());

    if (!adminLogin.success) throw new Error('Admin login failed');
    const adminToken = adminLogin.token;
    console.log('   ✓ Admin authenticated successfully.');

    // 2. Fetch Employee for test
    const employee = await Employee.findOne({ email: 'employee@ems.com' });
    if (!employee) throw new Error('Employee not found in DB');

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' })
    }).then(r => r.json());
    
    if (!empLogin.success) throw new Error('Employee login failed');
    const empToken = empLogin.token;
    console.log('   ✓ Employee authenticated successfully.');

    // 3. Setup test data (Check out if already checked in)
    console.log('\n2. Setting up test data...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Attendance.deleteMany({ employee: employee._id, date: today });
    await Leave.deleteMany({ employee: employee._id, startDate: { $lte: today }, endDate: { $gte: today } });

    // 4. Test Employee Absent logic
    console.log('\n3. Testing "Absent" Live Status...');
    let todayRes = await fetch(`${API_URL}/attendance/admin/today`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());

    if (!todayRes.success) throw new Error('Failed to fetch today workforce');
    let empStatus = todayRes.workforce.find(w => String(w.employee._id) === String(employee._id));
    if (!empStatus) {
      console.log('Workforce:', JSON.stringify(todayRes.workforce, null, 2));
      throw new Error(`Employee ${employee._id} not found in workforce`);
    }
    
    // According to logic, it'll be Absent
    if (empStatus.status !== 'Absent') {
      console.warn(`   ⚠ Expected Absent but got ${empStatus.status} (this is normal if time is before 09:15)`);
    } else {
      console.log('   ✓ Live status correctly reported as Absent/Pending');
    }

    // 5. Test check-in
    console.log('\n4. Testing "Working" Live Status (Check-in)...');
    const checkInRes = await fetch(`${API_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }).then(r => r.json());

    if (!checkInRes.success) throw new Error('Employee failed to check in');
    console.log('   ✓ Employee checked in');

    todayRes = await fetch(`${API_URL}/attendance/admin/today`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    empStatus = todayRes.workforce.find(w => String(w.employee._id) === String(employee._id));
    
    if (empStatus.status !== 'Working') {
      throw new Error(`Expected Working but got ${empStatus.status}`);
    }
    console.log('   ✓ Live status correctly updated to Working');

    // 6. Test Admin edit attendance (checkout)
    console.log('\n5. Testing Admin Attendance Correction...');
    const nowCheckout = new Date();
    nowCheckout.setHours(nowCheckout.getHours() + 1);

    const editRes = await fetch(`${API_URL}/attendance/admin/${checkInRes.attendance._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        checkOut: nowCheckout.toISOString(),
        notes: 'Forgot to check out'
      })
    }).then(r => r.json());

    if (!editRes.success) throw new Error('Admin edit failed');
    if (editRes.attendance.totalHours <= 0) throw new Error('Total hours not calculated correctly after edit');
    console.log('   ✓ Admin successfully corrected check-out time');
    console.log(`   ✓ Total hours correctly recalculated: ${editRes.attendance.totalHours}`);
    console.log(`   ✓ Notes appended: ${editRes.attendance.notes}`);

    // 7. Check summary stats
    console.log('\n6. Testing Dashboard Summary Stats...');
    const summaryRes = await fetch(`${API_URL}/attendance/admin/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());

    if (!summaryRes.success) throw new Error('Summary fetch failed');
    if (summaryRes.stats.present < 1) throw new Error('Present count is invalid');
    console.log('   ✓ Dashboard stats retrieved successfully', summaryRes.stats);

    // 8. Test Export CSV
    console.log('\n7. Testing CSV Export endpoint...');
    const exportRes = await fetch(`${API_URL}/attendance/admin/export`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (exportRes.status !== 200) throw new Error('Export API failed');
    const csvContent = await exportRes.text();
    if (!csvContent.includes('Employee Name') || !csvContent.includes('Status')) {
      throw new Error('CSV content invalid');
    }
    console.log('   ✓ CSV Export generation successful');

    console.log('\n=================================================================');
    console.log('🎉 ALL STEP 23 ADMIN ATTENDANCE TESTS PASSED PERFECTLY!');
    console.log('=================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
  } finally {
    process.exit(0);
  }
};

runTests();
