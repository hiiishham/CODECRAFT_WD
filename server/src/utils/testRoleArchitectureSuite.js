import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000/api';

async function runRoleArchitectureTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ROLE-BASED DASHBOARD ARCHITECTURE TEST SUITE (STEP 14)');
  console.log('====================================================\n');

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
    // ----------------------------------------------------------------
    // 1. Authentication & Role Payload Verification
    // ----------------------------------------------------------------
    console.log('\n--- 1. Testing Role Authentication & Payload Structure ---');

    // 1a. Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    assert(adminLoginData.user.role === 'admin', 'Admin user payload has role: "admin"');
    assert('avatar' in adminLoginData.user, 'Admin payload contains avatar property');
    assert(!('password' in adminLoginData.user), 'Admin payload does NOT expose password');
    assert(!!adminLoginData.token, 'Admin login provides JWT token');
    const adminToken = adminLoginData.token;

    // 1b. Manager Login
    const managerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    });
    const managerLoginData = await managerLoginRes.json();
    assert(managerLoginRes.status === 200, 'Manager login returns 200 OK');
    assert(managerLoginData.user.role === 'manager', 'Manager user payload has role: "manager"');
    assert('avatar' in managerLoginData.user, 'Manager payload contains avatar property');
    assert(!('password' in managerLoginData.user), 'Manager payload does NOT expose password');
    assert(!!managerLoginData.token, 'Manager login provides JWT token');
    const managerToken = managerLoginData.token;

    // 1c. Employee Login
    const employeeLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    });
    const employeeLoginData = await employeeLoginRes.json();
    assert(employeeLoginRes.status === 200, 'Employee login returns 200 OK');
    assert(employeeLoginData.user.role === 'employee', 'Employee user payload has role: "employee"');
    assert('avatar' in employeeLoginData.user, 'Employee payload contains avatar property');
    assert(!('password' in employeeLoginData.user), 'Employee payload does NOT expose password');
    assert(!!employeeLoginData.token, 'Employee login provides JWT token');
    const employeeToken = employeeLoginData.token;

    // ----------------------------------------------------------------
    // 2. GET /api/auth/me Session Restoration & Role Preservation
    // ----------------------------------------------------------------
    console.log('\n--- 2. Testing GET /api/auth/me for each role ---');

    for (const [name, token, expectedRole] of [
      ['Admin', adminToken, 'admin'],
      ['Manager', managerToken, 'manager'],
      ['Employee', employeeToken, 'employee'],
    ]) {
      const meRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      assert(meRes.status === 200, `GET /api/auth/me for ${name} returns 200`);
      assert(meData.user.role === expectedRole, `GET /api/auth/me preserves ${name} role as "${expectedRole}"`);
      assert(!!meData.user.id || !!meData.user._id, `GET /api/auth/me includes id for ${name}`);
      assert(!!meData.user.name, `GET /api/auth/me includes name for ${name}`);
      assert(!!meData.user.email, `GET /api/auth/me includes email for ${name}`);
      assert('avatar' in meData.user, `GET /api/auth/me includes avatar field for ${name}`);
      assert(!('password' in meData.user), `GET /api/auth/me omits password hash for ${name}`);
    }

    // Unauthenticated GET /api/auth/me -> 401
    const unauthMeRes = await fetch(`${BASE_URL}/auth/me`);
    assert(unauthMeRes.status === 401, 'Unauthenticated request to GET /api/auth/me returns 401');

    // ----------------------------------------------------------------
    // 3. Backend Authorization: Admin Permissions
    // ----------------------------------------------------------------
    console.log('\n--- 3. Testing Admin Permissions (Full Access) ---');

    const adminStatsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, 'Admin can access /api/dashboard/stats (200 OK)');

    const adminEmployeesRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminEmployeesRes.status === 200, 'Admin can access /api/employees (200 OK)');

    const adminSalariesRes = await fetch(`${BASE_URL}/salaries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSalariesRes.status === 200, 'Admin can access /api/salaries (200 OK)');

    const adminReportsRes = await fetch(`${BASE_URL}/reports/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminReportsRes.status === 200, 'Admin can access /api/reports/overview (200 OK)');

    // ----------------------------------------------------------------
    // 4. Backend Authorization: Manager Permissions & Restrictions
    // ----------------------------------------------------------------
    console.log('\n--- 4. Testing Manager Permissions & Restrictions ---');

    // Manager allowed endpoints
    const mgrStatsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrStatsRes.status === 200, 'Manager can access /api/dashboard/stats for team overview (200 OK)');

    const mgrEmployeesRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrEmployeesRes.status === 200, 'Manager can access /api/employees list (200 OK)');

    const mgrReportsRes = await fetch(`${BASE_URL}/reports/overview`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrReportsRes.status === 200, 'Manager can access /api/reports/overview (200 OK)');

    // Manager blocked endpoints
    const mgrSalariesRes = await fetch(`${BASE_URL}/salaries`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(mgrSalariesRes.status === 403, 'Manager is BLOCKED from /api/salaries with 403 Forbidden');

    const mgrCreateEmployeeRes = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Staff' }),
    });
    assert(mgrCreateEmployeeRes.status === 403, 'Manager is BLOCKED from creating employees with 403 Forbidden');

    const mgrSettingsRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ companyName: 'Hacked Name' }),
    });
    assert(mgrSettingsRes.status === 403, 'Manager is BLOCKED from modifying settings with 403 Forbidden');

    // ----------------------------------------------------------------
    // 5. Backend Authorization: Employee Restrictions & Protections
    // ----------------------------------------------------------------
    console.log('\n--- 5. Testing Employee Permissions & Strict Restrictions ---');

    // Employee allowed endpoints
    const empNotifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empNotifRes.status === 200, 'Employee can access /api/notifications (200 OK)');

    // Employee blocked endpoints
    const empStatsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empStatsRes.status === 403, 'Employee is BLOCKED from /api/dashboard/stats with 403 Forbidden');

    const empSalariesRes = await fetch(`${BASE_URL}/salaries`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empSalariesRes.status === 403, 'Employee is BLOCKED from /api/salaries with 403 Forbidden');

    const empEmployeesRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empEmployeesRes.status === 403, 'Employee is BLOCKED from /api/employees directory with 403 Forbidden');

    const empDepartmentsRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empDepartmentsRes.status === 403, 'Employee is BLOCKED from /api/departments with 403 Forbidden');

    const empReportsRes = await fetch(`${BASE_URL}/reports/overview`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(empReportsRes.status === 403, 'Employee is BLOCKED from /api/reports with 403 Forbidden');

    // ----------------------------------------------------------------
    // 6. Direct Unauthorized Access without Token
    // ----------------------------------------------------------------
    console.log('\n--- 6. Direct Unauthenticated API Access Protection ---');
    const noTokenStats = await fetch(`${BASE_URL}/dashboard/stats`);
    assert(noTokenStats.status === 401, 'Accessing /api/dashboard/stats without token returns 401 Unauthorized');

    const noTokenSalaries = await fetch(`${BASE_URL}/salaries`);
    assert(noTokenSalaries.status === 401, 'Accessing /api/salaries without token returns 401 Unauthorized');

    // ----------------------------------------------------------------
    // Summary
    // ----------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Test Execution Error:', error);
    process.exit(1);
  }
}

runRoleArchitectureTests();
