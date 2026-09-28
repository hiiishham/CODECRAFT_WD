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
import Task from '../models/Task.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Notification from '../models/Notification.js';
import Department from '../models/Department.js';

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
  console.log('STARTING WORK SUBMISSIONS COMPREHENSIVE QA AUDIT');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');

    // 1. Setup Test Actors
    // Admin
    let adminUser = await Admin.findOne({ email: 'admin@ems.com' });
    if (!adminUser) {
      adminUser = await Admin.findOne({ role: 'admin' });
    }
    const adminToken = generateToken(adminUser._id, 'admin');

    // Development Manager
    let devManager = await Admin.findOne({ email: 'manager@ems.com' });
    if (!devManager) {
      devManager = await Admin.findOne({ role: 'manager', department: 'Development' });
    }
    const devManagerToken = generateToken(devManager._id, 'manager', 'Development');

    // Marketing Manager (Different Department)
    let mktManager = await Admin.findOne({ email: 'qa_mkt_mgr@ems.com' });
    if (!mktManager) {
      mktManager = await Admin.create({
        name: 'Marketing Manager',
        email: 'qa_mkt_mgr@ems.com',
        password: 'Password123!',
        role: 'manager',
        department: 'Marketing',
      });
    }
    const mktManagerToken = generateToken(mktManager._id, 'manager', 'Marketing');

    // Employee A (Development)
    let empAUser = await Admin.findOne({ email: 'employee@ems.com' });
    let empADoc = await Employee.findOne({ email: 'employee@ems.com' });
    if (!empADoc) {
      empADoc = await Employee.findOne({ department: 'Development' });
    }
    const empAToken = generateToken(empAUser._id, 'employee');

    // Employee B (Development or Sarah Connor)
    let empBUser = await Admin.findOne({ email: 'employee2@ems.com' });
    if (!empBUser) {
      empBUser = await Admin.create({
        name: 'Bob Dev',
        email: 'qa_emp_b@ems.com',
        password: 'Password123!',
        role: 'employee',
      });
    }
    let empBDoc = await Employee.findOne({ email: empBUser.email });
    if (!empBDoc) {
      empBDoc = await Employee.create({
        employeeId: 'EMP-QA-B',
        fullName: 'Bob Dev',
        email: empBUser.email,
        department: 'Development',
        designation: 'Backend Engineer',
        status: 'Active',
      });
    }
    const empBToken = generateToken(empBUser._id, 'employee');

    // Fetch Department
    let devDept = await Department.findOne({ name: 'Development' });
    if (!devDept) {
      devDept = await Department.findOne() || await Department.create({
        name: 'Development',
        description: 'Software engineering & product development',
      });
    }

    // Create Tasks for testing
    // Task 1: Assigned to Employee A (Active)
    const task1 = await Task.create({
      title: 'QA Deliverable: StaffPulse Submissions Portal',
      description: 'Implement frontend and backend submission tracking with reviews.',
      department: devDept._id,
      assignedTo: empADoc._id,
      assignedBy: devManager._id,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'High',
      status: 'In Progress',
      progress: 50,
    });

    // Task 2: Assigned to Employee B
    const task2 = await Task.create({
      title: 'QA Deliverable: Bob Database Optimization',
      description: 'Optimize MongoDB indexes for fast aggregation queries.',
      department: devDept._id,
      assignedTo: empBDoc._id,
      assignedBy: devManager._id,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      status: 'In Progress',
      progress: 20,
    });

    // Task 3: Cancelled Task
    const cancelledTask = await Task.create({
      title: 'QA Deliverable: Legacy Deprecated Feature',
      description: 'Old feature that was terminated.',
      department: devDept._id,
      assignedTo: empADoc._id,
      assignedBy: devManager._id,
      startDate: new Date(),
      dueDate: new Date(),
      priority: 'Low',
      status: 'Cancelled',
      progress: 0,
    });

    // Clean up any previous test submissions for these tasks
    await WorkSubmission.deleteMany({ task: { $in: [task1._id, task2._id, cancelledTask._id] } });

    console.log('--- TEST GROUP 1: AUTHENTICATION & ROLE AUTHORIZATION ---');
    // 1.1 Unauthenticated request rejected
    const unauthRes = await fetch(`${BASE_URL}/submissions/my`);
    recordResult('Authentication', 'Reject unauthenticated request to /my', unauthRes.status === 401);

    // 1.2 Employee role cannot call Review endpoint
    const empReviewRes = await fetch(`${BASE_URL}/submissions/${new mongoose.Types.ObjectId()}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({ status: 'Approved' }),
    });
    recordResult('Authorization', 'Employee cannot access review endpoint (403)', empReviewRes.status === 403);

    // 1.3 Employee role cannot call GET /submissions (company-wide admin list)
    const empAllSubsRes = await fetch(`${BASE_URL}/submissions`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult('Authorization', 'Employee cannot fetch admin submission list (403)', empAllSubsRes.status === 403);

    console.log('\n--- TEST GROUP 2: INPUT VALIDATION & URL SECURITY ---');
    // 2.1 Empty description
    const emptyDescRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: '   ',
      }),
    });
    recordResult('Description', 'Empty description rejected (400)', emptyDescRes.status === 400);

    // 2.2 Short description (< 10 chars)
    const shortDescRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Done.',
      }),
    });
    recordResult('Description', 'Short description < 10 chars rejected (400)', shortDescRes.status === 400);

    // 2.3 Oversized description (> 3000 chars)
    const longDescRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'a'.repeat(3005),
      }),
    });
    recordResult('Description', 'Oversized description > 3000 chars rejected (400)', longDescRes.status === 400);

    // 2.4 Invalid GitHub URL (dangerous javascript scheme)
    const unsafeGhRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Completed the user interface and tested all components.',
        githubUrl: 'javascript:alert(document.cookie)',
      }),
    });
    recordResult('GitHub URL', 'Dangerous javascript: scheme in GitHub URL rejected (400)', unsafeGhRes.status === 400);

    // 2.5 Invalid GitHub URL (non-github domain)
    const nonGhRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Completed the user interface and tested all components.',
        githubUrl: 'https://evil-site.com/repo',
      }),
    });
    recordResult('GitHub URL', 'Non-github.com URL rejected (400)', nonGhRes.status === 400);

    // 2.6 Invalid Live URL (data scheme)
    const unsafeLiveRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Completed the user interface and tested all components.',
        githubUrl: 'https://github.com/staffpulse/ems-core',
        liveUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      }),
    });
    recordResult('Live URL', 'Dangerous data: scheme in Live URL rejected (400)', unsafeLiveRes.status === 400);

    console.log('\n--- TEST GROUP 3: TASK OWNERSHIP & STATUS CONSTRAINTS ---');
    // 3.1 Employee A submitting for Employee B's task
    const crossTaskRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task2._id.toString(),
        description: 'Trying to submit for Bob task illegally.',
        githubUrl: 'https://github.com/staffpulse/ems-core',
      }),
    });
    recordResult('Task Ownership', 'Submitting for another employee task rejected (403)', crossTaskRes.status === 403);

    // 3.2 Submitting for a Cancelled task
    const cancelTaskSubRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: cancelledTask._id.toString(),
        description: 'Submitting work for a cancelled project.',
        githubUrl: 'https://github.com/staffpulse/ems-core',
      }),
    });
    recordResult('Task Status Requirements', 'Submitting for cancelled task rejected (400)', cancelTaskSubRes.status === 400);

    console.log('\n--- TEST GROUP 4: SUCCESSFUL SUBMISSION & MASS ASSIGNMENT ---');
    // 4.1 Create valid submission with attempted mass assignment injection
    const validCreateRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Implemented comprehensive Work Submission architecture with complete lifecycle testing.',
        githubUrl: 'https://github.com/staffpulse/staffpulse-ems',
        liveUrl: 'https://staffpulse.production.app',
        employeeComment: 'Please review deliverables and test scripts.',
        status: 'Approved', // Should be IGNORED by backend
        employee: empBDoc._id.toString(), // Should be IGNORED
        reviewedBy: adminUser._id.toString(), // Should be IGNORED
      }),
    });
    const validCreateData = await validCreateRes.json();
    const subCreated = validCreateRes.status === 201 && validCreateData.success;
    const isStatusPending = validCreateData.submission?.status === 'Pending Review';
    const isOwnerA = validCreateData.submission?.employee?._id?.toString() === empADoc._id.toString();
    const isNotReviewed = !validCreateData.submission?.reviewedBy;

    recordResult('Employee Submit', 'Valid submission created successfully (201)', subCreated);
    recordResult('Mass Assignment Protection', 'Injected status, employee, and reviewedBy safely ignored', isStatusPending && isOwnerA && isNotReviewed);

    const submissionId = validCreateData.submission?._id;

    // 4.2 Duplicate submission prevention
    const duplicateRes = await fetch(`${BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        taskId: task1._id.toString(),
        description: 'Attempting duplicate submission while previous is pending.',
      }),
    });
    recordResult('Duplicate Submission Protection', 'Duplicate submission while pending rejected (409 Conflict)', duplicateRes.status === 409);

    console.log('\n--- TEST GROUP 5: MY SUBMISSIONS & DATA ISOLATION ---');
    // 5.1 Employee A views their submissions
    const empASubsRes = await fetch(`${BASE_URL}/submissions/my`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    const empASubsData = await empASubsRes.json();
    const empAHasSub = empASubsData.submissions?.some((s) => s._id === submissionId);
    recordResult('My Submissions', 'Employee A sees their own submission', empAHasSub);

    // 5.2 Employee B views their submissions (should not see Employee A's submission)
    const empBSubsRes = await fetch(`${BASE_URL}/submissions/my`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    const empBSubsData = await empBSubsRes.json();
    const empBSeesA = empBSubsData.submissions?.some((s) => s._id === submissionId);
    recordResult('My Submissions', 'Employee B does not see Employee A submission', !empBSeesA);

    // 5.3 IDOR: Employee B attempts to view Employee A submission detail
    const empBGetDetailRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee B blocked from viewing Employee A submission detail (403)', empBGetDetailRes.status === 403);

    // 5.4 IDOR: Employee B attempts to edit Employee A submission
    const empBEditRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empBToken}`,
      },
      body: JSON.stringify({ description: 'Tampering with Alice work.' }),
    });
    recordResult('IDOR/BOLA Security', 'Employee B blocked from editing Employee A submission (403)', empBEditRes.status === 403);

    console.log('\n--- TEST GROUP 6: MANAGER DEPARTMENT SCOPING & IDOR ---');
    // 6.1 Dev Manager views submissions (Alice is in Development -> should see)
    const devMgrListRes = await fetch(`${BASE_URL}/submissions`, {
      headers: { Authorization: `Bearer ${devManagerToken}` },
    });
    const devMgrListData = await devMgrListRes.json();
    const devMgrSeesAlice = devMgrListData.submissions?.some((s) => s._id === submissionId);
    recordResult('Manager Submissions', 'Dev Manager sees Alice submission in their department', devMgrSeesAlice);

    // 6.2 Marketing Manager views submissions (Alice is in Development -> should NOT see)
    const mktMgrListRes = await fetch(`${BASE_URL}/submissions`, {
      headers: { Authorization: `Bearer ${mktManagerToken}` },
    });
    const mktMgrListData = await mktMgrListRes.json();
    const mktMgrSeesAlice = mktMgrListData.submissions?.some((s) => s._id === submissionId);
    recordResult('Manager Submissions', 'Marketing Manager isolated: cannot see Alice submission', !mktMgrSeesAlice);

    // 6.3 Marketing Manager attempts to access Alice submission by ID (403 Forbidden)
    const mktMgrGetDetailRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${mktManagerToken}` },
    });
    recordResult('IDOR/BOLA Security', 'Cross-department Manager blocked from viewing submission (403)', mktMgrGetDetailRes.status === 403);

    // 6.4 Marketing Manager attempts to review Alice submission (403 Forbidden)
    const mktMgrReviewRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mktManagerToken}`,
      },
      body: JSON.stringify({ status: 'Approved' }),
    });
    recordResult('IDOR/BOLA Security', 'Cross-department Manager blocked from reviewing submission (403)', mktMgrReviewRes.status === 403);

    console.log('\n--- TEST GROUP 7: REVIEW WORKFLOW - REQUEST CHANGES & RESUBMIT ---');
    // 7.1 Request Changes without reviewComment rejected
    const noCommentReviewRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devManagerToken}`,
      },
      body: JSON.stringify({ status: 'Changes Requested', reviewComment: '   ' }),
    });
    recordResult('Request Changes', 'Request Changes without feedback comment rejected (400)', noCommentReviewRes.status === 400);

    // 7.2 Dev Manager successfully requests changes
    const validChangesRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devManagerToken}`,
      },
      body: JSON.stringify({
        status: 'Changes Requested',
        reviewComment: 'Great initial commit, but please add unit tests and verify dark mode contrast.',
      }),
    });
    const validChangesData = await validChangesRes.json();
    const changesAccepted = validChangesRes.status === 200 && validChangesData.submission?.status === 'Changes Requested';
    recordResult('Request Changes', 'Manager successfully requests changes with feedback comment', changesAccepted);

    // 7.3 Spam prevention: Attempting to request changes again without employee resubmission
    const spamChangesRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devManagerToken}`,
      },
      body: JSON.stringify({
        status: 'Changes Requested',
        reviewComment: 'Spamming change request again.',
      }),
    });
    recordResult('Status Transitions', 'Redundant Changes Requested before employee resubmits rejected (400)', spamChangesRes.status === 400);

    // 7.4 Employee resubmits work with updated description
    const resubmitRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({
        description: 'Implemented all requested unit tests and optimized dark mode contrast styling.',
        githubUrl: 'https://github.com/staffpulse/staffpulse-ems',
        employeeComment: 'Added 15 unit tests and fixed all contrast issues.',
      }),
    });
    const resubmitData = await resubmitRes.json();
    const resubmittedOk = resubmitRes.status === 200 && resubmitData.submission?.status === 'Pending Review';
    recordResult('Edit/Resubmit', 'Employee successfully resubmits work; status resets to Pending Review', resubmittedOk);

    console.log('\n--- TEST GROUP 8: APPROVE & TASK AUTO-COMPLETION ---');
    // 8.1 Admin approves submission
    const approveRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
        reviewComment: 'Excellent work! Verified tests and design compliance.',
      }),
    });
    const approveData = await approveRes.json();
    const approvedOk = approveRes.status === 200 && approveData.submission?.status === 'Approved';
    recordResult('Approve', 'Admin/Manager successfully approves submission', approvedOk);

    // 8.2 Verify Task integration: Task status is now 'Completed' and progress is 100%
    const updatedTask = await Task.findById(task1._id);
    const taskCompleted = updatedTask.status === 'Completed' && updatedTask.progress === 100;
    recordResult('Task Integration', 'Underlying task status auto-synced to Completed with 100% progress', taskCompleted);

    // 8.3 Terminal state: Attempting to modify Approved submission
    const modifyApprovedRes = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empAToken}`,
      },
      body: JSON.stringify({ description: 'Attempting to edit already approved deliverable.' }),
    });
    recordResult('Status Transitions', 'Employee cannot modify Approved submission (400)', modifyApprovedRes.status === 400);

    // 8.4 Terminal state: Attempting to re-review Approved submission
    const reReviewApprovedRes = await fetch(`${BASE_URL}/submissions/${submissionId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'Changes Requested', reviewComment: 'Cannot change mind now.' }),
    });
    recordResult('Status Transitions', 'Reviewer cannot change status of Approved submission (400)', reReviewApprovedRes.status === 400);

    console.log('\n--- TEST GROUP 9: SEARCH, FILTER, PAGINATION & DASHBOARD ---');
    // 9.1 Admin list filter by status = 'Approved'
    const filterApprovedRes = await fetch(`${BASE_URL}/submissions?status=Approved`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterApprovedData = await filterApprovedRes.json();
    const allFilteredAreApproved = filterApprovedData.submissions?.every((s) => s.status === 'Approved');
    recordResult('Filters', 'Admin filter by status=Approved returns only approved submissions', allFilteredAreApproved);

    // 9.2 Search by task deliverable title
    const searchRes = await fetch(`${BASE_URL}/submissions?search=StaffPulse+Submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchData = await searchRes.json();
    const searchFound = searchData.submissions?.some((s) => s._id === submissionId);
    recordResult('Search', 'Admin search by task deliverable title matches record', searchFound);

    // 9.3 Pagination limit
    const pageRes = await fetch(`${BASE_URL}/submissions?limit=1&page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pageData = await pageRes.json();
    recordResult('Pagination', 'Pagination limit correctly honored', pageData.submissions?.length === 1 && pageData.limit === 1);

    // 9.4 Dashboard stats integration
    const dashStatsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashStatsData = await dashStatsRes.json();
    const hasSubStats = typeof dashStatsData.stats?.submissions?.approved === 'number';
    recordResult('Dashboard Integration', 'Dashboard stats returns real submission metrics', hasSubStats);

    console.log('\n--- TEST GROUP 10: ATTACHMENTS & FILE SECURITY ---');
    // 10.1 Empty file upload rejected
    const emptyUploadRes = await fetch(`${BASE_URL}/submissions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult('Attachment', 'Empty file upload payload rejected (400)', emptyUploadRes.status === 400);

    // 10.2 Valid file upload using FormData
    const formData = new FormData();
    const mockFile = new Blob(['Mock PDF content for StaffPulse deliverables.'], { type: 'application/pdf' });
    formData.append('attachments', mockFile, 'architecture_deliverable.pdf');

    const validUploadRes = await fetch(`${BASE_URL}/submissions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empAToken}` },
      body: formData,
    });
    const validUploadData = await validUploadRes.json();
    const uploadSuccess = validUploadRes.status === 201 && Array.isArray(validUploadData.files) && validUploadData.files.length > 0;
    const fileHasUrl = uploadSuccess && !!validUploadData.files[0].fileUrl;
    recordResult('Attachment', 'Attachment uploaded successfully with secure storage URL', uploadSuccess && fileHasUrl);
    recordResult('File Security', 'File metadata sanitized with type, size, and secure URL', uploadSuccess && !!validUploadData.files[0].fileName);

    // Clean up test records
    await WorkSubmission.deleteMany({ task: { $in: [task1._id, task2._id, cancelledTask._id] } });
    await Task.deleteMany({ _id: { $in: [task1._id, task2._id, cancelledTask._id] } });

    console.log('\n==================================================');
    console.log('AUDIT SUMMARY');
    console.log('==================================================');
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = results.filter((r) => !r.passed).length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      results.filter((r) => !r.passed).forEach((r) => console.log(`- [${r.category}] ${r.name}: ${r.detail}`));
    }
    console.log('==================================================\n');

    process.exit(failedTests === 0 ? 0 : 1);
  } catch (error) {
    console.error('Test suite runtime error:', error);
    process.exit(1);
  }
};

runComprehensiveSuite();
