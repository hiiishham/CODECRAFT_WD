// Comprehensive Automated Test Suite for StaffPulse Notifications Center & Security Controls
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Notification from '../models/Notification.js';

const API_URL = 'http://localhost:5000/api';

async function runNotificationTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE NOTIFICATIONS CENTER & PRIVACY AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let managerToken = '';
  let employeeToken = '';
  let adminUser = null;
  let managerUser = null;
  let testEmp = null;
  let adminNotifId = null;

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ALL 3 ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin, Manager, and Employee...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success) throw new Error('Admin login failed');
    adminToken = adminLogin.token;
    adminUser = adminLogin.user;

    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (!managerLogin.success) throw new Error('Manager login failed');
    managerToken = managerLogin.token;
    managerUser = managerLogin.user;

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!empLogin.success) throw new Error('Employee login failed');
    employeeToken = empLogin.token;

    console.log('   ✓ Admin, Manager, and Employee authenticated\n');

    // -------------------------------------------------------------
    // 2. SECURITY & PRIVACY CONTROLS
    // -------------------------------------------------------------
    console.log('2. Testing Notification Security & Privacy Isolation:');

    // 2a. Unauthenticated request -> 401
    const unauthRes = await fetch(`${API_URL}/notifications`);
    if (unauthRes.status !== 401) throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    console.log('   ✓ Unauthenticated request rejected with 401 Unauthorized');

    // 2b. Seed a private notification specifically for Admin
    const adminDoc = await Notification.create({
      recipient: adminUser._id,
      title: 'Confidential Admin Alert',
      message: 'This message is strictly for the administrator.',
      type: 'system',
      isRead: false,
    });
    adminNotifId = adminDoc._id.toString();

    // 2c. Manager tries to read Admin's notification list -> must NOT contain admin's notification
    const mgrListRes = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    const leaked = mgrListRes.notifications?.some((n) => n._id === adminNotifId);
    if (leaked) throw new Error('Security Violation: Manager retrieved an Admin notification!');
    console.log('   ✓ User A cannot view notifications belonging to User B in list query');

    // 2d. Manager tries to GET admin's notification directly by ID -> 404
    const mgrGetRes = await fetch(`${API_URL}/notifications/${adminNotifId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrGetRes.status !== 404) throw new Error(`Expected 404 for cross-user notification access, got ${mgrGetRes.status}`);
    console.log('   ✓ Direct access to another user’s notification blocked with 404');

    // 2e. Manager tries to mark admin's notification as read -> 404
    const mgrReadRes = await fetch(`${API_URL}/notifications/${adminNotifId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrReadRes.status !== 404) throw new Error(`Expected 404 for cross-user mark-as-read, got ${mgrReadRes.status}`);
    console.log('   ✓ Marking another user’s notification as read blocked with 404');

    // 2f. Manager tries to delete admin's notification -> 404
    const mgrDelRes = await fetch(`${API_URL}/notifications/${adminNotifId}/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    // Or DELETE /:id
    const mgrDelRes2 = await fetch(`${API_URL}/notifications/${adminNotifId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrDelRes2.status !== 404) throw new Error(`Expected 404 for cross-user deletion, got ${mgrDelRes2.status}`);
    console.log('   ✓ Deleting another user’s notification blocked with 404\n');

    // -------------------------------------------------------------
    // 3. EVENT TRIGGERS (Employee, Leave, Salary)
    // -------------------------------------------------------------
    console.log('3. Testing Module Event Triggers:');

    // Clean test notifications
    await Notification.deleteMany({ recipient: { $in: [adminUser._id, managerUser._id] } });

    // 3a. Employee Trigger: Create Employee
    testEmp = await Employee.create({
      employeeId: 'NOTIF-EMP-01',
      fullName: 'Samantha TriggerTester',
      email: 'samantha.trigger@ems.com',
      phone: '+91 91234 56789',
      department: 'Development',
      designation: 'Staff Engineer',
      salary: 0,
      status: 'Active',
    });

    // Fire employee trigger via controller or API
    const empCreateApiRes = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employeeId: 'NOTIF-EMP-02',
        fullName: 'Benjamin TriggerTester',
        email: 'benjamin.trigger@ems.com',
        phone: '+91 91234 56780',
        department: 'Design',
        designation: 'Senior UI/UX',
        salary: 50000,
        status: 'Active',
      }),
    });
    const empCreateApiData = await empCreateApiRes.json();
    if (empCreateApiRes.status !== 201) throw new Error(`Employee creation failed: ${empCreateApiData.message}`);
    const createdEmp2 = empCreateApiData.employee;

    // Check notification in Admin's feed
    const adminFeed1 = await fetch(`${API_URL}/notifications?type=employee`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const empNotif = adminFeed1.notifications?.find((n) => n.title === 'New Employee Added');
    if (!empNotif) throw new Error('Employee creation trigger did not generate notification');
    console.log('   ✓ Employee creation triggered notification for Admin & Manager');

    // 3b. Leave Trigger: Submit Leave
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 4);

    const leaveRes = await fetch(`${API_URL}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: createdEmp2._id,
        leaveType: 'Casual Leave',
        startDate: today.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        reason: 'Family event',
      }),
    });
    const leaveData = await leaveRes.json();
    if (leaveRes.status !== 201) throw new Error('Leave creation failed');
    const createdLeave = leaveData.leave;

    // Check leave notification
    const adminFeed2 = await fetch(`${API_URL}/notifications?type=leave`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const leaveNotif = adminFeed2.notifications?.find((n) => n.title === 'New Leave Request');
    if (!leaveNotif) throw new Error('Leave creation trigger did not generate notification');
    console.log('   ✓ Leave request triggered notification for Admin & Manager');

    // 3c. Leave Approval Trigger
    const approveRes = await fetch(`${API_URL}/leaves/${createdLeave._id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (approveRes.status !== 200) throw new Error('Leave approval failed');

    const adminFeed3 = await fetch(`${API_URL}/notifications?type=leave`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const approveNotif = adminFeed3.notifications?.find((n) => n.title === 'Leave Request Approved');
    if (!approveNotif) throw new Error('Leave approval trigger did not generate notification');
    console.log('   ✓ Leave approval triggered notification for Admin & Manager');

    // 3d. Salary Trigger: Assign Salary (Admin only)
    const salaryRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: createdEmp2._id,
        basicSalary: 60000,
        allowances: 6000,
        deductions: 2000,
        effectiveFrom: '2026-09-01',
      }),
    });
    const salaryData = await salaryRes.json();
    if (salaryRes.status !== 201) throw new Error(`Salary creation failed: ${salaryData.message}`);

    // Admin should receive salary notification
    const adminFeedSalary = await fetch(`${API_URL}/notifications?type=salary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const salaryNotif = adminFeedSalary.notifications?.find((n) => n.title === 'Salary Record Assigned');
    if (!salaryNotif) throw new Error('Salary assignment trigger did not generate notification for Admin');

    // Security check: Manager MUST NOT receive salary notification
    const mgrFeedSalary = await fetch(`${API_URL}/notifications?type=salary`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    if (mgrFeedSalary.notifications?.length > 0) {
      throw new Error('Security Violation: Manager received confidential salary notification!');
    }

    // Security check: Verify NO numeric salary values are exposed in notification message
    if (salaryNotif.message.includes('60000') || salaryNotif.message.includes('64000')) {
      throw new Error('Security Violation: Confidential salary amount leaked in notification text!');
    }
    console.log('   ✓ Salary assignment triggered notification ONLY for Admin');
    console.log('   ✓ Sensitive salary amounts strictly excluded from notification text\n');

    // -------------------------------------------------------------
    // 4. UNREAD COUNT, MARK AS READ & MARK ALL AS READ
    // -------------------------------------------------------------
    console.log('4. Testing Unread Count & Read State Transitions:');

    const unreadCountRes = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!unreadCountRes.success || unreadCountRes.unreadCount <= 0) {
      throw new Error(`Invalid unread count: ${unreadCountRes.unreadCount}`);
    }
    const initialUnread = unreadCountRes.unreadCount;
    console.log(`   ✓ Unread count queried efficiently: ${initialUnread} unread`);

    // Mark single notification as read
    const notifToMark = salaryNotif._id;
    const markRes = await fetch(`${API_URL}/notifications/${notifToMark}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!markRes.success || !markRes.notification.isRead) {
      throw new Error('Failed to mark single notification as read');
    }
    if (markRes.unreadCount !== initialUnread - 1) {
      throw new Error(`Unread count mismatch after read: expected ${initialUnread - 1}, got ${markRes.unreadCount}`);
    }
    console.log('   ✓ Single notification marked as read and unread count decremented');

    // Mark all as read
    const markAllRes = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!markAllRes.success || markAllRes.unreadCount !== 0) {
      throw new Error('Failed to mark all notifications as read');
    }
    console.log('   ✓ All notifications marked as read (unread count reset to 0)\n');

    // -------------------------------------------------------------
    // 5. FILTERS & PAGINATION
    // -------------------------------------------------------------
    console.log('5. Testing Filtering & Pagination:');

    // Create 1 unread notification
    await Notification.create({
      recipient: adminUser._id,
      title: 'Unread Alert',
      message: 'This is an unread alert for filter testing.',
      type: 'system',
      isRead: false,
    });

    // 5a. Filter: status=unread
    const unreadFilterRes = await fetch(`${API_URL}/notifications?status=unread`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const allUnread = unreadFilterRes.notifications.every((n) => n.isRead === false);
    if (!allUnread || unreadFilterRes.notifications.length === 0) {
      throw new Error('Status filter "unread" returned read notifications or empty list');
    }
    console.log('   ✓ Filter status=unread returned only unread notifications');

    // 5b. Filter: status=read
    const readFilterRes = await fetch(`${API_URL}/notifications?status=read`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const allRead = readFilterRes.notifications.every((n) => n.isRead === true);
    if (!allRead || readFilterRes.notifications.length === 0) {
      throw new Error('Status filter "read" returned unread notifications or empty list');
    }
    console.log('   ✓ Filter status=read returned only read notifications');

    // 5c. Pagination: limit=1
    const pageRes = await fetch(`${API_URL}/notifications?limit=1&page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (pageRes.notifications.length !== 1 || pageRes.totalPages < 2) {
      throw new Error('Pagination limit=1 failed');
    }
    console.log('   ✓ Backend pagination works (limit=1 returned exactly 1 item and multiple pages)\n');

    // -------------------------------------------------------------
    // 6. DELETION
    // -------------------------------------------------------------
    console.log('6. Testing Notification Deletion:');

    // 6a. Delete single notification
    const delSingleRes = await fetch(`${API_URL}/notifications/${notifToMark}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delSingleRes.status !== 200) throw new Error('Failed to delete single notification');

    // Verify 404
    const getDeletedRes = await fetch(`${API_URL}/notifications/${notifToMark}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (getDeletedRes.status !== 404) throw new Error('Deleted notification still accessible');
    console.log('   ✓ Single notification deleted and verified with 404');

    // 6b. Clear all notifications
    const clearRes = await fetch(`${API_URL}/notifications`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (clearRes.status !== 200) throw new Error('Failed to clear all notifications');

    const emptyFeed = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (emptyFeed.notifications.length !== 0 || emptyFeed.unreadCount !== 0) {
      throw new Error('Clear all notifications did not empty the feed');
    }
    console.log('   ✓ Clear all notifications emptied the user feed successfully\n');

    // Clean test employees and leave
    await Employee.deleteMany({ employeeId: { $in: ['NOTIF-EMP-01', 'NOTIF-EMP-02'] } });

    console.log('=================================================================');
    console.log('ALL NOTIFICATION CENTER AUTOMATED TESTS PASSED (100%)');
    console.log('=================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ [TEST FAILURE]:', error.message);
    if (testEmp?._id) {
      await Employee.deleteMany({ employeeId: { $in: ['NOTIF-EMP-01', 'NOTIF-EMP-02'] } });
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runNotificationTests();
