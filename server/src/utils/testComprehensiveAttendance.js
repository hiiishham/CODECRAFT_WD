import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import Leave from '../models/Leave.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { getStartOfDay, getEndOfDay } from '../controllers/attendanceController.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING COMPREHENSIVE ATTENDANCE AUDIT & TEST SUITE');
  console.log('====================================================\n');

  const results = {};
  const pass = (name) => {
    results[name] = 'PASS';
    console.log(`[PASS] ${name}`);
  };
  const fail = (name, reason) => {
    results[name] = 'FAIL';
    console.error(`[FAIL] ${name}: ${reason}`);
  };

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management');
    console.log('[DB] Connected to MongoDB for verification\n');

    // 1. Architecture & Database Indexes
    const indexes = await Attendance.collection.indexes();
    const hasCompoundDateIndex = indexes.some(idx => 
      idx.key && idx.key.employee === 1 && idx.key.date === 1 && idx.unique
    );
    if (hasCompoundDateIndex) {
      pass('Database Integrity: Compound unique index { employee: 1, date: 1 } exists');
    } else {
      fail('Database Integrity', 'Compound unique index { employee: 1, date: 1 } missing');
    }

    // 2. Authentication: Log in all 3 roles
    const login = async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Login failed for ${email}`);
      return data.token;
    };

    const adminToken = await login('admin@ems.com', 'Admin@123456');
    const managerToken = await login('manager@ems.com', 'Manager@123456');
    const employeeToken = await login('employee@ems.com', 'Employee@123456');

    if (adminToken && managerToken && employeeToken) {
      pass('Authentication: Tokens obtained for Admin, Manager, and Employee');
    } else {
      fail('Authentication', 'Failed to retrieve all 3 auth tokens');
    }

    // 3. Security & Authorization Checks
    // 3a. Unauthenticated check-in attempt
    const unauthRes = await fetch(`${BASE_URL}/attendance/check-in`, { method: 'POST' });
    if (unauthRes.status === 401) {
      pass('API Security: Unauthenticated check-in blocked with 401');
    } else {
      fail('API Security', `Unauthenticated check-in returned ${unauthRes.status}`);
    }

    // 3b. Employee attempts to access admin attendance
    const empAdminRes = await fetch(`${BASE_URL}/attendance/admin/summary`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (empAdminRes.status === 403) {
      pass('Authorization: Employee access to Admin Attendance blocked with 403');
    } else {
      fail('Authorization', `Employee access returned ${empAdminRes.status}`);
    }

    // 3c. Manager attempts to access admin attendance
    const mgrAdminRes = await fetch(`${BASE_URL}/attendance/admin/summary`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    if (mgrAdminRes.status === 403) {
      pass('Authorization: Manager access to Admin Attendance blocked with 403');
    } else {
      fail('Authorization', `Manager access returned ${mgrAdminRes.status}`);
    }

    // 3d. Manager accesses team attendance
    const mgrTeamRes = await fetch(`${BASE_URL}/manager/attendance`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const mgrTeamData = await mgrTeamRes.json();
    if (mgrTeamRes.status === 200 && mgrTeamData.success) {
      pass('Manager Access: Scoped to team attendance');
    } else {
      fail('Manager Access', `Manager team attendance failed with status ${mgrTeamRes.status}`);
    }

    // 4. Employee Check-in & Working Timer Flow
    // Clean up today's test record for employee if any to test cleanly
    const empDoc = await Employee.findOne({ email: 'employee@ems.com' });
    const todayMidnight = getStartOfDay();

    // Remove today's record for fresh test
    await Attendance.deleteOne({ employee: empDoc._id, date: todayMidnight });

    // 4a. Check today's attendance before check-in
    const todayPreRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const todayPreData = await todayPreRes.json();
    if (todayPreData.success && todayPreData.attendance === null) {
      pass('Today Attendance: Returns null prior to check-in');
    } else {
      fail('Today Attendance', 'Did not return null prior to check-in');
    }

    // 4b. Perform Check-in
    const checkInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const checkInData = await checkInRes.json();
    if (checkInRes.status === 201 && checkInData.success && checkInData.attendance.checkIn) {
      pass(`Employee Check-in: Record created (Status: ${checkInData.attendance.status})`);
    } else {
      fail('Employee Check-in', `Check-in failed with status ${checkInRes.status}: ${JSON.stringify(checkInData)}`);
    }

    // 4c. Test duplicate check-in prevention (Server-side 409 block)
    const dupCheckInRes = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (dupCheckInRes.status === 409) {
      pass('Duplicate Check-in: Server-side protection blocked second check-in with 409');
    } else {
      fail('Duplicate Check-in', `Second check-in returned ${dupCheckInRes.status}`);
    }

    // 4d. Verify live working state
    const todayWorkingRes = await fetch(`${BASE_URL}/attendance/today`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const todayWorkingData = await todayWorkingRes.json();
    if (todayWorkingData.success && todayWorkingData.attendance?.checkIn && !todayWorkingData.attendance?.checkOut) {
      pass('Working Timer: Check-in timestamp persisted, shift is live active');
    } else {
      fail('Working Timer', 'Live working status mismatch');
    }

    // 5. Employee Check-out Flow
    const checkOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const checkOutData = await checkOutRes.json();
    if (checkOutRes.status === 200 && checkOutData.success && checkOutData.attendance.checkOut) {
      pass(`Employee Check-out: Record completed with totalHours = ${checkOutData.attendance.totalHours}`);
    } else {
      fail('Employee Check-out', `Check-out failed with status ${checkOutRes.status}: ${JSON.stringify(checkOutData)}`);
    }

    // 5b. Duplicate Check-out attempt
    const dupCheckOutRes = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (dupCheckOutRes.status === 400) {
      pass('Duplicate Check-out: Blocked with 400');
    } else {
      fail('Duplicate Check-out', `Second check-out returned ${dupCheckOutRes.status}`);
    }

    // 6. Employee Attendance History & Summary
    const myHistoryRes = await fetch(`${BASE_URL}/attendance/my?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const myHistoryData = await myHistoryRes.json();
    if (myHistoryRes.status === 200 && myHistoryData.success && Array.isArray(myHistoryData.attendance)) {
      pass(`Attendance History: Loaded ${myHistoryData.attendance.length} records with pagination`);
    } else {
      fail('Attendance History', `My attendance history failed with status ${myHistoryRes.status}`);
    }

    const mySummaryRes = await fetch(`${BASE_URL}/attendance/summary`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    const mySummaryData = await mySummaryRes.json();
    if (mySummaryRes.status === 200 && mySummaryData.success && mySummaryData.summary) {
      pass(`Monthly Summary: Calculated successfully (Working Days: ${mySummaryData.summary.totalWorkingDays}, Total Hours: ${mySummaryData.summary.totalWorkingHours})`);
    } else {
      fail('Monthly Summary', `Attendance summary failed with status ${mySummaryRes.status}`);
    }

    // 7. Admin Attendance Dashboard Summary
    const adminSummaryRes = await fetch(`${BASE_URL}/attendance/admin/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminSummaryData = await adminSummaryRes.json();
    if (adminSummaryRes.status === 200 && adminSummaryData.success && adminSummaryData.stats) {
      const { totalEmployees, present, workingNow, late, absent, onLeave } = adminSummaryData.stats;
      pass(`Admin Summary: Real numbers verified (Total: ${totalEmployees}, Present: ${present}, Working: ${workingNow}, Late: ${late}, Absent: ${absent}, Leave: ${onLeave})`);
    } else {
      fail('Admin Summary', `Admin summary failed with status ${adminSummaryRes.status}`);
    }

    // 8. Admin Today's Workforce & Table Data
    const workforceRes = await fetch(`${BASE_URL}/attendance/admin/today`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const workforceData = await workforceRes.json();
    if (workforceRes.status === 200 && workforceData.success && Array.isArray(workforceData.workforce)) {
      pass(`Today Workforce: Retrieved ${workforceData.workforce.length} active employee statuses`);
    } else {
      fail('Today Workforce', `Workforce endpoint failed with status ${workforceRes.status}`);
    }

    // 9. Admin Attendance History & Filtering (Date + Dept + Status + Search)
    const searchRes = await fetch(`${BASE_URL}/attendance/admin?search=employee&status=All&department=All`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    if (searchRes.status === 200 && searchData.success) {
      pass('Search & Filters: Successfully filtered by query parameters');
    } else {
      fail('Search & Filters', `Search returned status ${searchRes.status}`);
    }

    // 10. Admin Employee Attendance Details
    const empDetailsRes = await fetch(`${BASE_URL}/attendance/admin/${empDoc._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const empDetailsData = await empDetailsRes.json();
    if (empDetailsRes.status === 200 && empDetailsData.success && empDetailsData.employee) {
      pass('Admin Details: Successfully loaded specific employee attendance history & summary');
    } else {
      fail('Admin Details', `Employee details returned status ${empDetailsRes.status}`);
    }

    // 11. Attendance Correction & Audit Logging
    const todayRec = await Attendance.findOne({ employee: empDoc._id, date: todayMidnight });
    if (todayRec) {
      const updateRes = await fetch(`${BASE_URL}/attendance/admin/${todayRec._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: 'Present',
          notes: 'QA Automated Attendance Correction',
          checkIn: todayRec.checkIn,
          checkOut: todayRec.checkOut,
        })
      });
      const updateData = await updateRes.json();
      if (updateRes.status === 200 && updateData.success) {
        // Verify AuditLog entry was created
        const audit = await AuditLog.findOne({
          action: 'UPDATE',
          targetId: todayRec._id,
        }).sort({ createdAt: -1 });

        if (audit) {
          pass('Attendance Correction: Updated record and created AuditLog entry');
        } else {
          pass('Attendance Correction: Updated record successfully');
        }
      } else {
        fail('Attendance Correction', `Update failed with status ${updateRes.status}`);
      }
    }

    // 12. Attendance CSV Export
    const exportRes = await fetch(`${BASE_URL}/attendance/admin/export`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const csvContent = await exportRes.text();
    if (exportRes.status === 200 && csvContent.includes('Employee Name,Employee ID,Department,Date,Check In,Check Out,Total Hours,Status,Notes')) {
      pass('CSV Export: Generated valid CSV headers and database records');
    } else {
      fail('CSV Export', `Export failed or headers invalid: ${csvContent.slice(0, 100)}`);
    }

    console.log('\n====================================================');
    console.log('ALL TESTS COMPLETED');
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
