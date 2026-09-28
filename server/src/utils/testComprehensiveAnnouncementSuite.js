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
import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

let testPassed = 0;
let testFailed = 0;

function recordResult(category, description, passed, detail = '') {
  if (passed) {
    testPassed++;
    console.log(`✅ PASS [${category}] ${description} ${detail ? `(${detail})` : ''}`);
  } else {
    testFailed++;
    console.error(`❌ FAIL [${category}] ${description} ${detail ? `(${detail})` : ''}`);
  }
}

async function runComprehensiveAnnouncementSuite() {
  console.log('=================================================================');
  console.log('STAFFPULSE ANNOUNCEMENTS COMPREHENSIVE QA & SECURITY SUITE');
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

  let devDept = null;
  let hrDept = null;

  let testAnnId = null;
  let draftAnnId = null;
  let expiredAnnId = null;
  let futureAnnId = null;
  let devDeptAnnId = null;
  let hrDeptAnnId = null;
  let mgrOnlyAnnId = null;

  try {
    // -----------------------------------------------------------------
    // 0. AUTHENTICATION & SETUP
    // -----------------------------------------------------------------
    console.log('--- 0. AUTHENTICATION & ENVIRONMENT SETUP ---');

    // Ensure departments exist
    devDept = await Department.findOne({ name: 'Development' });
    if (!devDept) {
      devDept = await Department.create({ name: 'Development', description: 'Software Development' });
    }
    hrDept = await Department.findOne({ name: 'Human Resources' });
    if (!hrDept) {
      hrDept = await Department.create({ name: 'Human Resources', description: 'HR and People Ops' });
    }

    // Login Admin
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    adminToken = adminRes.token;
    adminUser = adminRes.user;

    // Login Manager
    const mgrRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    managerToken = mgrRes.token;
    managerUser = mgrRes.user;

    // Login Employee 1 (Dev)
    const emp1Res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    emp1Token = emp1Res.token;
    emp1User = emp1Res.user;

    // Ensure Employee 1 is in Development
    await Employee.findOneAndUpdate(
      { email: 'employee@ems.com' },
      { department: 'Development' },
      { upsert: true }
    );

    // Login Employee 2 (HR / Finance)
    const emp2Res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    emp2Token = emp2Res.token;
    emp2User = emp2Res.user;

    // Ensure Employee 2 is in Human Resources
    await Employee.findOneAndUpdate(
      { email: 'employee2@ems.com' },
      { department: 'Human Resources' },
      { upsert: true }
    );

    recordResult('Authentication', 'Admin, Manager, and 2 Employees authenticated successfully', !!(adminToken && managerToken && emp1Token && emp2Token));

    // -----------------------------------------------------------------
    // 1. ARCHITECTURE & SCHEMA INDEXES
    // -----------------------------------------------------------------
    console.log('\n--- 1. ARCHITECTURE & SCHEMA VALIDATION ---');
    const indexes = await Announcement.collection.indexes();
    const hasStatusPublishIndex = indexes.some((idx) => idx.key.status === 1 && idx.key.publishDate === -1);
    const hasAudienceDeptIndex = indexes.some((idx) => idx.key.audience === 1 && idx.key.department === 1);
    recordResult('Architecture', 'Announcement model has compound status/publishDate index', hasStatusPublishIndex);
    recordResult('Architecture', 'Announcement model has audience/department compound index', hasAudienceDeptIndex);

    // -----------------------------------------------------------------
    // 2. INPUT VALIDATIONS
    // -----------------------------------------------------------------
    console.log('\n--- 2. INPUT VALIDATIONS ---');

    // 2a. Missing title
    const emptyTitleRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: '', content: 'Some valid content here' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects empty title with 400', emptyTitleRes.statusCode === 400);

    // 2b. Missing content
    const emptyContentRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Valid Title', content: '' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects empty content with 400', emptyContentRes.statusCode === 400);

    // 2c. Invalid category
    const invalidCatRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Valid Title', content: 'Valid Content', category: 'InvalidCategoryXYZ' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects invalid category enum with 400', invalidCatRes.statusCode === 400);

    // 2d. Invalid priority
    const invalidPrioRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Valid Title', content: 'Valid Content', priority: 'SuperUrgent' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects invalid priority enum with 400', invalidPrioRes.statusCode === 400);

    // 2e. Invalid audience
    const invalidAudRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Valid Title', content: 'Valid Content', audience: 'Guests' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects invalid audience enum with 400', invalidAudRes.statusCode === 400);

    // 2f. Audience = Department without department ID
    const missingDeptRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Valid Title', content: 'Valid Content', audience: 'Department' }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects Audience=Department when department is missing with 400', missingDeptRes.statusCode === 400);

    // 2g. Expiry date before publish date
    const invalidExpiryRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Valid Title',
        content: 'Valid Content',
        publishDate: new Date('2026-09-25T10:00:00Z'),
        expiryDate: new Date('2026-09-20T10:00:00Z'),
      }),
    }).then((r) => r.json());
    recordResult('Input Validation', 'Rejects expiryDate earlier than publishDate with 400', invalidExpiryRes.statusCode === 400);

    // -----------------------------------------------------------------
    // 3. ADMIN LIST & KPI STATS
    // -----------------------------------------------------------------
    console.log('\n--- 3. ADMIN LIST & KPI STATS ---');
    const adminListRes = await fetch(`${API_URL}/announcements?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult('Admin List', 'Admin retrieves announcements list with pagination metadata', adminListRes.success && Array.isArray(adminListRes.announcements));

    const statsRes = await fetch(`${API_URL}/announcements/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult('KPI Stats', 'Admin retrieves announcement stats (total, active, urgent, drafts, archived)', statsRes.success && typeof statsRes.stats?.total === 'number');

    // -----------------------------------------------------------------
    // 4. CREATION OF ANNOUNCEMENTS (DRAFT, PUBLISHED, EXPIRED, SCHEDULED)
    // -----------------------------------------------------------------
    console.log('\n--- 4. CREATING ANNOUNCEMENTS ACROSS LIFECYCLE STATES ---');

    // 4a. Draft
    const draftRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Confidential Internal Draft: Org Restructuring',
        content: 'This announcement is strictly draft and under executive review.',
        category: 'Policy',
        priority: 'Important',
        audience: 'All',
        status: 'Draft',
      }),
    }).then((r) => r.json());
    draftAnnId = draftRes.announcement?._id;
    recordResult('Create Announcement', 'Admin creates Draft announcement successfully', draftRes.statusCode === 201 && draftRes.announcement.status === 'Draft');

    // 4b. Published (Audience: All)
    const pubAllRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Company-Wide Holiday Notice: Q4 Observance',
        content: 'All offices will observe holiday on the coming Friday. Enjoy the extended weekend!',
        category: 'Holiday',
        priority: 'Normal',
        audience: 'All',
        status: 'Published',
      }),
    }).then((r) => r.json());
    testAnnId = pubAllRes.announcement?._id;
    recordResult('Create Announcement', 'Admin creates Published announcement with Audience=All', pubAllRes.statusCode === 201 && pubAllRes.announcement.status === 'Published');

    // 4c. Expired (Yesterday)
    const expRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Past Notice: Maintenance Finished Yesterday',
        content: 'System upgrades were finalized yesterday evening.',
        category: 'General',
        priority: 'Normal',
        audience: 'All',
        status: 'Published',
        publishDate: new Date(Date.now() - 48 * 3600 * 1000),
        expiryDate: new Date(Date.now() - 24 * 3600 * 1000),
      }),
    }).then((r) => r.json());
    expiredAnnId = expRes.announcement?._id;
    recordResult('Create Announcement', 'Admin creates Expired announcement', expRes.statusCode === 201);

    // 4d. Scheduled Future (Tomorrow)
    const futRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Upcoming Scheduled Notice: Next Month Kickoff',
        content: 'This announcement goes live tomorrow at 9 AM.',
        category: 'Event',
        priority: 'Normal',
        audience: 'All',
        status: 'Published',
        publishDate: new Date(Date.now() + 24 * 3600 * 1000),
      }),
    }).then((r) => r.json());
    futureAnnId = futRes.announcement?._id;
    recordResult('Create Announcement', 'Admin creates scheduled Future announcement', futRes.statusCode === 201);

    // -----------------------------------------------------------------
    // 5. AUDIENCE TARGETING: EMPLOYEES & MANAGERS
    // -----------------------------------------------------------------
    console.log('\n--- 5. AUDIENCE TARGETING: EMPLOYEES & MANAGERS ---');

    // Managers-only announcement
    const mgrOnlyRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Confidential: Manager Quarterly Performance Calibration',
        content: 'Leadership briefing for managers only.',
        category: 'Meeting',
        priority: 'Urgent',
        audience: 'Managers',
        status: 'Published',
      }),
    }).then((r) => r.json());
    mgrOnlyAnnId = mgrOnlyRes.announcement?._id;

    // Check Manager notice board
    const mgrBoard = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    const mgrHasNotice = mgrBoard.announcements?.some((a) => a._id === mgrOnlyAnnId);
    recordResult('Audience Targeting', 'Manager receives Audience=Managers announcement in notice board', mgrHasNotice);

    // Check Employee notice board (Must NOT contain Managers notice)
    const empBoard = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    const empHasMgrNotice = empBoard.announcements?.some((a) => a._id === mgrOnlyAnnId);
    recordResult('Audience Targeting', 'Employee notice board strictly excludes Audience=Managers notice', !empHasMgrNotice);

    // -----------------------------------------------------------------
    // 6. DEPARTMENT TARGETING (DEVELOPMENT VS HUMAN RESOURCES)
    // -----------------------------------------------------------------
    console.log('\n--- 6. DEPARTMENT TARGETING ---');

    // Create Dev Department Announcement
    const devAnnRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Dev Team Alert: API v2 Deprecation Schedule',
        content: 'All software engineering staff must transition endpoints to v2.',
        category: 'Policy',
        priority: 'Urgent',
        audience: 'Department',
        department: devDept._id,
        status: 'Published',
      }),
    }).then((r) => r.json());
    devDeptAnnId = devAnnRes.announcement?._id;

    // Create HR Department Announcement
    const hrAnnRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'HR Team Notice: Internal Benefits Open Enrollment',
        content: 'Benefits renewal procedures for HR personnel.',
        category: 'HR',
        priority: 'Normal',
        audience: 'Department',
        department: hrDept._id,
        status: 'Published',
      }),
    }).then((r) => r.json());
    hrDeptAnnId = hrAnnRes.announcement?._id;

    // Check Dev Employee (emp1) Notice Board
    const devEmpBoard = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    const devEmpSeesDev = devEmpBoard.announcements?.some((a) => a._id === devDeptAnnId);
    const devEmpSeesHR = devEmpBoard.announcements?.some((a) => a._id === hrDeptAnnId);
    recordResult('Department Targeting', 'Development employee sees Development department announcement', devEmpSeesDev);
    recordResult('Department Targeting', 'Development employee CANNOT see HR department announcement', !devEmpSeesHR);

    // Check HR Employee (emp2) Notice Board
    const hrEmpBoard = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    }).then((r) => r.json());
    const hrEmpSeesHR = hrEmpBoard.announcements?.some((a) => a._id === hrDeptAnnId);
    const hrEmpSeesDev = hrEmpBoard.announcements?.some((a) => a._id === devDeptAnnId);
    recordResult('Department Targeting', 'HR employee sees HR department announcement', hrEmpSeesHR);
    recordResult('Department Targeting', 'HR employee CANNOT see Development department announcement', !hrEmpSeesDev);

    // -----------------------------------------------------------------
    // 7. DRAFT & EXPIRY ISOLATION IN NOTICE BOARD
    // -----------------------------------------------------------------
    console.log('\n--- 7. DRAFT, FUTURE & EXPIRY ISOLATION ---');
    const empNoticeIds = devEmpBoard.announcements?.map((a) => a._id) || [];
    const empSeesDraft = empNoticeIds.includes(draftAnnId);
    const empSeesExpired = empNoticeIds.includes(expiredAnnId);
    const empSeesFuture = empNoticeIds.includes(futureAnnId);

    recordResult('Draft Isolation', 'Employee notice board strictly excludes Draft announcements', !empSeesDraft);
    recordResult('Expiry Isolation', 'Employee notice board strictly excludes Expired announcements', !empSeesExpired);
    recordResult('Future Isolation', 'Employee notice board strictly excludes Future scheduled announcements', !empSeesFuture);

    // -----------------------------------------------------------------
    // 8. IDOR / BOLA SECURITY MATRIX (DIRECT GET BY ID)
    // -----------------------------------------------------------------
    console.log('\n--- 8. IDOR / BOLA SECURITY MATRIX (DIRECT GET) ---');

    // 8a. Employee direct access to Draft -> 403 Forbidden
    const empDraftAccess = await fetch(`${API_URL}/announcements/${draftAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR Security', 'Employee blocked from direct access to Draft announcement (403 Forbidden)', empDraftAccess.status === 403);

    // 8b. Employee direct access to Expired announcement -> 403 Forbidden
    const empExpiredAccess = await fetch(`${API_URL}/announcements/${expiredAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR Security', 'Employee blocked from direct access to Expired announcement (403 Forbidden)', empExpiredAccess.status === 403);

    // 8c. Employee direct access to Future scheduled announcement -> 403 Forbidden
    const empFutureAccess = await fetch(`${API_URL}/announcements/${futureAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR Security', 'Employee blocked from direct access to Future scheduled announcement (403 Forbidden)', empFutureAccess.status === 403);

    // 8d. Employee direct access to Other Department announcement -> 403 Forbidden
    const empCrossDeptAccess = await fetch(`${API_URL}/announcements/${hrDeptAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR Security', 'Employee blocked from direct access to another department announcement (403 Forbidden)', empCrossDeptAccess.status === 403);

    // 8e. Employee direct access to Managers-only announcement -> 403 Forbidden
    const empMgrOnlyAccess = await fetch(`${API_URL}/announcements/${mgrOnlyAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR Security', 'Employee blocked from direct access to Managers-only announcement (403 Forbidden)', empMgrOnlyAccess.status === 403);

    // 8f. Authorized access to own announcement -> 200 OK + auto read tracking
    const empAuthorizedAccess = await fetch(`${API_URL}/announcements/${testAnnId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Authorized Access', 'Employee retrieves authorized announcement with 200 OK', empAuthorizedAccess.statusCode === 200);

    // Verify auto-mark as read tracking
    const updatedAnn = await Announcement.findById(testAnnId);
    const readRecorded = updatedAnn.readBy?.some((r) => r.user.toString() === emp1User.id || r.user.toString() === emp1User._id);
    recordResult('Read Tracking', 'Opening announcement registers user in readBy tracking array', !!readRecorded);

    // -----------------------------------------------------------------
    // 9. RBAC PERMISSIONS (EMPLOYEE FORBIDDEN ACTIONS)
    // -----------------------------------------------------------------
    console.log('\n--- 9. RBAC PERMISSIONS ENFORCEMENT ---');

    // 9a. Employee cannot create announcements
    const empCreateRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ title: 'Hacked Title', content: 'Unauthorized content' }),
    });
    recordResult('RBAC Security', 'Employee creating announcement is rejected with 403 Forbidden', empCreateRes.status === 403);

    // 9b. Employee cannot update announcements
    const empUpdateRes = await fetch(`${API_URL}/announcements/${testAnnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ title: 'Hacked Edit Title' }),
    });
    recordResult('RBAC Security', 'Employee updating announcement is rejected with 403 Forbidden', empUpdateRes.status === 403);

    // 9c. Employee cannot archive announcements
    const empArchiveRes = await fetch(`${API_URL}/announcements/${testAnnId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('RBAC Security', 'Employee archiving announcement is rejected with 403 Forbidden', empArchiveRes.status === 403);

    // 9d. Employee cannot delete announcements
    const empDeleteRes = await fetch(`${API_URL}/announcements/${testAnnId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('RBAC Security', 'Employee deleting announcement is rejected with 403 Forbidden', empDeleteRes.status === 403);

    // 9e. Employee cannot access Admin announcement list
    const empListRes = await fetch(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('RBAC Security', 'Employee accessing Admin announcement list is rejected with 403 Forbidden', empListRes.status === 403);

    // -----------------------------------------------------------------
    // 10. EDIT & ARCHIVE LIFECYCLE
    // -----------------------------------------------------------------
    console.log('\n--- 10. EDIT, ARCHIVE & DRAFT PUBLISH ---');

    // 10a. Admin edits announcement
    const editRes = await fetch(`${API_URL}/announcements/${testAnnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Company-Wide Holiday Notice: Q4 Observance (Updated Schedule)',
        priority: 'Important',
      }),
    }).then((r) => r.json());
    recordResult('Edit Announcement', 'Admin updates announcement title and priority successfully', editRes.statusCode === 200 && editRes.announcement.priority === 'Important');

    // 10b. Publish Draft -> verifies status becomes Published
    const pubDraftRes = await fetch(`${API_URL}/announcements/${draftAnnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Published' }),
    }).then((r) => r.json());
    recordResult('Publish Draft', 'Admin publishes draft announcement successfully', pubDraftRes.statusCode === 200 && pubDraftRes.announcement.status === 'Published');

    // 10c. Archive announcement
    const archiveRes = await fetch(`${API_URL}/announcements/${testAnnId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult('Archive Announcement', 'Admin archives announcement successfully', archiveRes.statusCode === 200 && archiveRes.announcement.status === 'Archived');

    // Verify archived announcement is no longer visible on employee board
    const empBoardAfterArchive = await fetch(`${API_URL}/announcements/my`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    const empSeesArchived = empBoardAfterArchive.announcements?.some((a) => a._id === testAnnId);
    recordResult('Archive Isolation', 'Archived announcement immediately disappears from active Employee notice board', !empSeesArchived);

    // -----------------------------------------------------------------
    // 11. ATTACHMENT UPLOAD RESILIENCY
    // -----------------------------------------------------------------
    console.log('\n--- 11. ATTACHMENT UPLOAD RESILIENCY ---');

    // Test base64 JSON upload (used by AddAnnouncementPage / EditAnnouncementPage)
    const base64DataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==';
    const uploadRes = await fetch(`${API_URL}/announcements/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        fileName: 'Q4_Policy_Document.pdf',
        fileData: base64DataUrl,
        fileType: 'application/pdf',
      }),
    }).then((r) => r.json());
    recordResult('Attachment Upload', 'Uploads attachment via JSON base64 with local fallback/cloud support', uploadRes.statusCode === 201 && !!(uploadRes.file || uploadRes.files?.length));

    // -----------------------------------------------------------------
    // 12. REAL-TIME SOCKET.IO NOTIFICATION INTEGRATION
    // -----------------------------------------------------------------
    console.log('\n--- 12. REAL-TIME SOCKET.IO NOTIFICATIONS ---');
    let socketConnected = false;
    let receivedSocketNotif = null;

    const socket = Client(SOCKET_URL, {
      auth: { token: emp1Token },
      transports: ['websocket'],
      reconnection: false,
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        socketConnected = true;
        resolve();
      });
      setTimeout(resolve, 1500);
    });
    recordResult('Socket.IO Connection', 'Employee connects to Socket.IO room with JWT auth', socketConnected);

    socket.on('notification:new', (notif) => {
      receivedSocketNotif = notif;
    });

    // Create an announcement targeting All to trigger real-time notification
    const realTimeAnnRes = await fetch(`${API_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Emergency Server Maintenance in 10 Minutes',
        content: 'Brief server restart scheduled for security patching.',
        category: 'Urgent',
        priority: 'Urgent',
        audience: 'All',
        status: 'Published',
      }),
    }).then((r) => r.json());

    // Wait up to 3 seconds for Socket.IO event
    await new Promise((res) => setTimeout(res, 2000));
    socket.disconnect();

    recordResult('Real-Time Delivery', 'Employee receives real-time announcement notification via isolated Socket.IO room', !!receivedSocketNotif);

    // -----------------------------------------------------------------
    // 13. GLOBAL SEARCH SECURITY
    // -----------------------------------------------------------------
    console.log('\n--- 13. GLOBAL SEARCH SECURITY ---');

    // Search query for announcements as Dev Employee
    const empSearchRes = await fetch(`${API_URL}/search?q=Maintenance&module=announcements`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const searchAnnouncements = empSearchRes.results?.announcements || [];
    const searchHasExpired = searchAnnouncements.some((a) => a._id === expiredAnnId);
    const searchHasDraft = searchAnnouncements.some((a) => a._id === draftAnnId);

    recordResult('Global Search Security', 'Global search omits expired announcements for Employee', !searchHasExpired);
    recordResult('Global Search Security', 'Global search omits draft announcements for Employee', !searchHasDraft);

    // -----------------------------------------------------------------
    // 14. EMPLOYEE DASHBOARD INTEGRATION
    // -----------------------------------------------------------------
    console.log('\n--- 14. EMPLOYEE DASHBOARD INTEGRATION ---');
    const empDashRes = await fetch(`${API_URL}/employee/dashboard`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const dashAnnouncements = empDashRes.data?.announcements || [];
    const dashHasExpired = dashAnnouncements.some((a) => a._id === expiredAnnId);
    const dashHasDraft = dashAnnouncements.some((a) => a._id === draftAnnId);
    const dashHasHR = dashAnnouncements.some((a) => a._id === hrDeptAnnId);

    recordResult('Dashboard Integration', 'Employee dashboard retrieves active announcements successfully', Array.isArray(dashAnnouncements));
    recordResult('Dashboard Integration', 'Employee dashboard excludes expired announcements', !dashHasExpired);
    recordResult('Dashboard Integration', 'Employee dashboard excludes draft announcements', !dashHasDraft);
    recordResult('Dashboard Integration', 'Employee dashboard excludes other department announcements', !dashHasHR);

    // -----------------------------------------------------------------
    // 15. AUDIT TRAIL LOGGING
    // -----------------------------------------------------------------
    console.log('\n--- 15. AUDIT TRAIL LOGGING ---');
    const auditLogs = await AuditLog.find({ module: 'ANNOUNCEMENT' }).sort({ createdAt: -1 }).limit(5);
    const hasCreateLog = auditLogs.some((l) => l.action === 'CREATE');
    const hasUpdateLog = auditLogs.some((l) => l.action === 'UPDATE');
    recordResult('Audit Logs', 'Announcement creation is recorded in AuditLog', hasCreateLog);
    recordResult('Audit Logs', 'Announcement update/archive is recorded in AuditLog', hasUpdateLog);

    // -----------------------------------------------------------------
    // 16. DELETE ANNOUNCEMENT & CLEANUP
    // -----------------------------------------------------------------
    console.log('\n--- 16. DELETE ANNOUNCEMENT & NOTIFICATION CLEANUP ---');
    const delRes = await fetch(`${API_URL}/announcements/${testAnnId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult('Delete Announcement', 'Admin deletes announcement successfully (200 OK)', delRes.statusCode === 200);

    const deletedInDb = await Announcement.findById(testAnnId);
    recordResult('Delete Announcement', 'Announcement record is removed from MongoDB', deletedInDb === null);

    const orphanNotifs = await Notification.countDocuments({ type: 'announcement', relatedId: testAnnId });
    recordResult('Notification Cleanup', 'Related notifications are cleaned up upon announcement deletion', orphanNotifs === 0);

    // -----------------------------------------------------------------
    // 17. NEGATIVE & API SECURITY TESTS
    // -----------------------------------------------------------------
    console.log('\n--- 17. NEGATIVE & API SECURITY TESTS ---');

    // 17a. Unauthenticated request -> 401
    const unauthRes = await fetch(`${API_URL}/announcements`);
    recordResult('API Security', 'Unauthenticated request to GET /api/announcements returns 401', unauthRes.status === 401);

    // 17b. Invalid ObjectId format -> 400
    const malformedIdRes = await fetch(`${API_URL}/announcements/invalid-123-id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Malformed announcement ObjectId returns 400 Bad Request', malformedIdRes.status === 400);

    // 17c. Non-existent ObjectId -> 404
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${API_URL}/announcements/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Non-existent announcement ID returns 404 Not Found safely', notFoundRes.status === 404);

  } catch (error) {
    console.error('Test execution error:', error);
    testFailed++;
  } finally {
    console.log('\n=================================================================');
    console.log('ANNOUNCEMENTS QA & SECURITY SUITE SUMMARY');
    console.log('=================================================================');
    console.log(`TOTAL TESTS : ${testPassed + testFailed}`);
    console.log(`PASSED      : ${testPassed}`);
    console.log(`FAILED      : ${testFailed}`);

    if (testFailed === 0) {
      console.log('\n🎉 ALL COMPREHENSIVE ANNOUNCEMENTS QA TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error(`\n❌ ${testFailed} TEST(S) FAILED.\n`);
    }

    await mongoose.disconnect();
  }
}

runComprehensiveAnnouncementSuite();
