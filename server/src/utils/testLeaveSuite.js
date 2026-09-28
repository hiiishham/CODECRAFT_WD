import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });

const API_BASE = 'http://localhost:5000/api';

async function runLeaveTestSuite() {
  console.log('=================================================================');
  console.log('STAFFPULSE EMPLOYEE LEAVE MANAGEMENT AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  try {
    // 1. Authenticate Admin, Manager, and 2 Employees
    console.log('1. Authenticating Admin, Manager, and Employees...');
    const [adminLogin, managerLogin, emp1Login, emp2Login] = await Promise.all([
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
      }).then((r) => r.json()),
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
      }).then((r) => r.json()),
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
      }).then((r) => r.json()),
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
      }).then((r) => r.json()),
    ]);

    if (!adminLogin.token || !managerLogin.token || !emp1Login.token || !emp2Login.token) {
      throw new Error('Authentication failed for one or more test accounts');
    }
    console.log('   ✓ Admin, Manager, and 2 Employees successfully authenticated\n');

    const adminToken = adminLogin.token;
    const managerToken = managerLogin.token;
    const emp1Token = emp1Login.token;
    const emp2Token = emp2Login.token;

    // Helper headers
    const authHeaders = (token) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    // 2. Test GET /api/leaves/my/balance
    console.log('2. Testing Employee Leave Balance (GET /api/leaves/my/balance)...');
    const balanceRes = await fetch(`${API_BASE}/leaves/my/balance`, {
      headers: authHeaders(emp1Token),
    }).then((r) => r.json());

    if (!balanceRes.success || !balanceRes.balance) {
      throw new Error('Failed to retrieve employee leave balance');
    }
    if (balanceRes.balance.annual.total !== 20 || balanceRes.balance.sick.total !== 10) {
      throw new Error(`Unexpected default allowances: ${JSON.stringify(balanceRes.balance)}`);
    }
    console.log(`   ✓ Retrieved balance: Annual=${balanceRes.balance.annual.remaining}/${balanceRes.balance.annual.total}, Sick=${balanceRes.balance.sick.remaining}/${balanceRes.balance.sick.total}`);
    console.log(`   ✓ Total Remaining Days: ${balanceRes.totalRemaining}\n`);

    // 3. Test Validations on POST /api/leaves
    console.log('3. Testing Leave Request Validations (POST /api/leaves)...');
    // A. Empty fields
    const emptyRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({ leaveType: '', startDate: '', endDate: '', reason: '' }),
    });
    if (emptyRes.status !== 400) throw new Error(`Expected 400 for empty fields, got ${emptyRes.status}`);
    console.log('   ✓ Rejected empty fields with 400 Bad Request');

    // B. Past start date
    const yesterday = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
    const pastRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: yesterday,
        endDate: yesterday,
        reason: 'Past holiday',
      }),
    });
    if (pastRes.status !== 400) throw new Error(`Expected 400 for past start date, got ${pastRes.status}`);
    console.log('   ✓ Rejected past start date with 400 Bad Request');

    // C. End date < Start date
    const futureDate1 = new Date(Date.now() + 86400000 * 20).toISOString().split('T')[0];
    const futureDate2 = new Date(Date.now() + 86400000 * 18).toISOString().split('T')[0];
    const invertedRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: futureDate1,
        endDate: futureDate2,
        reason: 'Inverted dates test',
      }),
    });
    if (invertedRes.status !== 400) throw new Error(`Expected 400 for end < start, got ${invertedRes.status}`);
    console.log('   ✓ Rejected endDate < startDate with 400 Bad Request');

    // D. Balance exceeded (e.g. requesting 25 days Annual Leave when allowance is 20)
    const farFutureStart = new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0];
    const farFutureEnd = new Date(Date.now() + 86400000 * 85).toISOString().split('T')[0]; // ~26 days
    const overflowRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: farFutureStart,
        endDate: farFutureEnd,
        reason: 'Extended world tour',
      }),
    });
    if (overflowRes.status !== 400) throw new Error(`Expected 400 for balance exceeded, got ${overflowRes.status}`);
    console.log('   ✓ Rejected request exceeding remaining balance with 400 Bad Request\n');

    // 4. Test Successful Leave Creation
    console.log('4. Testing Valid Leave Creation...');
    const validStart = new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0];
    const validEnd = new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0]; // 3 inclusive days
    const createRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: validStart,
        endDate: validEnd,
        reason: 'Family vacation and personal downtime.',
      }),
    }).then((r) => r.json());

    if (!createRes.success || !createRes.leave) {
      throw new Error(`Failed to create valid leave: ${JSON.stringify(createRes)}`);
    }
    const testLeave1Id = createRes.leave._id;
    if (createRes.leave.status !== 'Pending' || createRes.leave.duration !== 3) {
      throw new Error(`Expected Pending status and duration=3, got ${createRes.leave.status}, ${createRes.leave.duration}`);
    }
    console.log(`   ✓ Created leave request (ID: ${testLeave1Id}), Status: Pending, Duration: 3 days`);

    // 5. Test Conflict / Overlap Validation
    console.log('5. Testing Overlapping Conflict Validation...');
    const overlapStart = new Date(Date.now() + 86400000 * 11).toISOString().split('T')[0];
    const overlapEnd = new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0];
    const conflictRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: overlapStart,
        endDate: overlapEnd,
        reason: 'Overlapping request test',
      }),
    });
    if (conflictRes.status !== 409) throw new Error(`Expected 409 Conflict for overlapping dates, got ${conflictRes.status}`);
    console.log('   ✓ Rejected overlapping leave request with 409 Conflict\n');

    // 6. Test Balance Unchanged For Pending Leave
    console.log('6. Verifying Balance Unchanged for Pending Leaves...');
    const pendingBalance = await fetch(`${API_BASE}/leaves/my/balance`, {
      headers: authHeaders(emp1Token),
    }).then((r) => r.json());
    if (pendingBalance.balance.annual.used !== 0 || pendingBalance.balance.annual.remaining !== 20) {
      throw new Error('Pending leave should not deduct from used/remaining balance!');
    }
    console.log('   ✓ Verified used balance = 0, remaining = 20 while leave is Pending\n');

    // 7. Test Employee Cancellation (PUT /api/leaves/:id/cancel)
    console.log('7. Testing Employee Cancellation of Pending Leave...');
    const cancelRes = await fetch(`${API_BASE}/leaves/${testLeave1Id}/cancel`, {
      method: 'PUT',
      headers: authHeaders(emp1Token),
    }).then((r) => r.json());

    if (!cancelRes.success || cancelRes.leave.status !== 'Cancelled') {
      throw new Error(`Expected Cancelled status, got ${cancelRes.leave?.status}`);
    }
    console.log('   ✓ Leave request successfully transitioned to "Cancelled"');

    // Attempting to cancel an already cancelled leave should fail
    const reCancelRes = await fetch(`${API_BASE}/leaves/${testLeave1Id}/cancel`, {
      method: 'PUT',
      headers: authHeaders(emp1Token),
    });
    if (reCancelRes.status !== 400) throw new Error(`Expected 400 when re-cancelling, got ${reCancelRes.status}`);
    console.log('   ✓ Blocked redundant cancellation on non-pending leave (400 Bad Request)\n');

    // 8. Test Employee Isolation
    console.log('8. Testing Employee Access Isolation (RBAC)...');
    // Employee 2 creates a leave
    const emp2LeaveStart = new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0];
    const emp2LeaveEnd = new Date(Date.now() + 86400000 * 26).toISOString().split('T')[0];
    const emp2Leave = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp2Token),
      body: JSON.stringify({
        leaveType: 'Sick Leave',
        startDate: emp2LeaveStart,
        endDate: emp2LeaveEnd,
        reason: 'Medical appointment',
      }),
    }).then((r) => r.json());
    const emp2LeaveId = emp2Leave.leave._id;

    // Employee 1 tries to view Employee 2's leave -> 403
    const unauthorizedView = await fetch(`${API_BASE}/leaves/${emp2LeaveId}`, {
      headers: authHeaders(emp1Token),
    });
    if (unauthorizedView.status !== 403) throw new Error(`Expected 403 for unauthorized employee view, got ${unauthorizedView.status}`);
    console.log("   ✓ Blocked Employee 1 from viewing Employee 2's leave details (403 Forbidden)");

    // Employee 1 tries to cancel Employee 2's leave -> 403
    const unauthorizedCancel = await fetch(`${API_BASE}/leaves/${emp2LeaveId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(emp1Token),
    });
    if (unauthorizedCancel.status !== 403) throw new Error(`Expected 403 for unauthorized cancel, got ${unauthorizedCancel.status}`);
    console.log("   ✓ Blocked Employee 1 from cancelling Employee 2's leave (403 Forbidden)");

    // Employee 1 tries to approve Employee 2's leave -> 403
    const unauthorizedApprove = await fetch(`${API_BASE}/leaves/${emp2LeaveId}/approve`, {
      method: 'PUT',
      headers: authHeaders(emp1Token),
    });
    if (unauthorizedApprove.status !== 403) throw new Error(`Expected 403 for employee approving leave, got ${unauthorizedApprove.status}`);
    console.log('   ✓ Blocked Employee from approving leave requests (403 Forbidden)\n');

    // 9. Test Rejection Flow with Mandatory Comment
    console.log('9. Testing Rejection Flow with Mandatory Comment...');
    // Create new leave for Employee 1
    const rejStart = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
    const rejEnd = new Date(Date.now() + 86400000 * 31).toISOString().split('T')[0];
    const rejLeave = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: rejStart,
        endDate: rejEnd,
        reason: 'Personal errands',
      }),
    }).then((r) => r.json());
    const rejLeaveId = rejLeave.leave._id;

    // Reject without comment -> 400
    const noCommentReject = await fetch(`${API_BASE}/leaves/${rejLeaveId}/reject`, {
      method: 'PUT',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ reviewComment: '' }),
    });
    if (noCommentReject.status !== 400) throw new Error(`Expected 400 for reject without comment, got ${noCommentReject.status}`);
    console.log('   ✓ Rejected leave rejection attempt without comment (400 Bad Request)');

    // Reject with comment -> 200
    const validReject = await fetch(`${API_BASE}/leaves/${rejLeaveId}/reject`, {
      method: 'PUT',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ reviewComment: 'Team sprint freeze scheduled during this timeframe.' }),
    }).then((r) => r.json());
    if (!validReject.success || validReject.leave.status !== 'Rejected') {
      throw new Error(`Expected Rejected status, got ${validReject.leave?.status}`);
    }
    console.log('   ✓ Leave successfully rejected with review comment recorded');

    // Verify balance unaffected by rejection
    const afterRejectBalance = await fetch(`${API_BASE}/leaves/my/balance`, {
      headers: authHeaders(emp1Token),
    }).then((r) => r.json());
    if (afterRejectBalance.balance.casual.used !== 0 || afterRejectBalance.balance.casual.remaining !== 7) {
      throw new Error('Rejected leave should not deduct from balance!');
    }
    console.log('   ✓ Verified balance remains intact after rejection\n');

    // 10. Test Approval Flow & Balance Deduction
    console.log('10. Testing Approval Flow & Dynamic Balance Deduction...');
    const appStart = new Date(Date.now() + 86400000 * 40).toISOString().split('T')[0];
    const appEnd = new Date(Date.now() + 86400000 * 43).toISOString().split('T')[0]; // 4 days
    const appLeave = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(emp1Token),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: appStart,
        endDate: appEnd,
        reason: 'Annual family break',
      }),
    }).then((r) => r.json());
    const appLeaveId = appLeave.leave._id;

    // Approve as Admin
    const approveRes = await fetch(`${API_BASE}/leaves/${appLeaveId}/approve`, {
      method: 'PUT',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ reviewComment: 'Approved, enjoy your vacation.' }),
    }).then((r) => r.json());

    if (!approveRes.success || approveRes.leave.status !== 'Approved') {
      throw new Error(`Expected Approved status, got ${approveRes.leave?.status}`);
    }
    console.log(`   ✓ Admin approved leave request (ID: ${appLeaveId})`);

    // Verify balance is now properly deducted
    const approvedBalance = await fetch(`${API_BASE}/leaves/my/balance`, {
      headers: authHeaders(emp1Token),
    }).then((r) => r.json());

    if (approvedBalance.balance.annual.used !== 4 || approvedBalance.balance.annual.remaining !== 16) {
      throw new Error(`Expected Annual used=4, remaining=16, got used=${approvedBalance.balance.annual.used}, remaining=${approvedBalance.balance.annual.remaining}`);
    }
    console.log(`   ✓ Verified Annual Leave balance updated: Used=4, Remaining=16 (Total=20)\n`);

    // 11. Test Admin & Manager Leave Statistics
    console.log('11. Testing Admin Leave List & Stats (GET /api/leaves)...');
    const adminLeaves = await fetch(`${API_BASE}/leaves`, {
      headers: authHeaders(adminToken),
    }).then((r) => r.json());

    if (!adminLeaves.success || !adminLeaves.stats) {
      throw new Error('Admin failed to retrieve leave statistics');
    }
    console.log(`   ✓ Admin fetched leaves. Total: ${adminLeaves.stats.total}, Approved: ${adminLeaves.stats.approved}, Pending: ${adminLeaves.stats.pending}, Rejected: ${adminLeaves.stats.rejected}`);

    // Clean up created test leaves
    console.log('\n12. Cleaning up test data...');
    await Promise.all([
      fetch(`${API_BASE}/leaves/${testLeave1Id}`, { method: 'DELETE', headers: authHeaders(adminToken) }),
      fetch(`${API_BASE}/leaves/${emp2LeaveId}`, { method: 'DELETE', headers: authHeaders(adminToken) }),
      fetch(`${API_BASE}/leaves/${rejLeaveId}`, { method: 'DELETE', headers: authHeaders(adminToken) }),
      fetch(`${API_BASE}/leaves/${appLeaveId}`, { method: 'DELETE', headers: authHeaders(adminToken) }),
    ]);
    console.log('   ✓ Test leaves cleaned up successfully');

    console.log('\n=================================================================');
    console.log('ALL LEAVE MANAGEMENT AUTOMATED TESTS PASSED (100% SUCCESS)');
    console.log('=================================================================');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
}

runLeaveTestSuite();
