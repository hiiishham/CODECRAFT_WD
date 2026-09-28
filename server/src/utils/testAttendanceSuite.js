import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000/api';

async function runAttendanceTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING EMPLOYEE ATTENDANCE & DASHBOARD TEST SUITE (STEP 15)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
    await mongoose.connect(mongoUri);

    // ----------------------------------------------------------------
    // 1. Employee Authentication & Profile Payload
    // ----------------------------------------------------------------
    console.log('\n--- 1. Authenticating Employee & Verifying Profile Enrichment ---');
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    });
    const empLoginData = await empLoginRes.json();
    assert(empLoginRes.status === 200, 'Employee logs in successfully with 200 OK');
    assert(!!empLoginData.token, 'Employee receives valid JWT token');
    assert(empLoginData.user.role === 'employee', 'User role is employee');
    assert(!!empLoginData.user.employeeId, 'User payload contains employeeId');
    assert(!!empLoginData.user.department, 'User payload contains department');
    assert(!!empLoginData.user.designation, 'User payload contains designation');

    const empToken = empLoginData.token;

    // Verify GET /api/auth/me preserves these fields
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK');
    assert(meData.user.employeeId === empLoginData.user.employeeId, 'GET /api/auth/me preserves employeeId');
    assert(meData.user.department === empLoginData.user.department, 'GET /api/auth/me preserves department');
    assert(meData.user.designation === empLoginData.user.designation, 'GET /api/auth/me preserves designation');

    // ----------------------------------------------------------------
    // 2. Setup Clean State For Today's Attendance
    // ----------------------------------------------------------------
    console.log('\n--- 2. Setting Up Clean State for Today ---');
    const employeeDoc = await Employee.findOne({ email: 'employee@ems.com' });
    assert(!!employeeDoc, 'Found linked Employee record for employee@ems.com in database');

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // Clean up any existing attendance record for today to ensure deterministic test
    await Attendance.deleteMany({
      employee: employeeDoc._id,
      date: todayMidnight,
    });

    const initialTodayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const initialTodayData = await initialTodayRes.json();
    assert(initialTodayRes.status === 200, 'GET /api/attendance/today returns 200 OK');
    assert(initialTodayData.attendance === null, 'Initially no attendance record exists for today');

    // ----------------------------------------------------------------
    // 3. Testing Check-Out Before Check-In
    // ----------------------------------------------------------------
    console.log('\n--- 3. Testing Check-Out Before Check-In Prevention ---');
    const earlyCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const earlyCheckOutData = await earlyCheckOutRes.json();
    assert(earlyCheckOutRes.status === 400, 'Checking out before check in is rejected with 400 Bad Request');
    assert(
      earlyCheckOutData.message === 'You cannot check out before checking in.',
      'Returns exact error message: "You cannot check out before checking in."'
    );

    // ----------------------------------------------------------------
    // 4. Testing Check-In
    // ----------------------------------------------------------------
    console.log('\n--- 4. Testing Shift Check-In ---');
    const checkInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const checkInData = await checkInRes.json();
    assert(checkInRes.status === 201, 'Check in succeeds with 201 Created');
    assert(!!checkInData.attendance, 'Returns created attendance object');
    assert(!!checkInData.attendance.checkIn, 'Check-in timestamp is set by server');
    assert(checkInData.attendance.checkOut === null, 'Check-out timestamp is initially null');
    assert(checkInData.attendance.totalHours === 0, 'Initial totalHours is 0');
    assert(['Present', 'Late'].includes(checkInData.attendance.status), `Status is determined as ${checkInData.attendance.status}`);

    // ----------------------------------------------------------------
    // 5. Testing Duplicate Check-In Prevention
    // ----------------------------------------------------------------
    console.log('\n--- 5. Testing Duplicate Check-In Prevention ---');
    const dupCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const dupCheckInData = await dupCheckInRes.json();
    assert(dupCheckInRes.status === 409, 'Duplicate check in rejected with 409 Conflict');
    assert(
      dupCheckInData.message === 'You are already checked in today.',
      'Returns exact message: "You are already checked in today."'
    );

    // ----------------------------------------------------------------
    // 6. Testing GET /api/attendance/today While Working
    // ----------------------------------------------------------------
    console.log('\n--- 6. Testing GET /api/attendance/today While Working ---');
    const midTodayRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const midTodayData = await midTodayRes.json();
    assert(midTodayRes.status === 200, 'GET /api/attendance/today returns 200 OK');
    assert(!!midTodayData.attendance, 'Returns active attendance object');
    assert(midTodayData.attendance.checkOut === null, 'Attendance is active (checkOut is null)');

    // ----------------------------------------------------------------
    // 7. Testing Check-Out
    // ----------------------------------------------------------------
    console.log('\n--- 7. Testing Shift Check-Out ---');
    const checkOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const checkOutData = await checkOutRes.json();
    assert(checkOutRes.status === 200, 'Check out succeeds with 200 OK');
    assert(!!checkOutData.attendance.checkOut, 'Check-out timestamp is set by server');
    assert(typeof checkOutData.attendance.totalHours === 'number', 'Calculated total working hours is a number');

    // ----------------------------------------------------------------
    // 8. Testing Duplicate Check-Out Prevention
    // ----------------------------------------------------------------
    console.log('\n--- 8. Testing Duplicate Check-Out Prevention ---');
    const dupCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const dupCheckOutData = await dupCheckOutRes.json();
    assert(dupCheckOutRes.status === 400, 'Duplicate check out rejected with 400 Bad Request');
    assert(
      dupCheckOutData.message === 'You have already checked out today.',
      'Returns exact message: "You have already checked out today."'
    );

    // ----------------------------------------------------------------
    // 9. Testing Attendance Summary API
    // ----------------------------------------------------------------
    console.log('\n--- 9. Testing GET /api/attendance/summary ---');
    const summaryRes = await fetch(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200, 'GET /api/attendance/summary returns 200 OK');
    assert('totalWorkingDays' in summaryData.summary, 'Summary includes totalWorkingDays');
    assert('presentDays' in summaryData.summary, 'Summary includes presentDays');
    assert('lateDays' in summaryData.summary, 'Summary includes lateDays');
    assert('halfDays' in summaryData.summary, 'Summary includes halfDays');
    assert('leaveDays' in summaryData.summary, 'Summary includes leaveDays');
    assert('totalWorkingHours' in summaryData.summary, 'Summary includes totalWorkingHours');
    assert('averageWorkingHours' in summaryData.summary, 'Summary includes averageWorkingHours');
    assert(summaryData.summary.totalWorkingDays >= 1, 'Summary reflects at least 1 working day logged');

    // ----------------------------------------------------------------
    // 10. Testing My Attendance History API
    // ----------------------------------------------------------------
    console.log('\n--- 10. Testing GET /api/attendance/my ---');
    const historyRes = await fetch(`${BASE_URL}/attendance/my`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const historyData = await historyRes.json();
    assert(historyRes.status === 200, 'GET /api/attendance/my returns 200 OK');
    assert(Array.isArray(historyData.attendance), 'Returns attendance records array');
    assert(historyData.count >= 1, 'Attendance count reflects at least 1 record');
    assert(historyData.attendance[0].employee === employeeDoc._id.toString(), 'Attendance record is tied to authenticated employee');

    // Test with status filter
    const filterRes = await fetch(`${BASE_URL}/attendance/my?status=Present`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    assert(filterRes.status === 200, 'GET /api/attendance/my with status filter returns 200 OK');

    // ----------------------------------------------------------------
    // 11. Testing Unauthenticated Request Security
    // ----------------------------------------------------------------
    console.log('\n--- 11. Testing Unauthenticated Access Security ---');
    const unauthCheckIn = await fetch(`${BASE_URL}/attendance/check-in`, { method: 'POST' });
    assert(unauthCheckIn.status === 401, 'Unauthenticated check in rejected with 401 Unauthorized');

    const unauthToday = await fetch(`${BASE_URL}/attendance/today`);
    assert(unauthToday.status === 401, 'Unauthenticated get today rejected with 401 Unauthorized');

    const unauthHistory = await fetch(`${BASE_URL}/attendance/my`);
    assert(unauthHistory.status === 401, 'Unauthenticated get history rejected with 401 Unauthorized');

    // ----------------------------------------------------------------
    // Summary
    // ----------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`ATTENDANCE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Test Execution Error:', error);
    process.exit(1);
  }
}

runAttendanceTests();
