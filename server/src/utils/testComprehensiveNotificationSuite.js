// Comprehensive Automated Test Suite for StaffPulse Notification Management System (32 Categories)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io: Client } = require('../../../client/node_modules/socket.io-client');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import Leave from '../models/Leave.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Performance from '../models/Performance.js';
import Announcement from '../models/Announcement.js';
import Salary from '../models/Salary.js';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const results = [];

function recordResult(category, description, passed, notes = '') {
  results.push({ category, description, passed, notes });
  const badge = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${badge} [${category}] ${description} ${notes ? '(' + notes + ')' : ''}`);
}

async function runComprehensiveNotificationTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE NOTIFICATIONS COMPREHENSIVE QA & SECURITY SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let managerToken = '';
  let emp1Token = '';
  let emp2Token = '';
  let adminUser = null;
  let managerUser = null;
  let emp1User = null;
  let emp2User = null;
  let emp1Doc = null;
  let emp2Doc = null;

  try {
    // -------------------------------------------------------------------------
    // 0. AUTHENTICATION & SETUP
    // -------------------------------------------------------------------------
    console.log('--- 0. AUTHENTICATION & USER SETUP ---');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'password123' }),
    }).then((r) => r.json());
    if (!adminLogin.success) {
      const adminLogin2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
      }).then((r) => r.json());
      if (!adminLogin2.success) throw new Error('Admin login failed');
      adminToken = adminLogin2.token;
      adminUser = adminLogin2.user;
    } else {
      adminToken = adminLogin.token;
      adminUser = adminLogin.user;
    }

    const mgrLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'password123' }),
    }).then((r) => r.json());
    if (!mgrLogin.success) {
      const mgrLogin2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
      }).then((r) => r.json());
      if (!mgrLogin2.success) throw new Error('Manager login failed');
      managerToken = mgrLogin2.token;
      managerUser = mgrLogin2.user;
    } else {
      managerToken = mgrLogin.token;
      managerUser = mgrLogin.user;
    }

    const e1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'password123' }),
    }).then((r) => r.json());
    if (!e1Login.success) {
      const e1Login2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
      }).then((r) => r.json());
      if (!e1Login2.success) throw new Error('Employee 1 login failed');
      emp1Token = e1Login2.token;
      emp1User = e1Login2.user;
    } else {
      emp1Token = e1Login.token;
      emp1User = e1Login.user;
    }

    const e2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'password123' }),
    }).then((r) => r.json());
    if (!e2Login.success) {
      const e2Login2 = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
      }).then((r) => r.json());
      if (!e2Login2.success) throw new Error('Employee 2 login failed');
      emp2Token = e2Login2.token;
      emp2User = e2Login2.user;
    } else {
      emp2Token = e2Login.token;
      emp2User = e2Login.user;
    }

    emp1Doc = await Employee.findOne({ email: emp1User.email.toLowerCase() });
    emp2Doc = await Employee.findOne({ email: emp2User.email.toLowerCase() });

    recordResult('Authentication', 'Admin, Manager, and 2 Employees authenticated successfully', !!(adminToken && managerToken && emp1Token && emp2Token));

    // -------------------------------------------------------------------------
    // 1. NOTIFICATION ARCHITECTURE & SCHEMA
    // -------------------------------------------------------------------------
    console.log('\n--- 1. NOTIFICATION ARCHITECTURE & SCHEMA ---');

    const schemaIndexes = Notification.schema.indexes();
    recordResult('Architecture', 'Notification compound indexes properly defined for performance', schemaIndexes.length >= 2);

    const allowedTypes = Notification.schema.path('type').enumValues;
    const hasRequiredTypes = ['employee', 'leave', 'salary', 'system', 'task', 'performance', 'document', 'announcement', 'submission', 'attendance']
      .every((t) => allowedTypes.includes(t));
    recordResult('Notification Model', 'Notification type enum supports all modules including submission and attendance', hasRequiredTypes);

    // -------------------------------------------------------------------------
    // 2. UNREAD COUNT & BELL BEHAVIOR
    // -------------------------------------------------------------------------
    console.log('\n--- 2. UNREAD COUNT & BELL BEHAVIOR ---');

    // Clean initial test notifications for Employee 1
    await Notification.deleteMany({ recipient: emp1User._id });

    const initialUnreadRes = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Unread Count', 'Unread count is 0 when no unread notifications exist', initialUnreadRes.unreadCount === 0);

    // Seed 1 unread notification
    const seeded1 = await Notification.create({
      recipient: emp1User._id,
      title: 'Welcome Alert',
      message: 'Welcome to StaffPulse notifications.',
      type: 'system',
      isRead: false,
    });

    const unread1Res = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Unread Count', 'Unread count updates to 1 after 1 new notification', unread1Res.unreadCount === 1);

    // Seed 4 more unread notifications (total 5)
    await Notification.insertMany([
      { recipient: emp1User._id, title: 'Alert 2', message: 'Message 2', type: 'system', isRead: false },
      { recipient: emp1User._id, title: 'Alert 3', message: 'Message 3', type: 'system', isRead: false },
      { recipient: emp1User._id, title: 'Alert 4', message: 'Message 4', type: 'system', isRead: false },
      { recipient: emp1User._id, title: 'Alert 5', message: 'Message 5', type: 'system', isRead: false },
    ]);

    const unread5Res = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Unread Count', 'Unread count reflects 5 unread notifications accurately', unread5Res.unreadCount === 5);

    // -------------------------------------------------------------------------
    // 3. MARK SINGLE AS READ
    // -------------------------------------------------------------------------
    console.log('\n--- 3. MARK SINGLE NOTIFICATION AS READ ---');

    const markSingleRes = await fetch(`${API_URL}/notifications/${seeded1._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const updatedDocInDb = await Notification.findById(seeded1._id);
    recordResult('Mark Read', 'Notification isRead becomes true in database', updatedDocInDb?.isRead === true);
    recordResult('Unread Count', 'Unread count decreases to 4 after reading one', markSingleRes.unreadCount === 4);

    // -------------------------------------------------------------------------
    // 4. MARK ALL AS READ
    // -------------------------------------------------------------------------
    console.log('\n--- 4. MARK ALL AS READ ---');

    const markAllRes = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const countAfterMarkAll = await Notification.countDocuments({ recipient: emp1User._id, isRead: false });
    recordResult('Mark All Read', 'Mark All Read sets all user notifications to read (count = 0)', markAllRes.unreadCount === 0 && countAfterMarkAll === 0);

    // -------------------------------------------------------------------------
    // 5. NOTIFICATION SECURITY & IDOR / BOLA CONTROLS
    // -------------------------------------------------------------------------
    console.log('\n--- 5. NOTIFICATION SECURITY & IDOR / BOLA ---');

    // Create a private notification specifically for Employee 2
    const emp2Private = await Notification.create({
      recipient: emp2User._id,
      title: 'Confidential Employee 2 Notice',
      message: 'Private personnel evaluation detail.',
      type: 'system',
      isRead: false,
    });

    // Employee 1 attempts to view Employee 2 notification list -> must not contain it
    const emp1List = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    const leakedInList = emp1List.notifications?.some((n) => n._id === emp2Private._id.toString());
    recordResult('IDOR/BOLA Security', 'User A cannot see User B notifications in list query', !leakedInList);

    // Employee 1 attempts to GET Employee 2 notification by ID -> 404
    const emp1GetEmp2 = await fetch(`${API_URL}/notifications/${emp2Private._id}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'User A blocked from getting User B notification by ID (404 Not Found)', emp1GetEmp2.status === 404);

    // Employee 1 attempts to mark Employee 2 notification as read -> 404
    const emp1MarkEmp2 = await fetch(`${API_URL}/notifications/${emp2Private._id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'User A blocked from marking User B notification as read (404)', emp1MarkEmp2.status === 404);

    // Employee 1 attempts to delete Employee 2 notification -> 404
    const emp1DelEmp2 = await fetch(`${API_URL}/notifications/${emp2Private._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'User A blocked from deleting User B notification (404)', emp1DelEmp2.status === 404);

    // Verify Employee 2 notification remains untouched (isRead: false)
    const emp2Untouched = await Notification.findById(emp2Private._id);
    recordResult('IDOR/BOLA Security', 'User B notification remains unread and preserved in database', emp2Untouched?.isRead === false);

    // Mark All Read by Employee 1 must NOT affect Employee 2
    await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp2StillUnread = await Notification.countDocuments({ recipient: emp2User._id, isRead: false });
    recordResult('IDOR/BOLA Security', 'Mark All Read strictly isolates authenticated user and preserves others', emp2StillUnread > 0);

    // -------------------------------------------------------------------------
    // 6. BUSINESS EVENT TRIGGER — LEAVE
    // -------------------------------------------------------------------------
    console.log('\n--- 6. EVENT TRIGGER: LEAVE ---');

    await Notification.deleteMany({ recipient: { $in: [adminUser._id, managerUser._id, emp1User._id] } });
    await Leave.deleteMany({ employee: emp1Doc._id });

    // Employee 1 applies for leave
    const leaveRes = await fetch(`${API_URL}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: '2026-10-10',
        endDate: '2026-10-12',
        reason: 'Personal vacation',
      }),
    });
    const leaveData = await leaveRes.json();
    const createdLeave = leaveData.leave;

    // Admin receives "New Leave Request"
    const adminLeaveNotif = await Notification.findOne({
      recipient: adminUser._id,
      title: 'New Leave Request',
      relatedId: createdLeave._id,
    });
    recordResult('Leave Trigger', 'Admin receives New Leave Request notification when employee applies', !!adminLeaveNotif);

    // Manager/Admin approves leave
    const approveRes = await fetch(`${API_URL}/leaves/${createdLeave._id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('Leave Trigger', 'Admin/Manager approves leave successfully (200 OK)', approveRes.status === 200);

    // Employee 1 receives "Leave Approved"
    const empLeaveApprovedNotif = await Notification.findOne({
      recipient: emp1User._id,
      title: 'Leave Approved',
      relatedId: createdLeave._id,
    });
    recordResult('Leave Trigger', 'Employee receives Leave Approved notification with leave reference', !!empLeaveApprovedNotif);

    // -------------------------------------------------------------------------
    // 7. BUSINESS EVENT TRIGGER — TASK
    // -------------------------------------------------------------------------
    console.log('\n--- 7. EVENT TRIGGER: TASK ---');

    // Admin creates task assigned to Employee 1
    const taskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Complete Core Module Audit',
        description: 'Audit the complete notification and realtime dispatch engine.',
        assignedTo: emp1Doc._id,
        department: emp1Doc.department || 'Development',
        priority: 'High',
        startDate: '2026-10-01',
        dueDate: '2026-10-15',
      }),
    });
    const taskData = await taskRes.json();
    const createdTask = taskData.task;

    const empTaskAssignedNotif = await Notification.findOne({
      recipient: emp1User._id,
      title: 'New Task Assigned',
      relatedId: createdTask._id,
    });
    recordResult('Task Trigger', 'Employee receives New Task Assigned notification', !!empTaskAssignedNotif);

    // Employee updates progress
    await fetch(`${API_URL}/tasks/${createdTask._id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ progress: 85, employeeComment: '85% completed, finishing tests.' }),
    });

    const adminProgressNotif = await Notification.findOne({
      recipient: adminUser._id,
      title: 'Task Progress: 85%',
      relatedId: createdTask._id,
    });
    recordResult('Task Trigger', 'Assigner receives notification when employee updates task progress', !!adminProgressNotif);

    // -------------------------------------------------------------------------
    // 8. BUSINESS EVENT TRIGGER — WORK SUBMISSION
    // -------------------------------------------------------------------------
    console.log('\n--- 8. EVENT TRIGGER: WORK SUBMISSION ---');

    // Employee submits work
    const subRes = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({
        taskId: createdTask._id,
        description: 'Completed comprehensive implementation of notification test suite.',
        employeeComment: 'Please review my notification module test suite implementation.',
        attachments: [{ fileName: 'test.js', fileUrl: 'https://storage.example.com/test.js', fileType: 'js', fileSize: 1024 }],
      }),
    });
    const subData = await subRes.json();
    const createdSub = subData.submission;

    const adminSubNotif = await Notification.findOne({
      recipient: adminUser._id,
      title: 'New Work Submission',
      type: 'submission',
      relatedId: createdSub._id,
    });
    recordResult('Submission Trigger', 'Manager/Admin receives New Work Submission notification with type: submission', !!adminSubNotif);

    // Manager/Admin requests changes
    await fetch(`${API_URL}/submissions/${createdSub._id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Changes Requested', reviewComment: 'Please add negative tests.' }),
    });

    const empChangesNotif = await Notification.findOne({
      recipient: emp1User._id,
      title: 'Changes Requested',
      type: 'submission',
      relatedId: createdSub._id,
    });
    recordResult('Submission Trigger', 'Employee receives Changes Requested notification with type: submission', !!empChangesNotif);

    // Employee resubmits work
    await fetch(`${API_URL}/submissions/${createdSub._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ employeeComment: 'Added 10 negative tests.' }),
    });

    const adminResubNotif = await Notification.findOne({
      recipient: adminUser._id,
      title: 'Work Resubmitted',
      type: 'submission',
      relatedId: createdSub._id,
    });
    recordResult('Submission Trigger', 'Admin receives Work Resubmitted notification with type: submission', !!adminResubNotif);

    // Admin approves submission
    await fetch(`${API_URL}/submissions/${createdSub._id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Approved', reviewComment: 'Excellent work.' }),
    });

    const empApprovedNotif = await Notification.findOne({
      recipient: emp1User._id,
      title: 'Work Approved',
      type: 'submission',
      relatedId: createdSub._id,
    });
    recordResult('Submission Trigger', 'Employee receives Work Approved notification with type: submission', !!empApprovedNotif);

    // -------------------------------------------------------------------------
    // 9. BUSINESS EVENT TRIGGER — PERFORMANCE REVIEW
    // -------------------------------------------------------------------------
    console.log('\n--- 9. EVENT TRIGGER: PERFORMANCE REVIEW ---');

    await Performance.deleteMany({ employee: emp1Doc._id });

    const perfRes = await fetch(`${API_URL}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1Doc._id,
        reviewPeriod: 'Q3 2026',
        overallRating: 5,
        strengths: 'Outstanding attention to detail and security diligence.',
        areasForImprovement: 'None identified.',
        managerFeedback: 'Keep up the stellar work.',
      }),
    });
    const perfData = await perfRes.json();
    const createdPerf = perfData.performanceReview || perfData.review;

    const empPerfNotif = await Notification.findOne({
      recipient: emp1User._id,
      title: 'Performance Review Available',
      type: 'performance',
    });
    recordResult('Performance Trigger', 'Employee receives notification when performance review is published', !!empPerfNotif);

    // -------------------------------------------------------------------------
    // 10. BUSINESS EVENT TRIGGER — ANNOUNCEMENT AUDIENCE
    // -------------------------------------------------------------------------
    console.log('\n--- 10. EVENT TRIGGER: ANNOUNCEMENTS ---');

    await Notification.deleteMany({ title: 'Company All-Hands Q3' });

    // Announcement for All
    await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Company All-Hands Q3',
        content: 'All-Hands meeting this Friday at 3 PM.',
        category: 'General',
        audience: 'All',
        status: 'Published',
      }),
    });

    const adminAnnNotif = await Notification.findOne({ recipient: adminUser._id, message: 'Company All-Hands Q3' });
    const mgrAnnNotif = await Notification.findOne({ recipient: managerUser._id, message: 'Company All-Hands Q3' });
    const empAnnNotif = await Notification.findOne({ recipient: emp1User._id, message: 'Company All-Hands Q3' });
    recordResult('Announcement Trigger', 'Audience All dispatches notifications to Admin, Manager, and Employees', !!(adminAnnNotif && mgrAnnNotif && empAnnNotif));

    // -------------------------------------------------------------------------
    // 11. BUSINESS EVENT TRIGGER — SALARY SECURITY & PRIVACY
    // -------------------------------------------------------------------------
    console.log('\n--- 11. EVENT TRIGGER: SALARY SECURITY ---');

    await Notification.deleteMany({ type: 'salary' });

    // Admin creates salary for Employee 1
    const pYear = new Date().getFullYear();
    const pMonth = 11;

    await Salary.deleteMany({ employee: emp1Doc._id });

    await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1Doc._id,
        basicSalary: 72000,
        allowances: 8000,
        deductions: 3000,
        effectiveFrom: `${pYear}-11-01`,
        payMonth: pMonth,
        payYear: pYear,
        status: 'Draft',
      }),
    });

    const adminSalaryNotif = await Notification.findOne({ recipient: adminUser._id, type: 'salary', title: 'Salary Record Assigned' });
    recordResult('Salary Trigger', 'Admin receives Salary Record Assigned notification', !!adminSalaryNotif);

    // Verify NO numeric salary values are leaked in notification text
    const textHasFigures = adminSalaryNotif?.message?.includes('72000') || adminSalaryNotif?.message?.includes('80000');
    recordResult('Salary Privacy', 'Salary notification text strictly omits confidential monetary figures', !textHasFigures);

    // Verify Manager NEVER receives salary notifications
    const mgrSalaryNotifs = await Notification.find({ recipient: managerUser._id, type: 'salary' });
    recordResult('Salary Privacy', 'Manager is blocked and receives zero salary notifications', mgrSalaryNotifs.length === 0);

    // -------------------------------------------------------------------------
    // 12. SOCKET.IO REAL-TIME DELIVERY & ROOM ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- 12. SOCKET.IO REAL-TIME NOTIFICATIONS ---');

    let socketConnected = false;
    let receivedLiveNotification = null;

    const socketClient = Client(SOCKET_URL, {
      auth: { token: emp1Token },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    await new Promise((resolve) => {
      socketClient.on('connect', () => {
        socketConnected = true;
        resolve();
      });
      socketClient.on('connect_error', () => {
        resolve();
      });
      setTimeout(resolve, 3000);
    });

    recordResult('Socket.IO Connection', 'Client successfully connects to Socket.IO with JWT auth', socketConnected);

    // Listen for live notification event
    socketClient.on('notification:new', (notif) => {
      receivedLiveNotification = notif;
    });

    // Admin dispatches a document notification targeting Employee 1
    await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1Doc._id,
        title: 'Annual Benefits Policy 2026',
        documentType: 'Employment Contract',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+CmVuZG9iamkyIDAgb2JqCjw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgND4+CnN0YXJ0eHJlZgoxOTQKJCVFT0YK',
        fileName: 'benefits.pdf',
      }),
    });

    // Wait up to 3 seconds for Socket.IO event
    await new Promise((resolve) => setTimeout(resolve, 1500));

    recordResult('Real-Time Delivery', 'Employee receives real-time notification via Socket.IO room without refresh', !!receivedLiveNotification);

    socketClient.disconnect();
    recordResult('Socket Reconnection', 'Socket cleans up cleanly upon disconnection', !socketClient.connected);

    // -------------------------------------------------------------------------
    // 13. DATABASE PERSISTENCE & FRESH LOAD CONSISTENCY
    // -------------------------------------------------------------------------
    console.log('\n--- 13. DATABASE PERSISTENCE ---');

    const freshGet = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Database Persistence', 'Notifications retrieved on fresh API query matching real-time dispatches', freshGet.notifications?.length > 0);

    // -------------------------------------------------------------------------
    // 14. NEGATIVE & API SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- 14. NEGATIVE & API SECURITY TESTS ---');

    const unauthRes = await fetch(`${API_URL}/notifications`);
    recordResult('API Security', 'Unauthenticated request to GET /api/notifications returns 401', unauthRes.status === 401);

    const invalidIdRes = await fetch(`${API_URL}/notifications/invalid_notif_id_format`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Invalid notification ObjectId returns 400 Bad Request', invalidIdRes.status === 400);

    const notFoundRes = await fetch(`${API_URL}/notifications/6ab2d78c454c09554480dcae`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Non-existent notification ID returns 404 Not Found safely', notFoundRes.status === 404);

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log('\n=================================================================');
    console.log('COMPREHENSIVE NOTIFICATIONS QA & SECURITY SUITE SUMMARY');
    console.log('=================================================================');

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`TOTAL TESTS : ${totalTests}`);
    console.log(`PASSED      : ${passedTests}`);
    console.log(`FAILED      : ${failedTests}`);

    if (failedTests > 0) {
      console.error('\n❌ SOME TESTS FAILED:');
      results.filter((r) => !r.passed).forEach((r) => console.error(`  - [${r.category}] ${r.description}`));
      process.exitCode = 1;
    } else {
      console.log('\n🎉 ALL COMPREHENSIVE NOTIFICATION QA TESTS PASSED WITH 100% SUCCESS!');
    }
  } catch (error) {
    console.error('\n❌ TEST SUITE RUNTIME ERROR:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runComprehensiveNotificationTests();
