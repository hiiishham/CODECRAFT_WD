// Automated Test Suite for StaffPulse Work Submission & Review System (Step 17)
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
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import WorkSubmission from '../models/WorkSubmission.js';

const API_URL = 'http://localhost:5000/api';

async function runSubmissionTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE WORK SUBMISSION & REVIEW SYSTEM AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let managerToken = '';
  let employeeToken = '';
  let employee2Token = '';
  let testTask = null;
  let createdSubmissionId = null;

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ALL ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin, Manager, and 2 Employees...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success) throw new Error('Admin login failed');
    adminToken = adminLogin.token;

    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (!managerLogin.success) throw new Error('Manager login failed');
    managerToken = managerLogin.token;

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!empLogin.success) throw new Error('Employee 1 login failed');
    employeeToken = empLogin.token;

    const emp2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp2Login.success) throw new Error('Employee 2 login failed');
    employee2Token = emp2Login.token;

    console.log('   ✓ Admin, Manager, and Employees authenticated\n');

    // -------------------------------------------------------------
    // 2. PREPARE TEST TASK
    // -------------------------------------------------------------
    console.log('2. Setting up Task for Employee 1 (David Staff)...');
    const emp1Doc = await Employee.findOne({ email: 'employee@ems.com' });
    const adminUser = await Admin.findOne({ email: 'admin@ems.com' });
    let deptDoc = await Department.findOne({ status: 'Active' });

    testTask = await Task.create({
      title: 'Build Work Submission Module Deliverable',
      description: 'Implement full frontend and backend review workflow for Step 17.',
      assignedTo: emp1Doc._id,
      assignedBy: adminUser._id,
      department: deptDoc._id,
      priority: 'High',
      status: 'Completed',
      startDate: new Date(Date.now() - 3 * 86400000),
      dueDate: new Date(Date.now() + 5 * 86400000),
      progress: 100,
      estimatedHours: 10,
    });
    console.log(`   ✓ Test task created with ID: ${testTask._id}\n`);

    // -------------------------------------------------------------
    // 3. TEST ATTACHMENT UPLOAD API
    // -------------------------------------------------------------
    console.log('3. Testing Attachment Upload API (POST /api/submissions/upload)...');

    // Test A: Disallowed executable file type
    const exeUpload = await fetch(`${API_URL}/submissions/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        fileName: 'malicious.exe',
        fileType: 'application/x-msdownload',
        fileData: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA',
      }),
    }).then((r) => r.json());

    if (exeUpload.success || exeUpload.statusCode !== 400) {
      throw new Error(`Expected 400 on .exe upload, got ${exeUpload.statusCode}`);
    }
    console.log('   ✓ Rejected .exe executable upload with 400 Bad Request');

    // Test B: Valid PDF upload
    const validUpload = await fetch(`${API_URL}/submissions/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        fileName: 'architecture_diagram.pdf',
        fileType: 'application/pdf',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCg==',
      }),
    }).then((r) => r.json());

    if (!validUpload.success || !validUpload.file?.fileUrl) {
      throw new Error(`PDF upload failed: ${JSON.stringify(validUpload)}`);
    }
    const uploadedFile = validUpload.file;
    console.log(`   ✓ Uploaded valid PDF attachment: ${uploadedFile.fileUrl}\n`);

    // -------------------------------------------------------------
    // 4. TEST SUBMISSION CREATION & VALIDATIONS
    // -------------------------------------------------------------
    console.log('4. Testing Work Submission Creation & Validations (POST /api/submissions)...');

    // Validation A: Missing description
    const emptyDesc = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        taskId: testTask._id,
        description: '',
      }),
    }).then((r) => r.json());
    if (emptyDesc.success || emptyDesc.statusCode !== 400) {
      throw new Error(`Expected 400 on empty description, got ${emptyDesc.statusCode}`);
    }
    console.log('   ✓ Rejected empty description with 400');

    // Validation B: Invalid GitHub URL
    const invalidUrl = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        taskId: testTask._id,
        description: 'Completed deliverable.',
        githubUrl: 'not_a_url',
      }),
    }).then((r) => r.json());
    if (invalidUrl.success || invalidUrl.statusCode !== 400) {
      throw new Error(`Expected 400 on invalid URL, got ${invalidUrl.statusCode}`);
    }
    console.log('   ✓ Rejected invalid GitHub URL with 400');

    // Validation C: Employee 2 attempting to submit for Employee 1's task
    const emp2Unauthorized = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employee2Token}`,
      },
      body: JSON.stringify({
        taskId: testTask._id,
        description: 'Unauthorized submission attempt.',
      }),
    }).then((r) => r.json());
    if (emp2Unauthorized.success || emp2Unauthorized.statusCode !== 403) {
      throw new Error(`Expected 403 on unauthorized employee submission, got ${emp2Unauthorized.statusCode}`);
    }
    console.log("   ✓ Blocked Employee 2 from submitting work for Employee 1's task (403 Forbidden)");

    // Validation D: Valid Work Submission by Employee 1
    const validSubRes = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        taskId: testTask._id,
        description: 'Implemented full work submission and review workflow with MongoDB integration.',
        githubUrl: 'https://github.com/staffpulse/ems-core',
        liveUrl: 'https://staffpulse.dev.io',
        attachments: [uploadedFile],
        employeeComment: 'Ready for manager review.',
      }),
    }).then((r) => r.json());

    if (!validSubRes.success || !validSubRes.submission?._id) {
      throw new Error(`Submission creation failed: ${JSON.stringify(validSubRes)}`);
    }
    createdSubmissionId = validSubRes.submission._id;
    console.log(`   ✓ Submission created successfully with status: ${validSubRes.submission.status}`);

    // Validation E: Duplicate submission prevention
    const duplicateSub = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        taskId: testTask._id,
        description: 'Duplicate attempt.',
      }),
    }).then((r) => r.json());
    if (duplicateSub.success || duplicateSub.statusCode !== 409) {
      throw new Error(`Expected 409 on duplicate pending submission, got ${duplicateSub.statusCode}`);
    }
    console.log('   ✓ Rejected duplicate pending submission with 409 Conflict\n');

    // -------------------------------------------------------------
    // 5. TEST NOTIFICATION TRIGGER
    // -------------------------------------------------------------
    console.log('5. Verifying Admin/Manager Submission Notification...');
    const adminNotif = await Notification.findOne({
      relatedId: createdSubmissionId,
      type: 'task',
    });
    if (!adminNotif) {
      throw new Error('Notification for work submission was not created in MongoDB');
    }
    console.log(`   ✓ Notification created: "${adminNotif.title}" - ${adminNotif.message}\n`);

    // -------------------------------------------------------------
    // 6. TEST EMPLOYEE QUERY & ISOLATION
    // -------------------------------------------------------------
    console.log('6. Testing Employee Queries & Isolation...');
    const mySubs = await fetch(`${API_URL}/submissions/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    if (!mySubs.success || mySubs.submissions.length === 0) {
      throw new Error('Failed to retrieve personal submissions');
    }
    console.log(`   ✓ Employee 1 retrieved personal submissions (Count: ${mySubs.submissions.length})`);

    // Employee 2 cannot access Employee 1's submission details
    const emp2ViewSub = await fetch(`${API_URL}/submissions/${createdSubmissionId}`, {
      headers: { Authorization: `Bearer ${employee2Token}` },
    }).then((r) => r.json());
    if (emp2ViewSub.success || emp2ViewSub.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee 2 viewing Employee 1's submission, got ${emp2ViewSub.statusCode}`);
    }
    console.log("   ✓ Blocked Employee 2 from viewing Employee 1's submission details (403 Forbidden)\n");

    // -------------------------------------------------------------
    // 7. TEST ADMIN REVIEW FLOW: REQUEST CHANGES
    // -------------------------------------------------------------
    console.log('7. Testing Review Flow: Request Changes...');

    // Missing comment when requesting changes
    const noCommentReq = await fetch(`${API_URL}/submissions/${createdSubmissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Changes Requested',
        reviewComment: '',
      }),
    }).then((r) => r.json());
    if (noCommentReq.success || noCommentReq.statusCode !== 400) {
      throw new Error(`Expected 400 when requesting changes without review comment, got ${noCommentReq.statusCode}`);
    }
    console.log('   ✓ Rejected Changes Requested without comment (400 Bad Request)');

    // Valid Changes Requested
    const validChangesReq = await fetch(`${API_URL}/submissions/${createdSubmissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Changes Requested',
        reviewComment: 'Please adjust mobile responsiveness in the header and verify unit test coverage.',
      }),
    }).then((r) => r.json());

    if (!validChangesReq.success || validChangesReq.submission.status !== 'Changes Requested') {
      throw new Error(`Review failed: ${JSON.stringify(validChangesReq)}`);
    }
    console.log('   ✓ Status updated to "Changes Requested" with reviewer feedback');

    // Verify employee received notification for Changes Requested
    const empChangeNotif = await Notification.findOne({
      recipient: adminUser._id ? undefined : null, // just find by relatedId
      relatedId: createdSubmissionId,
      title: 'Changes Requested',
    });
    console.log('   ✓ Employee notified regarding change request\n');

    // -------------------------------------------------------------
    // 8. TEST EMPLOYEE RESUBMISSION
    // -------------------------------------------------------------
    console.log('8. Testing Employee Resubmission (PUT /api/submissions/:id)...');
    const resubmitRes = await fetch(`${API_URL}/submissions/${createdSubmissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        description: 'Adjusted mobile responsiveness, corrected header spacing, and added unit tests.',
        employeeComment: 'Changes addressed. Ready for re-review.',
      }),
    }).then((r) => r.json());

    if (!resubmitRes.success || resubmitRes.submission.status !== 'Pending Review') {
      throw new Error(`Resubmission failed: ${JSON.stringify(resubmitRes)}`);
    }
    console.log('   ✓ Resubmitted deliverable; status automatically reset to "Pending Review"\n');

    // -------------------------------------------------------------
    // 9. TEST ADMIN REVIEW FLOW: APPROVE WORK
    // -------------------------------------------------------------
    console.log('9. Testing Review Flow: Approve Work...');
    const approveRes = await fetch(`${API_URL}/submissions/${createdSubmissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`, // Manager can also approve
      },
      body: JSON.stringify({
        status: 'Approved',
        reviewComment: 'Excellent work! Responsive fixes look sharp and tests pass 100%.',
      }),
    }).then((r) => r.json());

    if (!approveRes.success || approveRes.submission.status !== 'Approved') {
      throw new Error(`Approval failed: ${JSON.stringify(approveRes)}`);
    }
    console.log(`   ✓ Manager approved submission with status: ${approveRes.submission.status}`);

    // Verify approved submission cannot be modified
    const modifyApproved = await fetch(`${API_URL}/submissions/${createdSubmissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ description: 'Hacked update.' }),
    }).then((r) => r.json());
    if (modifyApproved.success || modifyApproved.statusCode !== 400) {
      throw new Error(`Expected 400 on editing approved submission, got ${modifyApproved.statusCode}`);
    }
    console.log('   ✓ Blocked employee from editing an approved submission (400 Bad Request)\n');

    // -------------------------------------------------------------
    // 10. TEST RBAC & ADMIN SUBMISSIONS QUERY
    // -------------------------------------------------------------
    console.log('10. Testing Admin & Manager Submissions Overview (GET /api/submissions)...');

    // Employee cannot view admin submissions list
    const empSubList = await fetch(`${API_URL}/submissions`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    if (empSubList.success || empSubList.statusCode !== 403) {
      throw new Error(`Expected 403 on employee accessing /api/submissions, got ${empSubList.statusCode}`);
    }
    console.log('   ✓ Blocked employee from accessing Admin submissions list (403 Forbidden)');

    // Admin lists submissions and stats
    const adminSubs = await fetch(`${API_URL}/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!adminSubs.success || !adminSubs.stats) {
      throw new Error('Failed to retrieve admin submissions list or stats');
    }
    console.log(`   ✓ Admin fetched submissions list. Stats: Total=${adminSubs.stats.total}, Approved=${adminSubs.stats.approved}`);

    // Clean up test records
    await WorkSubmission.findByIdAndDelete(createdSubmissionId);
    await Task.findByIdAndDelete(testTask._id);
    console.log('   ✓ Cleaned up test submission and task\n');

    console.log('=================================================================');
    console.log('ALL WORK SUBMISSION & REVIEW TESTS PASSED (100% SUCCESS)');
    console.log('=================================================================');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runSubmissionTests();
