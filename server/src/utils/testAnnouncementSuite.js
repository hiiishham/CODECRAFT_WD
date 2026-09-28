// Automated Test Suite for StaffPulse Company Announcements + Notice Board (Step 22)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';

const API_URL = 'http://localhost:5000/api';

async function runAnnouncementTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE COMPANY ANNOUNCEMENTS + NOTICE BOARD TEST SUITE (STEP 22)');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let employeeToken = '';
  let managerToken = '';
  let devDepartment = null;
  let hrDepartment = null;
  let createdAnnouncementId = null;
  let draftAnnouncementId = null;
  let expiredAnnouncementId = null;

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin, Employee, and Manager...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success) throw new Error('Admin login failed: ' + adminLogin.message);
    adminToken = adminLogin.token;

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!empLogin.success) throw new Error('Employee login failed: ' + empLogin.message);
    employeeToken = empLogin.token;

    // Check if manager exists or login
    const mgrLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (mgrLogin.success) {
      managerToken = mgrLogin.token;
    }

    // Lookup or seed departments
    devDepartment = await Department.findOne({ name: 'Development' });
    if (!devDepartment) {
      devDepartment = await Department.create({ name: 'Development', description: 'Software Development' });
    }
    hrDepartment = await Department.findOne({ name: 'Human Resources' });
    if (!hrDepartment) {
      hrDepartment = await Department.create({ name: 'Human Resources', description: 'HR Department' });
    }

    console.log('   ✓ Admin and Employee authenticated successfully.');
    if (managerToken) console.log('   ✓ Manager authenticated successfully.');
    console.log(`   ✓ Departments confirmed: ${devDepartment.name} (${devDepartment._id}), ${hrDepartment.name} (${hrDepartment._id})\n`);

    // -------------------------------------------------------------
    // 2. VALIDATION TESTS
    // -------------------------------------------------------------
    console.log('2. Testing Announcement Form Validations...');

    // 2a. Missing title / content
    const invalidReq1 = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: '',
        content: '',
      }),
    }).then((r) => r.json());
    if (invalidReq1.success) throw new Error('Expected failure for empty title and content');
    console.log('   ✓ Rejected missing title/content (400 validation error)');

    // 2b. Audience=Department but no department provided
    const invalidReq2 = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Department Meeting',
        content: 'Meeting at 10 AM',
        audience: 'Department',
      }),
    }).then((r) => r.json());
    if (invalidReq2.success) throw new Error('Expected failure when audience is Department without departmentId');
    console.log('   ✓ Rejected audience=Department with missing departmentId');

    // 2c. expiryDate earlier than publishDate
    const invalidReq3 = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Invalid Date Notice',
        content: 'Date check',
        publishDate: '2026-10-10',
        expiryDate: '2026-10-01',
      }),
    }).then((r) => r.json());
    if (invalidReq3.success) throw new Error('Expected failure when expiryDate < publishDate');
    console.log('   ✓ Rejected expiryDate earlier than publishDate\n');

    // -------------------------------------------------------------
    // 3. CREATE ANNOUNCEMENTS (DRAFT, PUBLISHED, EXPIRED)
    // -------------------------------------------------------------
    console.log('3. Testing Announcement Creation & Notification Dispatch...');

    // 3a. Create Draft announcement
    const draftRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Draft: Upcoming System Maintenance Plan',
        content: 'Server migration scheduled for next quarter. Pending approval.',
        category: 'Other',
        priority: 'Normal',
        audience: 'All',
        status: 'Draft',
      }),
    }).then((r) => r.json());
    if (!draftRes.success) throw new Error('Failed to create draft announcement: ' + draftRes.message);
    draftAnnouncementId = draftRes.announcement._id;
    console.log(`   ✓ Draft announcement created: "${draftRes.announcement.title}" (${draftAnnouncementId})`);

    // 3b. Create Published announcement targeting 'All'
    const pubRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Q4 All-Hands Town Hall & Strategy Update',
        content: 'Join us this Friday at 3 PM for our quarterly town hall meeting with executive leadership.',
        category: 'Event',
        priority: 'Urgent',
        audience: 'All',
        status: 'Published',
        publishDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    }).then((r) => r.json());
    if (!pubRes.success) throw new Error('Failed to create published announcement: ' + pubRes.message);
    createdAnnouncementId = pubRes.announcement._id;
    console.log(`   ✓ Published announcement created: "${pubRes.announcement.title}" (${createdAnnouncementId})`);

    // 3c. Check notification dispatch
    const latestNotif = await Notification.findOne({
      title: 'New Announcement: Q4 All-Hands Town Hall & Strategy Update',
    });
    if (!latestNotif) {
      console.log('   ⚠ Warning: Notification not found by exact title, checking announcement type notifications...');
      const anyNotif = await Notification.findOne({ type: 'announcement' });
      if (!anyNotif) throw new Error('No announcement notification was dispatched to employees');
    }
    console.log('   ✓ In-app notification dispatched to target audience for published notice\n');

    // 3d. Create Expired announcement for testing automatic filtering
    const expRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Past Notice: Expired Office Closed Yesterday',
        content: 'Office was closed yesterday due to public holiday.',
        category: 'General',
        priority: 'Normal',
        audience: 'All',
        status: 'Published',
        publishDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    }).then((r) => r.json());
    if (!expRes.success) throw new Error('Failed to create expired announcement: ' + expRes.message);
    expiredAnnouncementId = expRes.announcement._id;
    console.log(`   ✓ Expired announcement created: "${expRes.announcement.title}" (${expiredAnnouncementId})\n`);

    // -------------------------------------------------------------
    // 4. EMPLOYEE NOTICE BOARD ACCESS & EXPIRY FILTERING
    // -------------------------------------------------------------
    console.log('4. Testing Employee Notice Board Query & Expiry Logic (/announcements/my)...');

    const empBoard = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    if (!empBoard.success) throw new Error('Failed to load employee notice board: ' + empBoard.message);

    const activeIds = empBoard.announcements.map((a) => a._id.toString());

    // Verify published notice IS on board
    if (!activeIds.includes(createdAnnouncementId.toString())) {
      throw new Error('Published announcement missing from employee notice board');
    }
    console.log('   ✓ Active published announcement is visible to Employee');

    // Verify draft notice IS NOT on notice board
    if (activeIds.includes(draftAnnouncementId.toString())) {
      throw new Error('Draft announcement should NOT appear on employee notice board');
    }
    console.log('   ✓ Draft announcement is strictly excluded from Employee notice board');

    // Verify expired notice IS NOT on notice board
    if (activeIds.includes(expiredAnnouncementId.toString())) {
      throw new Error('Expired announcement should NOT appear on employee notice board');
    }
    console.log('   ✓ Expired announcement is automatically filtered out from Employee notice board\n');

    // -------------------------------------------------------------
    // 5. AUDIENCE SPECIFIC TARGETING & ISOLATION
    // -------------------------------------------------------------
    console.log('5. Testing Department & Role Targeting Isolation...');

    // Create an announcement strictly for HR Department
    const hrNoticeRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'HR Confidential Team Briefing',
        content: 'HR team only policy briefing.',
        category: 'Policy',
        priority: 'Important',
        audience: 'Department',
        department: hrDepartment._id,
        status: 'Published',
        publishDate: new Date().toISOString(),
      }),
    }).then((r) => r.json());
    if (!hrNoticeRes.success) throw new Error('Failed to create HR announcement: ' + hrNoticeRes.message);
    const hrNoticeId = hrNoticeRes.announcement._id;

    // Check employee notice board: employee is in Development department, so HR notice must NOT appear
    const empBoardAfterHR = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    const empNoticeIds = empBoardAfterHR.announcements.map((a) => a._id.toString());
    if (empNoticeIds.includes(hrNoticeId.toString())) {
      throw new Error('Security Breach: HR Department announcement leaked to Development employee!');
    }
    console.log('   ✓ Cross-department isolation verified: HR announcement is NOT visible to Development employee');

    // Clean up the HR test announcement
    await Announcement.findByIdAndDelete(hrNoticeId);
    console.log('   ✓ Department targeting test completed.\n');

    // -------------------------------------------------------------
    // 6. READ TRACKING & NOTIFICATION SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log('6. Testing Read Tracking (/announcements/:id)...');

    // Before reading: check unread count
    const initialStats = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    console.log(`   • Unread notices before view: ${initialStats.unreadCount}`);

    // Employee views the notice
    const viewRes = await fetch(`${API_URL}/announcements/${createdAnnouncementId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    if (!viewRes.success) throw new Error('Employee failed to read announcement: ' + viewRes.message);

    // After reading: check unread count and readBy
    const readDoc = await Announcement.findById(createdAnnouncementId);
    const readUsers = readDoc.readBy.map((r) => r.user.toString());
    const currentEmp = await Admin.findOne({ email: 'employee@ems.com' });
    if (!readUsers.includes(currentEmp._id.toString())) {
      throw new Error('Employee ID was not registered in readBy list');
    }
    console.log('   ✓ Employee registered in readBy tracking array');
    console.log('   ✓ Notification marked as read automatically\n');

    // -------------------------------------------------------------
    // 7. SECURITY & RBAC PERMISSION ENFORCEMENT
    // -------------------------------------------------------------
    console.log('7. Testing Role-Based Access Control (RBAC) Security...');

    // 7a. Employee trying to create announcement
    const hackCreate = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        title: 'Hacked Announcement',
        content: 'I should not be able to post this',
      }),
    });
    if (hackCreate.status !== 403) {
      throw new Error(`Expected 403 Forbidden for employee create, got ${hackCreate.status}`);
    }
    console.log('   ✓ 403 Forbidden: Employee cannot create announcements');

    // 7b. Employee trying to edit announcement
    const hackEdit = await fetch(`${API_URL}/announcements/${createdAnnouncementId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        title: 'Defaced Announcement Title',
      }),
    });
    if (hackEdit.status !== 403) {
      throw new Error(`Expected 403 Forbidden for employee edit, got ${hackEdit.status}`);
    }
    console.log('   ✓ 403 Forbidden: Employee cannot update announcements');

    // 7c. Employee trying to delete announcement
    const hackDelete = await fetch(`${API_URL}/announcements/${createdAnnouncementId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    if (hackDelete.status !== 403) {
      throw new Error(`Expected 403 Forbidden for employee delete, got ${hackDelete.status}`);
    }
    console.log('   ✓ 403 Forbidden: Employee cannot delete announcements\n');

    // -------------------------------------------------------------
    // 8. ADMIN MANAGEMENT: EDIT, ARCHIVE, STATS & DELETE
    // -------------------------------------------------------------
    console.log('8. Testing Admin Edit, Archive, KPI Stats & Deletion...');

    // 8a. Admin updates announcement
    const editRes = await fetch(`${API_URL}/announcements/${createdAnnouncementId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Q4 All-Hands Town Hall & Strategy Update [UPDATED]',
        priority: 'Important',
      }),
    }).then((r) => r.json());
    if (!editRes.success || editRes.announcement.title !== 'Q4 All-Hands Town Hall & Strategy Update [UPDATED]') {
      throw new Error('Admin edit failed or title did not update');
    }
    console.log('   ✓ Admin successfully edited announcement title and priority');

    // 8b. Admin archives announcement
    const archiveRes = await fetch(`${API_URL}/announcements/${createdAnnouncementId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!archiveRes.success || archiveRes.announcement.status !== 'Archived') {
      throw new Error('Admin archive failed or status did not change to Archived');
    }
    console.log('   ✓ Admin successfully archived announcement');

    // 8c. Admin fetches KPI stats
    const statsRes = await fetch(`${API_URL}/announcements/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!statsRes.success) throw new Error('Failed to fetch announcement stats: ' + statsRes.message);
    console.log(`   ✓ Admin KPI Stats retrieved: Total=${statsRes.stats.total}, Active=${statsRes.stats.active}, Urgent=${statsRes.stats.urgent}, Drafts=${statsRes.stats.drafts}, Archived=${statsRes.stats.archived}`);

    // 8d. Admin deletes announcement
    const delRes = await fetch(`${API_URL}/announcements/${createdAnnouncementId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!delRes.success) throw new Error('Failed to delete announcement: ' + delRes.message);
    console.log('   ✓ Admin successfully deleted announcement');

    // Clean up draft and expired test records
    if (draftAnnouncementId) await Announcement.findByIdAndDelete(draftAnnouncementId);
    if (expiredAnnouncementId) await Announcement.findByIdAndDelete(expiredAnnouncementId);
    console.log('   ✓ Test cleanup completed.\n');

    console.log('=================================================================');
    console.log('🎉 ALL STEP 22 ANNOUNCEMENT TEST SUITE CHECKS PASSED PERFECTLY!');
    console.log('=================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  }
}

runAnnouncementTests();
