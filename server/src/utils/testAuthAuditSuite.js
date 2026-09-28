import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'http://localhost:5000/api';

const results = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    results.push({ name: message, status: 'PASS' });
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    results.push({ name: message, status: 'FAIL' });
  }
}

async function runAudit() {
  console.log('====================================================');
  console.log('🛡️  STAFFPULSE AUTHENTICATION SYSTEM AUDIT SUITE');
  console.log('====================================================\n');

  // 1. Root & Unauthenticated Route Access
  console.log('--- 1. Testing Unauthenticated Route Security ---');
  const unauthMe = await fetch(`${API_BASE}/auth/me`);
  assert(unauthMe.status === 401, 'Unauthenticated request to /api/auth/me is blocked with 401');

  const unauthDashboard = await fetch(`${API_BASE}/dashboard/stats`);
  assert(unauthDashboard.status === 401, 'Unauthenticated request to /api/dashboard/stats is blocked with 401');

  const unauthSalaries = await fetch(`${API_BASE}/salary`);
  assert(unauthSalaries.status === 401, 'Unauthenticated request to /api/salary is blocked with 401');

  const unauthEmployees = await fetch(`${API_BASE}/employees`);
  assert(unauthEmployees.status === 401, 'Unauthenticated request to /api/employees is blocked with 401');

  // 2. Invalid Login Validation & Error Handling
  console.log('\n--- 2. Testing Invalid Login Validation & Error Handling ---');
  const emptyLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  });
  const emptyData = await emptyLogin.json();
  assert(emptyLogin.status === 400 && !emptyData.success, 'Empty email/password returns 400 Bad Request');
  assert(!emptyData.token && !emptyData.user, 'No token or user payload returned on empty login');

  const wrongPassLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@staffpulse.com', password: 'WrongPassword123!' }),
  });
  const wrongPassData = await wrongPassLogin.json();
  assert(wrongPassLogin.status === 401 && !wrongPassData.success, 'Wrong password returns 401 Unauthorized');
  assert(!wrongPassData.token && !wrongPassData.user, 'No token or user payload returned on wrong password');

  const nonExistentLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@staffpulse.com', password: 'Password123!' }),
  });
  const nonExistentData = await nonExistentLogin.json();
  assert(nonExistentLogin.status === 401 && !nonExistentData.success, 'Non-existent user returns 401 Unauthorized');

  // 3. Admin Login & Auth API Audit
  console.log('\n--- 3. Testing Admin Login & Token Properties ---');
  const adminLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
  });
  const adminData = await adminLogin.json();
  assert(adminLogin.status === 200 && adminData.success, 'Admin login succeeds with 200 OK');
  assert(!!adminData.token, 'Admin login returns signed JWT');
  assert(adminData.user.role === 'admin', 'Admin user role is strictly "admin"');
  assert(!adminData.user.password, 'Admin user payload does NOT expose password hash');

  const decodedAdmin = jwt.decode(adminData.token);
  assert(decodedAdmin.role === 'admin', 'JWT payload contains role "admin"');
  assert(!!decodedAdmin.exp, 'JWT has expiration timestamp');

  const adminMe = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const adminMeData = await adminMe.json();
  assert(adminMe.status === 200 && adminMeData.user.role === 'admin', 'GET /api/auth/me validates Admin JWT session');
  assert(!adminMeData.user.password, 'GET /api/auth/me omits password hash');

  // 4. Manager Login & Role Boundaries
  console.log('\n--- 4. Testing Manager Login & Access Boundaries ---');
  const mgrLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
  });
  const mgrData = await mgrLogin.json();
  assert(mgrLogin.status === 200 && mgrData.success, 'Manager login succeeds with 200 OK');
  assert(mgrData.user.role === 'manager', 'Manager role is strictly "manager"');
  assert(!mgrData.user.password, 'Manager user payload does NOT expose password hash');

  const mgrToken = mgrData.token;
  const mgrSalary = await fetch(`${API_BASE}/salary`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(mgrSalary.status === 403, 'Manager is strictly BLOCKED from /api/salary with 403 Forbidden');

  const mgrAudit = await fetch(`${API_BASE}/audit-logs`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(mgrAudit.status === 403, 'Manager is strictly BLOCKED from /api/audit-logs with 403 Forbidden');

  // 5. Employee Login & Strict Role Restrictions
  console.log('\n--- 5. Testing Employee Login & Access Restrictions ---');
  const empLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
  });
  const empData = await empLogin.json();
  assert(empLogin.status === 200 && empData.success, 'Employee login succeeds with 200 OK');
  assert(empData.user.role === 'employee', 'Employee role is strictly "employee"');
  assert(!empData.user.password, 'Employee user payload does NOT expose password hash');

  const empToken = empData.token;
  const empDashboard = await fetch(`${API_BASE}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empDashboard.status === 403, 'Employee is strictly BLOCKED from /api/dashboard/stats with 403 Forbidden');

  const empSalaryAll = await fetch(`${API_BASE}/salary`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empSalaryAll.status === 403, 'Employee is strictly BLOCKED from /api/salary with 403 Forbidden');

  const empAudit = await fetch(`${API_BASE}/audit-logs`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empAudit.status === 403, 'Employee is strictly BLOCKED from /api/audit-logs with 403 Forbidden');

  // 6. Token Validation (Malformed, Invalid, Expired)
  console.log('\n--- 6. Testing Token Tampering & Expiration Handling ---');
  const malformedToken = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' },
  });
  const malformedData = await malformedToken.json();
  assert(malformedToken.status === 401 && malformedData.code === 'TOKEN_INVALID', 'Malformed token rejected with 401 and TOKEN_INVALID');

  const fakeSecretToken = jwt.sign({ id: adminData.user.id, role: 'admin' }, 'wrong-secret-key-1234');
  const forgedToken = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${fakeSecretToken}` },
  });
  const forgedData = await forgedToken.json();
  assert(forgedToken.status === 401 && forgedData.code === 'TOKEN_INVALID', 'Forged JWT secret rejected with 401 and TOKEN_INVALID');

  const expiredToken = jwt.sign(
    { id: adminData.user.id, role: 'admin' },
    process.env.JWT_SECRET || 'ems_jwt_secret_dev_2026',
    { expiresIn: -10 }
  );
  const expiredReq = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const expiredData = await expiredReq.json();
  assert(expiredReq.status === 401 && expiredData.code === 'TOKEN_EXPIRED', 'Expired JWT rejected with 401 and TOKEN_EXPIRED');

  // 7. IDOR & Ownership Security Tests
  console.log('\n--- 7. Testing IDOR & Ownership Protection ---');
  const empMySal = await fetch(`${API_BASE}/salary/my`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empMySal.status === 200, 'Employee can fetch their own /salary/my (200 OK)');

  // Try accessing admin salary list
  const adminSalaries = await fetch(`${API_BASE}/salary`, {
    headers: { Authorization: `Bearer ${adminData.token}` },
  });
  const adminSalData = await adminSalaries.json();
  if (adminSalData.salaries && adminSalData.salaries.length > 0) {
    const anotherSalary = adminSalData.salaries.find(s => s.employee?._id !== empData.user.employeeRef);
    if (anotherSalary) {
      const idorSalary = await fetch(`${API_BASE}/salary/my/${anotherSalary._id}`, {
        headers: { Authorization: `Bearer ${empToken}` },
      });
      assert(idorSalary.status === 403, 'Employee attempting to access another salary record via /salary/my/:id is BLOCKED (403 Forbidden)');
    }
  }

  // Employee personal documents
  const empDocs = await fetch(`${API_BASE}/documents/my`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empDocs.status === 200, 'Employee can fetch their own /documents/my (200 OK)');

  // Employee personal goals
  const empGoals = await fetch(`${API_BASE}/goals/my`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empGoals.status === 200, 'Employee can fetch their own /goals/my (200 OK)');

  // Employee personal tasks
  const empTasks = await fetch(`${API_BASE}/tasks/my`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empTasks.status === 200, 'Employee can fetch their own /tasks/my (200 OK)');

  // Summary
  console.log('\n====================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`AUDIT COMPLETE: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
