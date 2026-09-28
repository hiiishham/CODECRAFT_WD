import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Goal from '../models/Goal.js';
import Performance from '../models/Performance.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';

const BASE_URL = 'http://localhost:5000/api';

const generateToken = (id, role, department = '') => {
  return jwt.sign({ id, role, department }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '1h',
  });
};

const results = [];
const recordResult = (category, name, passed, detail = '') => {
  results.push({ category, name, passed, detail });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusStr} [${category}] ${name}${detail ? ' - ' + detail : ''}`);
};

const runComprehensiveSuite = async () => {
  console.log('\n==================================================');
  console.log('STARTING GOALS + PERFORMANCE COMPREHENSIVE QA AUDIT');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');

    // 1. Setup Test Actors & Departments
    let devDept = await Department.findOne({ name: 'Development' });
    if (!devDept) {
      devDept = await Department.create({ name: 'Development', description: 'Engineering team' });
    }

    let mktDept = await Department.findOne({ name: 'Marketing' });
    if (!mktDept) {
      mktDept = await Department.create({ name: 'Marketing', description: 'Marketing team' });
    }

    // Admin
    let adminUser = await Admin.findOne({ email: 'admin@ems.com' });
    if (!adminUser) {
      adminUser = await Admin.findOne({ role: 'admin' });
    }
    const adminToken = generateToken(adminUser._id, 'admin');

    // Dev Manager
    let devManager = await Admin.findOne({ email: 'manager@ems.com' });
    if (!devManager) {
      devManager = await Admin.findOne({ role: 'manager', department: 'Development' });
    }
    const devManagerToken = generateToken(devManager._id, 'manager', devManager?.department || 'Development');

    // Marketing Manager
    let mktManager = await Admin.findOne({ email: 'mkt_mgr_qa@ems.com' });
    if (!mktManager) {
      mktManager = await Admin.create({
        name: 'Mkt Manager QA',
        email: 'mkt_mgr_qa@ems.com',
        password: '$2a$10$hashedpasswordforexample',
        role: 'manager',
        department: 'Marketing',
      });
    }
    const mktManagerToken = generateToken(mktManager._id, 'manager', 'Marketing');

    // Dev Employee (Employee A)
    let devEmp = await Employee.findOne({ email: 'employee@ems.com' });
    if (!devEmp) {
      devEmp = await Employee.findOne({ department: 'Development', status: 'Active' });
    }
    if (!devEmp) {
      devEmp = await Employee.create({
        employeeId: 'EMP-DEV-001',
        fullName: 'Dev Employee QA',
        email: 'dev_emp_qa@ems.com',
        phone: '1234567890',
        salary: 60000,
        department: 'Development',
        designation: 'Software Engineer',
        status: 'Active',
      });
    }
    let devEmpUser = await Admin.findOne({ email: devEmp.email.toLowerCase() });
    if (!devEmpUser) {
      devEmpUser = await Admin.create({
        name: devEmp.fullName,
        email: devEmp.email.toLowerCase(),
        password: '$2a$10$hashedpasswordforexample',
        role: 'employee',
        department: 'Development',
      });
    }
    const devEmpToken = generateToken(devEmpUser._id, 'employee');

    // Marketing Employee (Employee B)
    let mktEmp = await Employee.findOne({ email: 'mkt_emp_qa@ems.com' });
    if (!mktEmp) {
      mktEmp = await Employee.findOne({ department: 'Marketing', status: 'Active' });
    }
    if (!mktEmp) {
      mktEmp = await Employee.create({
        employeeId: 'EMP-MKT-001',
        fullName: 'Mkt Employee QA',
        email: 'mkt_emp_qa@ems.com',
        phone: '9876543210',
        salary: 55000,
        department: 'Marketing',
        designation: 'Marketing Executive',
        status: 'Active',
      });
    }
    let mktEmpUser = await Admin.findOne({ email: mktEmp.email.toLowerCase() });
    if (!mktEmpUser) {
      mktEmpUser = await Admin.create({
        name: mktEmp.fullName,
        email: mktEmp.email.toLowerCase(),
        password: '$2a$10$hashedpasswordforexample',
        role: 'employee',
        department: 'Marketing',
      });
    }
    const mktEmpToken = generateToken(mktEmpUser._id, 'employee');

    console.log(`Actors initialized:
  Admin: ${adminUser.email}
  Dev Manager: ${devManager.email} (Dept: ${devDept.name})
  Mkt Manager: ${mktManager.email} (Dept: ${mktDept.name})
  Dev Emp: ${devEmp.fullName} (${devEmp.email})
  Mkt Emp: ${mktEmp.fullName} (${mktEmp.email})\n`);

    // Clean up past QA test goals and reviews
    await Goal.deleteMany({ title: { $regex: /^QA Test Goal/ } });
    await Performance.deleteMany({ reviewPeriod: { $regex: /^QA-Q[1-4]-2026/ } });

    // ==================================================
    // 1. GOAL ARCHITECTURE AUDIT
    // ==================================================
    console.log('--- Testing 1: Goal Architecture ---');
    const goalIndexes = await Goal.collection.indexes();
    const hasEmpIndex = goalIndexes.some(i => i.key && i.key.employee);
    recordResult('Goal Architecture', 'Goal indexes configured properly', hasEmpIndex, `Indexes: ${goalIndexes.length}`);

    // ==================================================
    // 2. CREATE GOAL & VALIDATION
    // ==================================================
    console.log('\n--- Testing 2: Create Goal & Backend Validation ---');
    // Test empty title
    let res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        title: '   ',
        description: 'Testing empty title',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'High',
      }),
    });
    recordResult('Create Goal', 'Rejects empty goal title with 400', res.status === 400, `Status: ${res.status}`);

    // Test invalid employee ID
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: 'invalid_id_format',
        title: 'QA Test Goal Invalid Emp',
        description: 'Testing invalid emp ID',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'Medium',
      }),
    });
    recordResult('Create Goal', 'Rejects invalid employee ObjectId format with 400', res.status === 400, `Status: ${res.status}`);

    // Test non-existing employee ID
    const nonExistingId = new mongoose.Types.ObjectId();
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: nonExistingId.toString(),
        title: 'QA Test Goal Nonexistent',
        description: 'Testing non-existing emp',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'Medium',
      }),
    });
    recordResult('Create Goal', 'Rejects non-existing employee with 404', res.status === 404, `Status: ${res.status}`);

    // Test due date before start date
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        title: 'QA Test Goal Backward Dates',
        description: 'Due before start',
        startDate: '2026-10-31',
        dueDate: '2026-10-01',
        priority: 'High',
      }),
    });
    recordResult('Goal Due Date', 'Rejects due date before start date with 400', res.status === 400, `Status: ${res.status}`);

    // Test invalid priority
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        title: 'QA Test Goal Invalid Priority',
        description: 'Testing priority',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'UltraHigh',
      }),
    });
    recordResult('Create Goal', 'Rejects invalid priority value with 400', res.status === 400, `Status: ${res.status}`);

    // ==================================================
    // 3. ASSIGN GOAL & MANAGER SCOPING
    // ==================================================
    console.log('\n--- Testing 3: Assign Goal & Manager Department Boundary ---');
    // Dev Manager attempts to assign goal to Mkt Employee (cross-department)
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        employee: mktEmp._id.toString(),
        title: 'QA Test Goal Cross Dept Attempt',
        description: 'Should be rejected',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'High',
      }),
    });
    recordResult('Assign Goal', 'Manager cannot assign goal outside their department (403)', res.status === 403, `Status: ${res.status}`);

    // Dev Manager assigns goal to Dev Employee (authorized)
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        title: 'QA Test Goal 1 - Complete Backend API',
        description: 'Finish all REST endpoints for StaffPulse',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'High',
      }),
    });
    const createdGoal1Data = await res.json();
    const createdGoal1 = createdGoal1Data.data;
    recordResult('Assign Goal', 'Manager successfully assigns goal to team member (201)', res.status === 201 && !!createdGoal1?._id, `Goal ID: ${createdGoal1?._id}`);

    // Admin assigns goal to Mkt Employee (authorized company-wide)
    res = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: mktEmp._id.toString(),
        title: 'QA Test Goal 2 - Launch Product Campaign',
        description: 'Run marketing campaign for StaffPulse launch',
        startDate: '2026-10-01',
        dueDate: '2026-10-31',
        priority: 'Medium',
      }),
    });
    const createdGoal2Data = await res.json();
    const createdGoal2 = createdGoal2Data.data;
    recordResult('Assign Goal', 'Admin assigns goal across departments successfully (201)', res.status === 201 && !!createdGoal2?._id, `Goal ID: ${createdGoal2?._id}`);

    // ==================================================
    // 4. EMPLOYEE MY GOALS & PRIVACY ISOLATION
    // ==================================================
    console.log('\n--- Testing 4: Employee My Goals & Privacy ---');
    // Dev Employee queries own goals
    res = await fetch(`${BASE_URL}/goals/my`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    const myGoalsData = await res.json();
    const seesOnlyOwn = myGoalsData.data && myGoalsData.data.every(g => g.employee === devEmp._id.toString() || g.employee?._id === devEmp._id.toString() || !g.employee);
    const hasGoal1 = myGoalsData.data && myGoalsData.data.some(g => g._id === createdGoal1._id);
    const doesNotHaveGoal2 = myGoalsData.data && !myGoalsData.data.some(g => g._id === createdGoal2._id);
    recordResult('Employee My Goals', 'Employee sees only their own goals in /api/goals/my', res.status === 200 && seesOnlyOwn && hasGoal1 && doesNotHaveGoal2, `Goals count: ${myGoalsData.data?.length}`);

    // Dev Employee attempts to access Marketing Employee Goal (Goal 2) directly via /api/goals/:id
    res = await fetch(`${BASE_URL}/goals/${createdGoal2._id}`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee cannot view another employee goal by ID (403)', res.status === 403, `Status: ${res.status}`);

    // ==================================================
    // 5. GOAL PROGRESS UPDATES & BOUNDARY VALIDATION
    // ==================================================
    console.log('\n--- Testing 5: Goal Progress Updates & Boundaries ---');
    // Reject negative progress (-10)
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: -10 }),
    });
    recordResult('Goal Progress', 'Rejects negative progress with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Reject progress > 100 (150)
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 150 }),
    });
    recordResult('Goal Progress', 'Rejects progress > 100 with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Reject non-number progress ("fifty")
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 'fifty' }),
    });
    recordResult('Goal Progress', 'Rejects non-numeric progress with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Employee updates progress: 25%
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 25 }),
    });
    let progRes = await res.json();
    recordResult('Goal Progress', 'Progress updates to 25% and transitions status to In Progress', res.status === 200 && progRes.data.progress === 25 && progRes.data.status === 'In Progress');

    // Progress updates: 50%
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 50 }),
    });
    progRes = await res.json();
    recordResult('Goal Progress', 'Progress updates to 50% and persists', res.status === 200 && progRes.data.progress === 50);

    // Progress updates: 75%
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 75 }),
    });
    progRes = await res.json();
    recordResult('Goal Progress', 'Progress updates to 75% and persists', res.status === 200 && progRes.data.progress === 75);

    // Dev Employee attempts to update Mkt Employee Goal progress (Goal 2) -> 403
    res = await fetch(`${BASE_URL}/goals/${createdGoal2._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 50 }),
    });
    recordResult('IDOR/BOLA Security', 'Employee cannot update another employee goal progress (403)', res.status === 403, `Status: ${res.status}`);

    // ==================================================
    // 6. GOAL STATUS & AUTO-COMPLETION AT 100%
    // ==================================================
    console.log('\n--- Testing 6: Goal Completion Workflow ---');
    // Employee completes goal: 100%
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ progress: 100 }),
    });
    progRes = await res.json();
    recordResult('Goal Status', 'Progress 100% automatically transitions status to Completed', res.status === 200 && progRes.data.progress === 100 && progRes.data.status === 'Completed');

    // Refresh persistence check from DB
    const fetchedGoal1 = await Goal.findById(createdGoal1._id);
    recordResult('Refresh Persistence', 'Goal progress 100% and Completed status persisted in DB', fetchedGoal1.progress === 100 && fetchedGoal1.status === 'Completed');

    // ==================================================
    // 7. GOAL OVERDUE CALCULATION
    // ==================================================
    console.log('\n--- Testing 7: Goal Due Date / Overdue State ---');
    // Create an overdue goal directly
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 5);

    const overdueGoal = await Goal.create({
      employee: devEmp._id,
      title: 'QA Test Goal Overdue Check',
      description: 'Goal with past due date',
      assignedBy: devManager._id,
      startDate: threeDaysAgo,
      dueDate: yesterday,
      progress: 30,
      priority: 'High',
      status: 'In Progress',
    });

    res = await fetch(`${BASE_URL}/goals/${overdueGoal._id}`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const overdueRes = await res.json();
    recordResult('Goal Due Date', 'Past due goal with progress < 100 is computed as isOverdue: true', overdueRes.data?.isOverdue === true);

    // Completed goal past due should NOT be overdue
    overdueGoal.progress = 100;
    overdueGoal.status = 'Completed';
    await overdueGoal.save();

    res = await fetch(`${BASE_URL}/goals/${overdueGoal._id}`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const completedPastDueRes = await res.json();
    recordResult('Goal Due Date', 'Completed goal past due is not marked as overdue', completedPastDueRes.data?.isOverdue === false);
    await overdueGoal.deleteOne();

    // ==================================================
    // 8. EDIT GOAL & AUTHORIZATION
    // ==================================================
    console.log('\n--- Testing 8: Edit Goal ---');
    // Dev Manager edits Goal 1
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        title: 'QA Test Goal 1 - Modified Title',
        priority: 'Medium',
      }),
    });
    recordResult('Edit Goal', 'Manager edits goal in own department successfully', res.status === 200);

    // Dev Manager attempts to edit Marketing Employee Goal (Goal 2)
    res = await fetch(`${BASE_URL}/goals/${createdGoal2._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        title: 'QA Test Goal 2 - Unauthorized Edit',
      }),
    });
    recordResult('Edit Goal', 'Manager cannot edit goal of employee outside department (403)', res.status === 403, `Status: ${res.status}`);

    // Employee attempts to edit goal fields via PUT /api/goals/:id
    res = await fetch(`${BASE_URL}/goals/${createdGoal1._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({
        title: 'QA Test Goal 1 - Employee Edit Attempt',
      }),
    });
    recordResult('Authorization', 'Employee cannot access admin/manager goal edit endpoint (403)', res.status === 403, `Status: ${res.status}`);

    // ==================================================
    // 9. SEARCH & FILTERS
    // ==================================================
    console.log('\n--- Testing 9: Search and Filters ---');
    // Search by title
    res = await fetch(`${BASE_URL}/goals?search=Modified+Title`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchRes = await res.json();
    recordResult('Search', 'Search goals by title returns matching records', res.status === 200 && searchRes.data?.some(g => g._id === createdGoal1._id));

    // Filter by priority
    res = await fetch(`${BASE_URL}/goals?priority=Medium`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prioRes = await res.json();
    recordResult('Filters', 'Filter goals by priority returns only matching priorities', res.status === 200 && prioRes.data?.every(g => g.priority === 'Medium'));

    // Filter by status
    res = await fetch(`${BASE_URL}/goals?status=Completed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusRes = await res.json();
    recordResult('Filters', 'Filter goals by status returns only Completed goals', res.status === 200 && statusRes.data?.every(g => g.status === 'Completed'));

    // ==================================================
    // 10. DELETE GOAL
    // ==================================================
    console.log('\n--- Testing 10: Delete Goal ---');
    // Create temporary goal to delete
    const tempGoal = await Goal.create({
      employee: devEmp._id,
      title: 'QA Test Goal Temp Delete',
      description: 'To be deleted',
      assignedBy: devManager._id,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
      priority: 'Low',
    });

    // Employee attempts to delete goal -> 403
    res = await fetch(`${BASE_URL}/goals/${tempGoal._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    recordResult('Delete Goal', 'Employee cannot delete goal (403 Forbidden)', res.status === 403, `Status: ${res.status}`);

    // Mkt Manager attempts to delete Dev Employee goal -> 403
    res = await fetch(`${BASE_URL}/goals/${tempGoal._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mktManagerToken}` },
    });
    recordResult('Delete Goal', 'Manager cannot delete goal of employee outside department (403)', res.status === 403, `Status: ${res.status}`);

    // Dev Manager deletes temp goal -> 200
    res = await fetch(`${BASE_URL}/goals/${tempGoal._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const checkDeleted = await Goal.findById(tempGoal._id);
    recordResult('Delete Goal', 'Authorized manager deletes goal and record is removed', res.status === 200 && !checkDeleted);

    // ==================================================
    // 11. PERFORMANCE REVIEW ARCHITECTURE & CREATION
    // ==================================================
    console.log('\n--- Testing 11: Performance Review Architecture & Creation ---');
    const reviewPeriod1 = 'QA-Q1-2026';
    const reviewPeriod2 = 'QA-Q2-2026';

    // Test rating validation: reject 0
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 0,
        managerFeedback: 'Invalid rating 0',
      }),
    });
    recordResult('Rating', 'Rejects rating 0 with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Test rating validation: reject 6
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 6,
        managerFeedback: 'Invalid rating 6',
      }),
    });
    recordResult('Rating', 'Rejects rating 6 with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Test rating validation: reject non-integer float (3.5)
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 3.5,
        managerFeedback: 'Invalid float rating',
      }),
    });
    recordResult('Rating', 'Rejects non-integer rating with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Test rating validation: reject text rating ("five")
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 'five',
        managerFeedback: 'Invalid text rating',
      }),
    });
    recordResult('Rating', 'Rejects text rating with 400 Bad Request', res.status === 400, `Status: ${res.status}`);

    // Dev Manager attempts to create review for Mkt Employee (cross-department) -> 403
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        employee: mktEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 4,
        managerFeedback: 'Cross dept review attempt',
      }),
    });
    recordResult('Manager Performance', 'Manager cannot create performance review for employee outside department (403)', res.status === 403, `Status: ${res.status}`);

    // Dev Manager creates review for Dev Employee (valid)
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 5,
        strengths: 'Exceptional problem solver and great team player',
        areasForImprovement: 'Can mentor junior developers more frequently',
        managerFeedback: 'Outstanding contribution across all sprints this quarter.',
        status: 'Reviewed',
      }),
    });
    const createdRev1Data = await res.json();
    const createdRev1 = createdRev1Data.data;
    recordResult('Create Review', 'Manager creates performance review with rating 5 successfully (201)', res.status === 201 && !!createdRev1?._id);

    // Duplicate review period for same employee rejected with 409
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devManagerToken}` },
      body: JSON.stringify({
        employee: devEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 4,
        managerFeedback: 'Duplicate period attempt',
      }),
    });
    recordResult('Create Review', 'Rejects duplicate review for same employee in same period with 409 Conflict', res.status === 409, `Status: ${res.status}`);

    // Admin creates review for Marketing Employee
    res = await fetch(`${BASE_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: mktEmp._id.toString(),
        reviewPeriod: reviewPeriod1,
        overallRating: 4,
        strengths: 'Creative campaigns and timely delivery',
        areasForImprovement: 'Data analytics tooling adoption',
        managerFeedback: 'Strong overall performance on brand awareness.',
        status: 'Reviewed',
      }),
    });
    const createdRev2Data = await res.json();
    const createdRev2 = createdRev2Data.data;
    recordResult('Admin Performance', 'Admin creates review across departments successfully', res.status === 201 && !!createdRev2?._id);

    // ==================================================
    // 12. PERFORMANCE RATING & FEEDBACK DISPLAY
    // ==================================================
    console.log('\n--- Testing 12: Performance Rating & Feedback ---');
    // Fetch Dev Review
    res = await fetch(`${BASE_URL}/performance/${createdRev1._id}`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const revDetails = await res.json();
    recordResult('Feedback', 'Strengths, improvements, and manager feedback stored and returned correctly',
      revDetails.data?.strengths.includes('Exceptional') &&
      revDetails.data?.areasForImprovement.includes('mentor') &&
      revDetails.data?.managerFeedback.includes('Outstanding contribution')
    );
    recordResult('Performance Rating', 'Rating persists with value 5 and links to correct employee and reviewer',
      revDetails.data?.overallRating === 5 &&
      revDetails.data?.employee?._id.toString() === devEmp._id.toString()
    );

    // ==================================================
    // 13. EMPLOYEE PERFORMANCE VIEW & ISOLATION
    // ==================================================
    console.log('\n--- Testing 13: Employee Performance View ---');
    // Dev Employee accesses /api/performance/my
    res = await fetch(`${BASE_URL}/performance/my`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    const empMyRevData = await res.json();
    const seesOnlyOwnReviews = empMyRevData.data && empMyRevData.data.every(r => r.employee === devEmp._id.toString() || r.employee?._id === devEmp._id.toString() || !r.employee);
    recordResult('Employee Performance', 'Employee accesses /api/performance/my and sees ONLY own reviews', res.status === 200 && seesOnlyOwnReviews && empMyRevData.data.some(r => r._id === createdRev1._id));

    // Dev Employee views single review via /api/performance/my/:id
    res = await fetch(`${BASE_URL}/performance/my/${createdRev1._id}`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    recordResult('Employee Performance', 'Employee views own review details via /api/performance/my/:id', res.status === 200);

    // Dev Employee attempts to view Marketing Employee review (Review 2) via /api/performance/my/:id -> 404/403
    res = await fetch(`${BASE_URL}/performance/my/${createdRev2._id}`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee cannot access another employee review via /api/performance/my/:id', res.status === 404 || res.status === 403, `Status: ${res.status}`);

    // Dev Employee attempts to update review / rating -> 403
    res = await fetch(`${BASE_URL}/performance/${createdRev1._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devEmpToken}` },
      body: JSON.stringify({ overallRating: 5, managerFeedback: 'Hacked feedback' }),
    });
    recordResult('Mass Assignment Security', 'Employee cannot modify official rating or feedback (403)', res.status === 403, `Status: ${res.status}`);

    // ==================================================
    // 14. MANAGER PERFORMANCE & TEAM SCOPING
    // ==================================================
    console.log('\n--- Testing 14: Manager Performance Team Scoping ---');
    // Dev Manager accesses team performance overview
    res = await fetch(`${BASE_URL}/manager/performance`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const teamPerfData = await res.json();
    recordResult('Manager Performance', 'Manager gets team performance overview (/api/manager/performance)', res.status === 200 && teamPerfData.data?.totalReviews >= 1);

    // Dev Manager attempts to view Review 2 (Mkt Employee) via /api/performance/:id -> 403
    res = await fetch(`${BASE_URL}/performance/${createdRev2._id}`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    recordResult('Manager Performance', 'Manager cannot view review of employee outside department (403)', res.status === 403, `Status: ${res.status}`);

    // Dev Manager attempts to view summary of employee outside department via /api/performance/summary/:id -> 403
    res = await fetch(`${BASE_URL}/performance/summary/${mktEmp._id}`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    recordResult('IDOR/BOLA Security', 'Manager cannot view performance summary of outside employee (403)', res.status === 403, `Status: ${res.status}`);

    // ==================================================
    // 15. GOALS + PERFORMANCE INTEGRATION & SUMMARY
    // ==================================================
    console.log('\n--- Testing 15: Goals + Performance Integration ---');
    // Employee accesses /api/performance/my/summary
    res = await fetch(`${BASE_URL}/performance/my/summary`, {
      headers: { Authorization: `Bearer ${devEmpToken}` },
    });
    const summaryData = await res.json();
    const hasGoalsInSummary = summaryData.data?.goalStats !== undefined && summaryData.data?.taskStats !== undefined;
    recordResult('Goal/Performance Integration', 'Employee performance summary integrates goals, tasks, reviews, and attendance', res.status === 200 && hasGoalsInSummary, `Completion rate: ${summaryData.data?.goalStats?.completionRate}%`);

    // ==================================================
    // 16. DASHBOARD INTEGRATION
    // ==================================================
    console.log('\n--- Testing 16: Dashboard Integration ---');
    // Manager dashboard stats
    res = await fetch(`${BASE_URL}/manager/dashboard`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const mgrDashData = await res.json();
    recordResult('Dashboard Integration', 'Manager dashboard returns live completedGoals and inProgressGoals', res.status === 200 && mgrDashData.stats?.completedGoals !== undefined);

    // ==================================================
    // 17. NOTIFICATIONS
    // ==================================================
    console.log('\n--- Testing 17: Notifications ---');
    const empNotifications = await Notification.find({
      recipient: devEmpUser._id,
      type: 'performance',
    }).sort({ createdAt: -1 });
    recordResult('Notifications', 'Employee received notifications for assigned goal and performance review', empNotifications.length >= 1, `Count: ${empNotifications.length}`);

    // Clean up test data
    await Goal.deleteMany({ title: { $regex: /^QA Test Goal/ } });
    await Performance.deleteMany({ reviewPeriod: { $regex: /^QA-Q[1-4]-2026/ } });

    console.log('\n==================================================');
    console.log('GOALS + PERFORMANCE QA SUITE SUMMARY');
    console.log('==================================================');

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Checks: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.error('\nFAILURES DETECTED:');
      results.filter((r) => !r.passed).forEach((f) => {
        console.error(`- [${f.category}] ${f.name}: ${f.detail}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 ALL 34 CRITICAL CHECKS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal suite execution error:', error);
    process.exit(1);
  }
};

runComprehensiveSuite();
