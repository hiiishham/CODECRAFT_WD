// Comprehensive Automated Test Suite for StaffPulse Authentication, RBAC & Employee APIs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api';

async function cleanupTestEmployees() {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/employee_management';
  try {
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
  } catch {
    await mongoose.connect(localFallbackUri);
  }
  try {
    await mongoose.connection.collection('employees').deleteMany({
      employeeId: { $in: ['EMP-1001', 'EMP-1002', 'EMP-1003', 'EMP-1004', 'EMP-TEST-RBAC'] },
    });
  } catch {
    // Non-fatal
  }
  await mongoose.disconnect();
}

async function runTests() {
  console.log('=== STARTING COMPLETE AUTH & RBAC VERIFICATION SUITE ===\n');

  await cleanupTestEmployees();

  let adminToken = '';
  let managerToken = '';
  let employeeToken = '';
  let testEmpId = '';

  // 1. Health Check
  console.log('1. Testing Health Check [GET /api/health]');
  const healthRes = await fetch(`${API_URL}/health`);
  const healthData = await healthRes.json();
  if (!healthData.success) throw new Error('Health check failed');
  console.log('✓ Health check passed\n');

  // 2. Authentication Validation Tests
  console.log('2. Testing Authentication Validation Scenarios:');

  // 2a. Empty fields
  const emptyRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  });
  const emptyData = await emptyRes.json();
  if (emptyRes.status !== 400 || emptyData.success) throw new Error('Empty login fields should return 400');
  console.log('✓ Empty login fields correctly rejected with 400');

  // 2b. Wrong Email
  const wrongEmailRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@ems.com', password: 'Password123' }),
  });
  const wrongEmailData = await wrongEmailRes.json();
  if (wrongEmailRes.status !== 401 || wrongEmailData.success) throw new Error('Wrong email should return 401');
  console.log('✓ Non-existent email correctly rejected with 401');

  // 2c. Wrong Password
  const wrongPassRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ems.com', password: 'WrongPassword999!' }),
  });
  const wrongPassData = await wrongPassRes.json();
  if (wrongPassRes.status !== 401 || wrongPassData.success) throw new Error('Wrong password should return 401');
  console.log('✓ Wrong password correctly rejected with 401\n');

  // 3. Multi-Role Logins
  console.log('3. Testing Logins for All 3 Roles:');

  // 3a. Admin Login
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginData.success || adminLoginData.user.role !== 'admin') throw new Error('Admin login failed');
  if (adminLoginData.user.password) throw new Error('Security violation: Password hash leaked in login!');
  adminToken = adminLoginData.token;
  console.log('✓ Admin login successful (Role: admin)');

  // 3b. Manager Login
  const managerLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
  });
  const managerLoginData = await managerLoginRes.json();
  if (!managerLoginData.success || managerLoginData.user.role !== 'manager') throw new Error('Manager login failed');
  managerToken = managerLoginData.token;
  console.log('✓ Manager login successful (Role: manager)');

  // 3c. Employee Login
  const empLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
  });
  const empLoginData = await empLoginRes.json();
  if (!empLoginData.success || empLoginData.user.role !== 'employee') throw new Error('Employee login failed');
  employeeToken = empLoginData.token;
  console.log('✓ Employee login successful (Role: employee)\n');

  // 4. Session Persistence & /api/auth/me
  console.log('4. Testing Session Profile & Token Verification [GET /api/auth/me]:');
  const meRes = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const meData = await meRes.json();
  if (!meData.success || meData.user.email !== 'admin@ems.com' || meData.user.password) {
    throw new Error('Protected /me failed or leaked password');
  }
  console.log('✓ Admin session profile returned securely (Password excluded)');

  // Logout endpoint
  const logoutRes = await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
  const logoutData = await logoutRes.json();
  if (!logoutData.success) throw new Error('Logout endpoint failed');
  console.log('✓ Logout endpoint confirmed\n');

  // 5. Token Failure & Security Checks
  console.log('5. Testing Token Failure Scenarios:');

  // 5a. Missing Token
  const noTokenRes = await fetch(`${API_URL}/employees`);
  if (noTokenRes.status !== 401) throw new Error('Missing token should return 401');
  console.log('✓ Missing token correctly returns 401');

  // 5b. Invalid / Tampered Token
  const invalidTokenRes = await fetch(`${API_URL}/employees`, {
    headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' },
  });
  if (invalidTokenRes.status !== 401) throw new Error('Invalid token should return 401');
  console.log('✓ Invalid token correctly returns 401\n');

  // 6. Role-Based Access Control (RBAC) Permissions Matrix
  console.log('6. Testing Role-Based Access Control (RBAC):');

  // 6a. Create Employee (Admin ONLY)
  console.log('  Testing Employee Creation Permissions:');
  // Manager attempts to create employee -> MUST return 403
  const managerCreateRes = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managerToken}`,
    },
    body: JSON.stringify({
      employeeId: 'EMP-TEST-RBAC',
      fullName: 'Unauthorized Test',
      email: 'unauth@ems.com',
      phone: '+1-555-0000',
      department: 'Development',
      designation: 'Tester',
      salary: 50000,
    }),
  });
  const managerCreateData = await managerCreateRes.json();
  if (managerCreateRes.status !== 403) {
    throw new Error(`Manager should be denied creation with 403 (got ${managerCreateRes.status})`);
  }
  console.log('  ✓ Manager blocked from creating employee (403 Forbidden)');

  // Employee attempts to create employee -> MUST return 403
  const empCreateRes = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employeeToken}`,
    },
    body: JSON.stringify({
      employeeId: 'EMP-TEST-RBAC',
      fullName: 'Unauthorized Test',
      email: 'unauth@ems.com',
      phone: '+1-555-0000',
      department: 'Development',
      designation: 'Tester',
      salary: 50000,
    }),
  });
  if (empCreateRes.status !== 403) {
    throw new Error(`Employee should be denied creation with 403 (got ${empCreateRes.status})`);
  }
  console.log('  ✓ Employee blocked from creating employee (403 Forbidden)');

  // Admin creates employee -> MUST SUCCEED (201)
  const adminCreateRes = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      employeeId: 'EMP-TEST-RBAC',
      fullName: 'Authorized Employee',
      email: 'auth.emp@ems.com',
      phone: '+1-555-1234',
      department: 'Development',
      designation: 'Staff Engineer',
      salary: 105000,
    }),
  });
  const adminCreateData = await adminCreateRes.json();
  if (adminCreateRes.status !== 201 || !adminCreateData.success) {
    throw new Error('Admin creation failed');
  }
  testEmpId = adminCreateData.employee._id;
  console.log('  ✓ Admin permitted to create employee (201 Created)');

  // 6b. Directory Listing Permissions
  console.log('\n  Testing Directory Listing Permissions [GET /api/employees]:');
  // Employee attempts to list employees -> MUST return 403
  const empListRes = await fetch(`${API_URL}/employees`, {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  if (empListRes.status !== 403) throw new Error('Employee should be denied employee list access with 403');
  console.log('  ✓ Employee blocked from directory list (403 Forbidden)');

  // Manager attempts to list employees -> MUST SUCCEED (200)
  const managerListRes = await fetch(`${API_URL}/employees`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const managerListData = await managerListRes.json();
  if (managerListRes.status !== 200 || !managerListData.success) throw new Error('Manager should be permitted to list');
  console.log('  ✓ Manager permitted to view directory list (200 OK)');

  // Admin attempts to list employees -> MUST SUCCEED (200)
  const adminListRes = await fetch(`${API_URL}/employees`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminListRes.status !== 200) throw new Error('Admin should be permitted to list');
  console.log('  ✓ Admin permitted to view directory list (200 OK)');

  // 6c. Single Employee View Permissions [GET /api/employees/:id]
  console.log('\n  Testing Single Profile View Permissions [GET /api/employees/:id]:');
  // Employee can view single profile
  const empViewRes = await fetch(`${API_URL}/employees/${testEmpId}`, {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  if (empViewRes.status !== 200) throw new Error('Employee should be permitted to view profile');
  console.log('  ✓ Employee permitted to view individual profile (200 OK)');

  // 6d. Update Permissions (Admin ONLY)
  console.log('\n  Testing Update Permissions [PUT /api/employees/:id]:');
  // Manager attempts to edit -> MUST return 403
  const managerEditRes = await fetch(`${API_URL}/employees/${testEmpId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managerToken}`,
    },
    body: JSON.stringify({ designation: 'Manager Edited Title' }),
  });
  if (managerEditRes.status !== 403) throw new Error('Manager should be denied update access with 403');
  console.log('  ✓ Manager blocked from editing employee (403 Forbidden)');

  // Admin attempts to edit -> MUST SUCCEED (200)
  const adminEditRes = await fetch(`${API_URL}/employees/${testEmpId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ designation: 'Senior Staff Engineer' }),
  });
  if (adminEditRes.status !== 200) throw new Error('Admin should be permitted to update');
  console.log('  ✓ Admin permitted to update employee (200 OK)');

  // 6e. Delete Permissions (Admin ONLY)
  console.log('\n  Testing Deletion Permissions [DELETE /api/employees/:id]:');
  // Manager attempts to delete -> MUST return 403
  const managerDeleteRes = await fetch(`${API_URL}/employees/${testEmpId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  if (managerDeleteRes.status !== 403) throw new Error('Manager should be denied delete access with 403');
  console.log('  ✓ Manager blocked from deleting employee (403 Forbidden)');

  // Admin attempts to delete -> MUST SUCCEED (200)
  const adminDeleteRes = await fetch(`${API_URL}/employees/${testEmpId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (adminDeleteRes.status !== 200) throw new Error('Admin should be permitted to delete');
  console.log('  ✓ Admin permitted to delete employee (200 OK)\n');

  // 7. Department Management Tests
  console.log('7. Testing Department Management Module:');

  // 7a. RBAC for Departments
  console.log('\n  Testing Department RBAC:');
  // Employee cannot access departments list -> 403
  const empDeptRes = await fetch(`${API_URL}/departments`, {
    headers: { Authorization: `Bearer ${employeeToken}` },
  });
  if (empDeptRes.status !== 403) throw new Error('Employee should be denied department list with 403');
  console.log('  ✓ Employee blocked from departments list (403 Forbidden)');

  // Manager can view departments -> 200
  const mgrDeptRes = await fetch(`${API_URL}/departments`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  const mgrDeptData = await mgrDeptRes.json();
  if (mgrDeptRes.status !== 200 || !mgrDeptData.success) throw new Error('Manager should be permitted to view departments');
  console.log('  ✓ Manager permitted to view departments list (200 OK)');

  // Manager cannot create department -> 403
  const mgrCreateDeptRes = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managerToken}`,
    },
    body: JSON.stringify({ name: 'Manager Unauthorized Dept' }),
  });
  if (mgrCreateDeptRes.status !== 403) throw new Error('Manager should be denied department creation with 403');
  console.log('  ✓ Manager blocked from creating department (403 Forbidden)');

  // 7b. Admin Department Creation & Duplicate Prevention
  console.log('\n  Testing Department Creation & Uniqueness:');
  const createDeptRes = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'QA & Automation',
      description: 'Quality assurance, test automation, and release verification.',
      status: 'Active',
    }),
  });
  const createDeptData = await createDeptRes.json();
  if (createDeptRes.status !== 201 || !createDeptData.success) {
    throw new Error('Admin failed to create department');
  }
  const testDeptId = createDeptData.department._id;
  console.log('  ✓ Admin created new department: "QA & Automation" (201 Created)');

  // Duplicate name check (case-insensitive)
  const dupDeptRes = await fetch(`${API_URL}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'qa & automation',
      description: 'Duplicate dept',
    }),
  });
  if (dupDeptRes.status !== 409) throw new Error('Duplicate department name should return 409 Conflict');
  console.log('  ✓ Duplicate department name rejected with 409 Conflict');

  // 7c. Department Update
  console.log('\n  Testing Department Update:');
  const updateDeptRes = await fetch(`${API_URL}/departments/${testDeptId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'QA & Testing Engineering',
      description: 'Updated description for QA department.',
      status: 'Active',
    }),
  });
  const updateDeptData = await updateDeptRes.json();
  if (updateDeptRes.status !== 200 || !updateDeptData.success) throw new Error('Failed to update department');
  console.log('  ✓ Admin updated department name and description (200 OK)');

  // 7d. Department Details & Assigned Employees
  console.log('\n  Testing Department Details [GET /api/departments/:id]:');
  const deptDetailsRes = await fetch(`${API_URL}/departments/${testDeptId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deptDetailsData = await deptDetailsRes.json();
  if (deptDetailsRes.status !== 200 || !deptDetailsData.success) throw new Error('Failed to fetch department details');
  if (!Array.isArray(deptDetailsData.employees)) throw new Error('Department details must include employees array');
  console.log(`  ✓ Department details returned with ${deptDetailsData.employees.length} assigned employees`);

  // 7e. Delete Safeguard when Employees are Assigned
  console.log('\n  Testing Department Delete Safeguard:');
  // Create an employee assigned to "QA & Testing Engineering"
  const assignedEmpRes = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      employeeId: 'EMP-QA-99',
      fullName: 'QA Lead Tester',
      email: 'qa.lead@ems.com',
      phone: '+1-555-9988',
      department: 'QA & Testing Engineering',
      designation: 'Lead QA Engineer',
      salary: 95000,
      status: 'Active',
    }),
  });
  const assignedEmpData = await assignedEmpRes.json();
  if (assignedEmpRes.status !== 201) throw new Error('Failed to create test employee for delete safeguard');
  const assignedEmpId = assignedEmpData.employee._id;
  console.log('  ✓ Created test employee assigned to "QA & Testing Engineering"');

  // Attempt to delete department while employee is assigned -> MUST RETURN 400
  const deleteBlockedRes = await fetch(`${API_URL}/departments/${testDeptId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deleteBlockedData = await deleteBlockedRes.json();
  if (deleteBlockedRes.status !== 400 || deleteBlockedData.success) {
    throw new Error('Department with assigned employees should be rejected from deletion with 400');
  }
  if (!deleteBlockedData.message.includes('Cannot delete this department while employees are assigned to it')) {
    throw new Error('Unexpected delete blocked message');
  }
  console.log('  ✓ Deletion blocked with 400: Cannot delete while employees are assigned');

  // Remove test employee, then retry deletion
  await fetch(`${API_URL}/employees/${assignedEmpId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const deleteSuccessRes = await fetch(`${API_URL}/departments/${testDeptId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (deleteSuccessRes.status !== 200) throw new Error('Department deletion with 0 employees should succeed');
  console.log('  ✓ Successfully deleted department after removing assigned employees (200 OK)');

  // 7f. Dashboard Stats Department Integration
  console.log('\n  Testing Dashboard Stats Integration [GET /api/dashboard/stats]:');
  const dashRes = await fetch(`${API_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData = await dashRes.json();
  if (dashRes.status !== 200 || !dashData.success) throw new Error('Failed to load dashboard stats');
  if (typeof dashData.departmentCount !== 'number' || dashData.departmentCount < 7) {
    throw new Error('Dashboard stats should reflect real department count');
  }
  if (!Array.isArray(dashData.stats.departmentDistribution)) {
    throw new Error('Dashboard stats must include real departmentDistribution array');
  }
  console.log(`  ✓ Dashboard accurately returned ${dashData.departmentCount} departments with dynamic distribution\n`);

  console.log('===========================================================');
  console.log('🎉 ALL AUTHENTICATION, RBAC & DEPARTMENT TESTS PASSED! 🎉');
  console.log('===========================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
