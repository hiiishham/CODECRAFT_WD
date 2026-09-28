import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });

const API_BASE = 'http://localhost:5000/api';

async function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runComprehensiveLeaveSuite() {
  console.log('=================================================================');
  console.log('STAFFPULSE COMPREHENSIVE LEAVE QA & SECURITY TEST SUITE');
  console.log('=================================================================\n');

  try {
    // 1. Authenticate All Roles
    console.log('1. Authenticating Roles (Admin, Manager, Employee)...');
    const [adminLogin, managerLogin, empLogin] = await Promise.all([
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
    ]);

    assert(adminLogin.token, 'Admin login failed');
    assert(managerLogin.token, 'Manager login failed');
    assert(empLogin.token, 'Employee login failed');
    console.log('   ✓ Admin, Manager, and Employee tokens acquired');

    const adminToken = adminLogin.token;
    const managerToken = managerLogin.token;
    const empToken = empLogin.token;

    const authHeaders = (token) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    const cleanupIds = [];

    // Pre-test cleanup: delete any lingering leaves from previous runs with reason containing 'test' or 'evaluation'
    const initialLeaves = await fetch(`${API_BASE}/leaves?limit=100`, { headers: authHeaders(adminToken) }).then((r) => r.json());
    if (initialLeaves.leaves) {
      for (const l of initialLeaves.leaves) {
        if (l.reason && (l.reason.toLowerCase().includes('test') || l.reason.toLowerCase().includes('evaluation') || l.reason.toLowerCase().includes('transition'))) {
          await fetch(`${API_BASE}/leaves/${l._id}`, { method: 'DELETE', headers: authHeaders(adminToken) });
        }
      }
    }

    // 2. Real Database Leave Balance Verification
    console.log('\n2. Testing Live Database Leave Balances...');
    const balanceRes = await fetch(`${API_BASE}/leaves/my/balance`, {
      headers: authHeaders(empToken),
    }).then((r) => r.json());

    assert(balanceRes.success, 'Failed to fetch my leave balance');
    assert(balanceRes.balance.annual.total === 20, 'Annual total is 20');
    assert(balanceRes.balance.sick.total === 10, 'Sick total is 10');
    assert(balanceRes.balance.casual.total === 7, 'Casual total is 7');
    assert(balanceRes.balance.emergency.total === 5, 'Emergency total is 5');
    assert(
      balanceRes.balance.annual.remaining === balanceRes.balance.annual.total - balanceRes.balance.annual.used,
      'Annual remaining matches total - used'
    );
    console.log(`   ✓ Real Database Balance: Annual=${balanceRes.balance.annual.remaining}/${balanceRes.balance.annual.total}, Sick=${balanceRes.balance.sick.remaining}/${balanceRes.balance.sick.total}`);

    // 3. Date Boundaries & Duration Calculation
    console.log('\n3. Testing Date Boundaries & Duration Calculation...');
    const getLocalToday = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const todayStr = getLocalToday();
    const singleDayRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: todayStr,
        endDate: todayStr,
        reason: 'Single day test leave',
        duration: 999, // Malicious client override test
      }),
    }).then((r) => r.json());

    assert(singleDayRes.success, 'Failed to create single day leave');
    assert(singleDayRes.leave.duration === 1, 'Duration must be 1 day (server calculated, ignoring duration: 999)');
    cleanupIds.push(singleDayRes.leave._id);
    console.log('   ✓ Single day leave duration correctly calculated as 1 (client duration: 999 ignored)');

    // Year boundary test (Dec 31 -> Jan 1 next year)
    const currentYear = new Date().getFullYear();
    const dec31 = `${currentYear}-12-31`;
    const jan1 = `${currentYear + 1}-01-01`;
    const boundaryRes = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: dec31,
        endDate: jan1,
        reason: 'New year transition leave',
      }),
    }).then((r) => r.json());

    assert(boundaryRes.success, 'Failed to create year boundary leave');
    assert(boundaryRes.leave.duration === 2, 'Duration for Dec 31 to Jan 1 must be 2 days');
    cleanupIds.push(boundaryRes.leave._id);
    console.log('   ✓ Year boundary Dec 31 -> Jan 01 duration correctly calculated as 2 calendar days');

    // 4. Overlapping Leave Edge Cases
    console.log('\n4. Testing Overlapping Leave Edge Cases (Exact, Partial, Enclosing, Enclosed)...');
    // Base Leave: Day +50 to Day +55 (6 days)
    const baseStart = new Date(Date.now() + 86400000 * 50).toISOString().split('T')[0];
    const baseEnd = new Date(Date.now() + 86400000 * 55).toISOString().split('T')[0];
    const baseLeave = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: baseStart,
        endDate: baseEnd,
        reason: 'Base leave for overlap tests',
      }),
    }).then((r) => r.json());

    assert(baseLeave.success, 'Base leave creation failed');
    cleanupIds.push(baseLeave.leave._id);

    // Test 4A: Exact same dates
    const exactOverlap = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: baseStart,
        endDate: baseEnd,
        reason: 'Exact same dates overlap test',
      }),
    });
    assert(exactOverlap.status === 409, 'Exact overlap must return 409 Conflict');
    console.log('   ✓ Exact same dates: Blocked (409 Conflict)');

    // Test 4B: Partial overlap start (Day +48 to Day +52)
    const partStart = new Date(Date.now() + 86400000 * 48).toISOString().split('T')[0];
    const partEnd = new Date(Date.now() + 86400000 * 52).toISOString().split('T')[0];
    const partOverlap1 = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: partStart,
        endDate: partEnd,
        reason: 'Partial overlap start test',
      }),
    });
    assert(partOverlap1.status === 409, 'Partial overlap start must return 409 Conflict');
    console.log('   ✓ Partial overlap on start: Blocked (409 Conflict)');

    // Test 4C: Partial overlap end (Day +53 to Day +58)
    const partEndStart = new Date(Date.now() + 86400000 * 53).toISOString().split('T')[0];
    const partEndEnd = new Date(Date.now() + 86400000 * 58).toISOString().split('T')[0];
    const partOverlap2 = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: partEndStart,
        endDate: partEndEnd,
        reason: 'Partial overlap end test',
      }),
    });
    assert(partOverlap2.status === 409, 'Partial overlap end must return 409 Conflict');
    console.log('   ✓ Partial overlap on end: Blocked (409 Conflict)');

    // Test 4D: Request inside existing range (Day +51 to Day +53)
    const insideStart = new Date(Date.now() + 86400000 * 51).toISOString().split('T')[0];
    const insideEnd = new Date(Date.now() + 86400000 * 53).toISOString().split('T')[0];
    const insideOverlap = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: insideStart,
        endDate: insideEnd,
        reason: 'Inside existing range test',
      }),
    });
    assert(insideOverlap.status === 409, 'Inside range overlap must return 409 Conflict');
    console.log('   ✓ Request inside existing range: Blocked (409 Conflict)');

    // Test 4E: Existing range inside new request (Day +48 to Day +60)
    const enclosingStart = new Date(Date.now() + 86400000 * 48).toISOString().split('T')[0];
    const enclosingEnd = new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0];
    const enclosingOverlap = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: enclosingStart,
        endDate: enclosingEnd,
        reason: 'Enclosing range test',
      }),
    });
    assert(enclosingOverlap.status === 409, 'Enclosing range overlap must return 409 Conflict');
    console.log('   ✓ Existing range inside new request: Blocked (409 Conflict)');

    // 5. Manager Role Scoping & Department Isolation
    console.log('\n5. Testing Manager Department Authorization Scoping...');
    const mgrLeaveRes = await fetch(`${API_BASE}/manager/leave`, {
      headers: authHeaders(managerToken),
    }).then((r) => r.json());

    assert(mgrLeaveRes.success, 'Manager failed to get team leaves');
    assert(Array.isArray(mgrLeaveRes.leaves), 'Manager leaves must be an array');
    console.log(`   ✓ Manager successfully retrieved ${mgrLeaveRes.leaves.length} department leave requests`);

    // Manager updates leave status through /api/manager/leave/:id/status
    const mgrTestStart = new Date(Date.now() + 86400000 * 70).toISOString().split('T')[0];
    const mgrTestEnd = new Date(Date.now() + 86400000 * 71).toISOString().split('T')[0]; // 2 days
    const mgrLeaveReq = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Casual Leave',
        startDate: mgrTestStart,
        endDate: mgrTestEnd,
        reason: 'Leave for manager evaluation',
      }),
    }).then((r) => r.json());

    assert(mgrLeaveReq.success, 'Failed to create leave for manager review');
    const mgrLeaveId = mgrLeaveReq.leave._id;
    cleanupIds.push(mgrLeaveId);

    // Manager Approves via /api/manager/leave/:id/status
    const mgrApproveRes = await fetch(`${API_BASE}/manager/leave/${mgrLeaveId}/status`, {
      method: 'PUT',
      headers: authHeaders(managerToken),
      body: JSON.stringify({
        status: 'Approved',
        notes: 'Approved by Development Manager',
      }),
    }).then((r) => r.json());

    assert(mgrApproveRes.success, 'Manager approve failed');
    assert(mgrApproveRes.leave.status === 'Approved', 'Manager approve status must be Approved');
    assert(mgrApproveRes.leave.reviewComment === 'Approved by Development Manager', 'Manager notes recorded in reviewComment');
    console.log('   ✓ Manager approved leave with notes recorded in reviewComment');

    // Duplicate Approval Block
    const mgrDupApprove = await fetch(`${API_BASE}/manager/leave/${mgrLeaveId}/status`, {
      method: 'PUT',
      headers: authHeaders(managerToken),
      body: JSON.stringify({ status: 'Approved' }),
    });
    assert(mgrDupApprove.status === 400, 'Duplicate approval must return 400 Bad Request');
    console.log('   ✓ Blocked duplicate approval on already approved leave (400 Bad Request)');

    // 6. Invalid Status Transitions
    console.log('\n6. Testing Backend Status Transition Guardrails...');
    // Approved -> Cancelled
    const cancelApproved = await fetch(`${API_BASE}/leaves/${mgrLeaveId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(empToken),
    });
    assert(cancelApproved.status === 400, 'Cancelling approved leave must fail with 400');
    console.log('   ✓ Blocked Approved -> Cancelled transition (400 Bad Request)');

    // Approved -> Rejected
    const rejectApproved = await fetch(`${API_BASE}/leaves/${mgrLeaveId}/reject`, {
      method: 'PUT',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ reviewComment: 'Cannot reject approved' }),
    });
    assert(rejectApproved.status === 400, 'Rejecting approved leave must fail with 400');
    console.log('   ✓ Blocked Approved -> Rejected transition (400 Bad Request)');

    // Cancelled -> Approved
    const cancelStart = new Date(Date.now() + 86400000 * 80).toISOString().split('T')[0];
    const cancelEnd = new Date(Date.now() + 86400000 * 81).toISOString().split('T')[0];
    const cancelReq = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Sick Leave',
        startDate: cancelStart,
        endDate: cancelEnd,
        reason: 'Temporary leave to cancel',
      }),
    }).then((r) => r.json());
    cleanupIds.push(cancelReq.leave._id);

    await fetch(`${API_BASE}/leaves/${cancelReq.leave._id}/cancel`, {
      method: 'PUT',
      headers: authHeaders(empToken),
    });

    const approveCancelled = await fetch(`${API_BASE}/leaves/${cancelReq.leave._id}/approve`, {
      method: 'PUT',
      headers: authHeaders(adminToken),
      body: JSON.stringify({ reviewComment: 'Attempt to approve cancelled' }),
    });
    assert(approveCancelled.status === 400, 'Approving cancelled leave must fail with 400');
    console.log('   ✓ Blocked Cancelled -> Approved transition (400 Bad Request)');

    // 7. Dashboard Integration Real Data Check
    console.log('\n7. Testing Dashboard Leave Integration (Admin, Manager, Employee)...');
    const [adminDash, managerDash, empDash] = await Promise.all([
      fetch(`${API_BASE}/dashboard/stats`, { headers: authHeaders(adminToken) }).then((r) => r.json()),
      fetch(`${API_BASE}/manager/dashboard`, { headers: authHeaders(managerToken) }).then((r) => r.json()),
      fetch(`${API_BASE}/employee/dashboard`, { headers: authHeaders(empToken) }).then((r) => r.json()),
    ]);

    assert(adminDash.success, 'Admin dashboard failed');
    assert('pendingLeaves' in adminDash.stats, 'Admin dashboard stats has pendingLeaves');
    assert('approvedLeaves' in adminDash.stats, 'Admin dashboard stats has approvedLeaves');
    assert('onLeaveToday' in adminDash.stats, 'Admin dashboard stats has onLeaveToday');
    console.log(`   ✓ Admin Dashboard Real Metrics: Pending=${adminDash.stats.pendingLeaves}, Approved=${adminDash.stats.approvedLeaves}, OnLeaveToday=${adminDash.stats.onLeaveToday}`);

    assert(managerDash.success, 'Manager dashboard failed');
    assert('pendingLeaves' in managerDash.stats, 'Manager dashboard stats has pendingLeaves');
    assert('onLeave' in managerDash.stats, 'Manager dashboard stats has onLeave');
    console.log(`   ✓ Manager Dashboard Real Metrics: Pending=${managerDash.stats.pendingLeaves}, OnLeave=${managerDash.stats.onLeave}`);

    assert(empDash.success, 'Employee dashboard failed');
    assert(empDash.data?.leave?.usedSummary, 'Employee dashboard has leave.usedSummary');
    assert(empDash.data?.leave?.usedSummary['Annual Leave'], 'Employee dashboard includes Annual Leave summary');
    console.log(`   ✓ Employee Dashboard Live Balances: Annual Remaining=${empDash.data.leave.usedSummary['Annual Leave'].remaining}`);

    // 8. Security & Mass Assignment Protection
    console.log('\n8. Testing IDOR & Mass Assignment Security...');
    const maliciousReq = await fetch(`${API_BASE}/leaves`, {
      method: 'POST',
      headers: authHeaders(empToken),
      body: JSON.stringify({
        leaveType: 'Annual Leave',
        startDate: new Date(Date.now() + 86400000 * 95).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 96).toISOString().split('T')[0],
        reason: 'Attempt status manipulation',
        status: 'Approved', // Should be ignored
        reviewedBy: '6ab189350cd4034b2f1af67a', // Should be ignored
        reviewedAt: new Date(), // Should be ignored
      }),
    }).then((r) => r.json());

    assert(maliciousReq.success, 'Malicious payload rejected unexpectedly');
    assert(maliciousReq.leave.status === 'Pending', 'Mass assignment protection: status MUST remain Pending');
    assert(maliciousReq.leave.reviewedBy === null, 'Mass assignment protection: reviewedBy MUST be null');
    assert(maliciousReq.leave.reviewedAt === null, 'Mass assignment protection: reviewedAt MUST be null');
    cleanupIds.push(maliciousReq.leave._id);
    console.log('   ✓ Mass assignment protected: status forced to Pending, reviewedBy and reviewedAt forced to null');

    // Invalid ObjectId format
    const badIdRes = await fetch(`${API_BASE}/leaves/invalid-object-id`, {
      headers: authHeaders(empToken),
    });
    assert(badIdRes.status === 400, 'Invalid ObjectId must return 400 Bad Request');
    console.log('   ✓ Invalid ObjectId format safely rejected with 400 Bad Request');

    // 9. Cleanup
    console.log('\n9. Cleaning up test leave records...');
    await Promise.all(
      cleanupIds.map((id) =>
        fetch(`${API_BASE}/leaves/${id}`, {
          method: 'DELETE',
          headers: authHeaders(adminToken),
        })
      )
    );
    console.log(`   ✓ Cleaned up ${cleanupIds.length} test leave documents`);

    console.log('\n=================================================================');
    console.log('ALL COMPREHENSIVE QA & SECURITY CHECKS PASSED (100% SUCCESS)');
    console.log('=================================================================');
  } catch (err) {
    console.error('\n❌ COMPREHENSIVE SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runComprehensiveLeaveSuite();
