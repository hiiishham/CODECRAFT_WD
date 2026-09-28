import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runSystemIntegrationAudit() {
  console.log('====================================================================');
  console.log('🌟 STAFFPULSE FULL SYSTEM INTEGRATION & LIFECYCLE AUDIT (STEP 13)');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await connectDB();

    // 1. Authenticate Admin
    console.log('\n--- Stage 1: Authenticate Admin & Verify JWT ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Admin login succeeded with 200 OK');
    assert(!!loginData.token, 'Issued valid Bearer token');
    const token = loginData.token;

    // 2. Dashboard Metrics Check
    console.log('\n--- Stage 2: Dashboard Real-time Metrics ---');
    const dashRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard stats API returns 200 OK');
    assert('totalEmployees' in dashData, 'Dashboard response contains totalEmployees');
    assert('departmentCount' in dashData, 'Dashboard response contains departmentCount');
    assert('pendingLeaves' in dashData, 'Dashboard response contains pendingLeaves');
    assert('salaryOverview' in dashData, 'Admin dashboard returns confidential salaryOverview');

    // 3. Add Department
    console.log('\n--- Stage 3: Department Creation & Dynamic Count ---');
    const uniqueDeptName = `Engineering Alpha ${Date.now()}`;
    const deptRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: uniqueDeptName,
        description: 'Primary core engineering and software innovation division',
        status: 'Active',
      }),
    });
    const deptData = await deptRes.json();
    assert(deptRes.status === 201, 'Department created successfully (201 Created)');
    const createdDeptId = deptData.department?._id;
    assert(!!createdDeptId, 'Created department has valid MongoDB ObjectId');

    // 4. Add Employee to the newly created Department
    console.log('\n--- Stage 4: Add Employee Linked to Department ---');
    const uniqueEmpId = `EMP${Math.floor(100000 + Math.random() * 900000)}`;
    const empEmail = `testuser.${Date.now()}@ems.com`;
    const empRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: 'Alex Vance',
        employeeId: uniqueEmpId,
        email: empEmail,
        phone: '+91 98765 11223',
        department: uniqueDeptName,
        designation: 'Senior Cloud Engineer',
        joiningDate: '2025-01-15',
        salary: 85000,
        status: 'Active',
      }),
    });
    const empData = await empRes.json();
    assert(empRes.status === 201, 'Employee created successfully (201 Created)');
    const createdEmpId = empData.employee?._id;
    assert(!!createdEmpId, 'Created employee has valid ID');

    // 5. View and Edit Employee
    console.log('\n--- Stage 5: View & Edit Employee Profile ---');
    const getEmpRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getEmpData = await getEmpRes.json();
    assert(getEmpRes.status === 200, 'Employee profile retrieved (200 OK)');
    assert(getEmpData.employee?.department === uniqueDeptName, 'Employee assigned to correct department');

    const updateEmpRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: 'Alex Vance Senior',
        designation: 'Lead Cloud Architect',
      }),
    });
    const updateEmpData = await updateEmpRes.json();
    assert(updateEmpRes.status === 200, 'Employee profile updated (200 OK)');
    assert(updateEmpData.employee?.fullName === 'Alex Vance Senior', 'Updated employee name persisted');

    // 6. Search and Filter Employee Directory
    console.log('\n--- Stage 6: Search, Filter & Pagination in Directory ---');
    const searchRes = await fetch(`${BASE_URL}/employees?search=Vance&department=${encodeURIComponent(uniqueDeptName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Employee search & department filter returns 200 OK');
    assert(searchData.employees?.length >= 1, 'Search returned the newly added employee');

    // 7. Create Leave Request & Approve Leave
    console.log('\n--- Stage 7: Leave Request & Approval Flow ---');
    const leaveRes = await fetch(`${BASE_URL}/leaves`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employee: createdEmpId,
        leaveType: 'Casual Leave',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        reason: 'Family event and rest',
      }),
    });
    const leaveData = await leaveRes.json();
    assert(leaveRes.status === 201, 'Leave application submitted (201 Created)');
    const createdLeaveId = leaveData.leave?._id;
    assert(leaveData.leave?.duration === 3, 'Calculated correct 3-day duration');

    // Approve Leave
    const approveRes = await fetch(`${BASE_URL}/leaves/${createdLeaveId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'Leave approved successfully (200 OK)');
    assert(approveData.leave?.status === 'Approved', 'Leave status updated to Approved');

    // 8. Verify Notification Generated
    console.log('\n--- Stage 8: Verify System & Leave Notifications ---');
    const notifRes = await fetch(`${BASE_URL}/notifications?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200, 'Notifications query returns 200 OK');
    assert(notifData.notifications?.length > 0, 'Notifications generated for employee and leave events');

    // 9. Add Salary & Verify Net Salary Calculation
    console.log('\n--- Stage 9: Salary Management & Formula Calculation ---');
    const salaryRes = await fetch(`${BASE_URL}/salaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        employee: createdEmpId,
        basicSalary: 60000,
        allowances: 15000,
        deductions: 5000,
        effectiveFrom: '2026-01-01',
      }),
    });
    const salaryData = await salaryRes.json();
    assert(salaryRes.status === 201, 'Salary record created (201 Created)');
    assert(salaryData.salary?.netSalary === 70000, 'Backend formula correctly calculated: 60000 + 15000 - 5000 = 70000');

    // 10. Reports Overview & Joining Trends
    console.log('\n--- Stage 10: Reports & Analytics Integration ---');
    const reportOverviewRes = await fetch(`${BASE_URL}/reports/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reportOverviewData = await reportOverviewRes.json();
    assert(reportOverviewRes.status === 200, 'Reports overview returns 200 OK');
    assert('totalEmployees' in reportOverviewData.overview, 'Reports overview has accurate total employees');

    const trendsRes = await fetch(`${BASE_URL}/reports/joining-trends`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const trendsData = await trendsRes.json();
    assert(trendsRes.status === 200, 'Joining trends API returns 200 OK');
    assert(Array.isArray(trendsData.trends), 'Joining trends returned as array');

    // 11. Profile Update & Password Change
    console.log('\n--- Stage 11: Admin Profile Update & Password Security ---');
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'StaffPulse Master Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      }),
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, 'Profile update returns 200 OK');
    assert(profileData.user?.name === 'StaffPulse Master Admin', 'Updated profile name verified');

    // 12. Settings Update & Persistence
    console.log('\n--- Stage 12: Application Settings Persistence ---');
    const settingsRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyName: 'StaffPulse Global Enterprise',
        companyEmail: 'admin@staffpulse.com',
        companyPhone: '+91 80 8888 9999',
        currency: 'INR',
        theme: 'light',
      }),
    });
    const settingsData = await settingsRes.json();
    assert(settingsRes.status === 200, 'Settings update returns 200 OK');
    assert(settingsData.settings?.companyName === 'StaffPulse Global Enterprise', 'Settings companyName updated');

    // 13. Safety Cleanup & Department Deletion Safeguard
    console.log('\n--- Stage 13: Department Deletion Safeguard Check ---');
    const unsafeDeleteRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(unsafeDeleteRes.status === 400, 'Deletion correctly blocked because employee is assigned to department');

    // Delete assigned employee first
    const deleteEmpRes = await fetch(`${BASE_URL}/employees/${createdEmpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(deleteEmpRes.status === 200, 'Assigned employee deleted successfully');

    // Now department deletion succeeds
    const safeDeleteRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(safeDeleteRes.status === 200, 'Department safely deleted after employees removed');

    // Reset admin name back to Administrator
    await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Administrator' }),
    });

    console.log('\n====================================================================');
    console.log(`🎉 COMPLETE SYSTEM INTEGRATION AUDIT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Fatal error in integration audit:', err);
    process.exit(1);
  }
}

runSystemIntegrationAudit();
