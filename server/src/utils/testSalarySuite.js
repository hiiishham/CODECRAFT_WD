// Comprehensive Automated Test Suite for StaffPulse Salary Management & Security Controls
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = 'http://localhost:5000/api';

async function runSalaryTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE SALARY MANAGEMENT & SECURITY AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  const Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({}, { strict: false }),
    'employees'
  );
  const Salary = mongoose.model(
    'Salary',
    new mongoose.Schema({}, { strict: false }),
    'salaries'
  );

  let adminToken = '';
  let managerToken = '';
  let employeeToken = '';
  let testEmp1 = null;
  let testEmp2 = null;
  let createdSalaryId = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Find or create two active test employees
    // -------------------------------------------------------------
    console.log('[Setup] Preparing test employees...');
    testEmp1 = await Employee.findOne({ employeeId: 'SAL-TEST-01' });
    if (!testEmp1) {
      testEmp1 = await Employee.create({
        employeeId: 'SAL-TEST-01',
        fullName: 'Alexander SalaryTester',
        email: 'alex.salary@ems.com',
        phone: '+91 98765 43210',
        department: 'Development',
        designation: 'Senior Architect',
        salary: 0,
        status: 'Active',
      });
    }

    testEmp2 = await Employee.findOne({ employeeId: 'SAL-TEST-02' });
    if (!testEmp2) {
      testEmp2 = await Employee.create({
        employeeId: 'SAL-TEST-02',
        fullName: 'Beatrice CompensationTester',
        email: 'beatrice.salary@ems.com',
        phone: '+91 98765 43211',
        department: 'Design',
        designation: 'Lead Designer',
        salary: 0,
        status: 'Active',
      });
    }

    // Clean up any lingering test salaries for these employees
    await Salary.deleteMany({ employee: { $in: [testEmp1._id, testEmp2._id] } });

    // -------------------------------------------------------------
    // 1. AUTHENTICATE ALL 3 ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin, Manager, and Employee...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success || adminLogin.user.role !== 'admin') throw new Error('Admin login failed');
    adminToken = adminLogin.token;

    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (!managerLogin.success || managerLogin.user.role !== 'manager') throw new Error('Manager login failed');
    managerToken = managerLogin.token;

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!empLogin.success || empLogin.user.role !== 'employee') throw new Error('Employee login failed');
    employeeToken = empLogin.token;

    console.log('   ✓ Admin, Manager, and Employee logged in successfully\n');

    // -------------------------------------------------------------
    // 2. SECURITY & RBAC TESTS
    // -------------------------------------------------------------
    console.log('2. Testing Security & RBAC Enforcement:');

    // 2a. Unauthenticated request (no token) -> 401
    const noTokenRes = await fetch(`${API_URL}/salaries`);
    if (noTokenRes.status !== 401) throw new Error(`Expected 401 for unauthenticated request, got ${noTokenRes.status}`);
    console.log('   ✓ Unauthenticated request properly rejected with 401');

    // 2b. Manager request -> 403 Forbidden
    const mgrRes = await fetch(`${API_URL}/salaries`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrRes.status !== 403) throw new Error(`Expected 403 for manager salary request, got ${mgrRes.status}`);
    console.log('   ✓ Manager role rejected from salary API with 403 Forbidden');

    // 2c. Employee request -> 403 Forbidden
    const empRes = await fetch(`${API_URL}/salaries`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    if (empRes.status !== 403) throw new Error(`Expected 403 for employee salary request, got ${empRes.status}`);
    console.log('   ✓ Employee role rejected from salary API with 403 Forbidden');

    // 2d. Manager requesting salary stats -> 403 Forbidden
    const mgrStatsRes = await fetch(`${API_URL}/salaries/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (mgrStatsRes.status !== 403) throw new Error(`Expected 403 for manager salary stats, got ${mgrStatsRes.status}`);
    console.log('   ✓ Manager rejected from salary stats API with 403 Forbidden');

    // 2e. Verify Employee List endpoint hides salary field from unauthorized roles
    const empListMgrRes = await fetch(`${API_URL}/employees`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const empListMgrData = await empListMgrRes.json();
    const hasSalaryLeaked = empListMgrData.employees?.some((e) => e.salary !== undefined);
    if (hasSalaryLeaked) throw new Error('Security Violation: Salary field leaked in employee list to manager!');
    console.log('   ✓ Employee list response strictly omits salary field for non-admin roles');

    // 2f. Verify Dashboard stats hides salaryOverview from non-admin roles
    const dashMgrRes = await fetch(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const dashMgrData = await dashMgrRes.json();
    if (dashMgrData.salaryOverview || dashMgrData.stats?.salaryOverview) {
      throw new Error('Security Violation: Salary overview leaked in dashboard to manager!');
    }
    console.log('   ✓ Dashboard stats strictly omits salary overview for non-admin roles\n');

    // -------------------------------------------------------------
    // 3. VALIDATION & ERROR HANDLING
    // -------------------------------------------------------------
    console.log('3. Testing Server-side Validation:');

    // 3a. Missing required fields
    const missingRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    if (missingRes.status !== 400) throw new Error(`Expected 400 for missing fields, got ${missingRes.status}`);
    console.log('   ✓ Missing required fields rejected with 400');

    // 3b. Invalid ObjectId for employee
    const invalidIdRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: '123-not-an-id',
        basicSalary: 40000,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (invalidIdRes.status !== 400) throw new Error(`Expected 400 for invalid ObjectId, got ${invalidIdRes.status}`);
    console.log('   ✓ Invalid employee ObjectId format rejected with 400');

    // 3c. Non-existent employee ObjectId
    const fakeId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: fakeId,
        basicSalary: 40000,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (nonExistRes.status !== 404) throw new Error(`Expected 404 for non-existent employee, got ${nonExistRes.status}`);
    console.log('   ✓ Non-existent employee rejected with 404');

    // 3d. Non-positive basic salary
    const negBasicRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp1._id.toString(),
        basicSalary: -1000,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (negBasicRes.status !== 400) throw new Error(`Expected 400 for negative basic salary, got ${negBasicRes.status}`);
    console.log('   ✓ Negative basic salary rejected with 400');

    // 3e. Negative allowances
    const negAllowRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp1._id.toString(),
        basicSalary: 40000,
        allowances: -500,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (negAllowRes.status !== 400) throw new Error(`Expected 400 for negative allowances, got ${negAllowRes.status}`);
    console.log('   ✓ Negative allowances rejected with 400');

    // 3f. Deductions exceed basic + allowances (net salary < 0)
    const netNegRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp1._id.toString(),
        basicSalary: 30000,
        allowances: 2000,
        deductions: 40000,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (netNegRes.status !== 400) throw new Error(`Expected 400 for net salary < 0, got ${netNegRes.status}`);
    console.log('   ✓ Negative net salary (deductions > basic + allow) rejected with 400\n');

    // -------------------------------------------------------------
    // 4. CREATE SALARY & SERVER-SIDE NET CALCULATION
    // -------------------------------------------------------------
    console.log('4. Testing Salary Creation & Net Salary Calculation:');

    // Basic: 50000, Allowances: 5000, Deductions: 2000 => Net: 53000
    const createRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp1._id.toString(),
        basicSalary: 50000,
        allowances: 5000,
        deductions: 2000,
        effectiveFrom: '2026-09-01',
        netSalary: 999999, // Intentional frontend spoof to verify backend recalculation
      }),
    });
    const createData = await createRes.json();
    if (createRes.status !== 201 || !createData.success) {
      throw new Error(`Salary creation failed: ${createData.message}`);
    }

    createdSalaryId = createData.salary._id;
    if (createData.salary.netSalary !== 53000) {
      throw new Error(`Net salary calculation error: Expected 53000, got ${createData.salary.netSalary}`);
    }
    console.log('   ✓ Salary created successfully (Status 201)');
    console.log('   ✓ Server-side Net Salary calculated accurately: ₹50,000 + ₹5,000 - ₹2,000 = ₹53,000');

    // Verify employee record sync
    const syncedEmp = await Employee.findById(testEmp1._id);
    if (syncedEmp.salary !== 53000) {
      throw new Error(`Employee salary sync failed: Expected 53000, got ${syncedEmp.salary}`);
    }
    console.log('   ✓ Employee document salary synchronized with calculated net salary');

    // -------------------------------------------------------------
    // 5. DUPLICATE SALARY PREVENTION
    // -------------------------------------------------------------
    console.log('\n5. Testing Duplicate Salary Prevention:');
    const duplicateRes = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp1._id.toString(),
        basicSalary: 60000,
        effectiveFrom: '2026-09-01',
      }),
    });
    if (duplicateRes.status !== 409) {
      throw new Error(`Expected 409 for duplicate salary record, got ${duplicateRes.status}`);
    }
    console.log('   ✓ Duplicate salary record for same employee rejected with 409 Conflict\n');

    // -------------------------------------------------------------
    // 6. GET SALARY BY ID
    // -------------------------------------------------------------
    console.log('6. Testing Get Salary Details:');
    const getByIdRes = await fetch(`${API_URL}/salaries/${createdSalaryId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getByIdData = await getByIdRes.json();
    if (getByIdRes.status !== 200 || !getByIdData.salary) {
      throw new Error('Failed to retrieve salary by ID');
    }
    if (getByIdData.salary.employee.fullName !== 'Alexander SalaryTester') {
      throw new Error('Employee population failed in salary details');
    }
    console.log('   ✓ Salary details retrieved with populated employee profile\n');

    // -------------------------------------------------------------
    // 7. UPDATE SALARY & RECALCULATE
    // -------------------------------------------------------------
    console.log('7. Testing Salary Update & Recalculation:');
    // Update to Basic: 70000, Allowances: 7000, Deductions: 4000 => Net: 73000
    const updateRes = await fetch(`${API_URL}/salaries/${createdSalaryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        basicSalary: 70000,
        allowances: 7000,
        deductions: 4000,
      }),
    });
    const updateData = await updateRes.json();
    if (updateRes.status !== 200 || updateData.salary.netSalary !== 73000) {
      throw new Error(`Update recalculation error: Expected 73000, got ${updateData.salary?.netSalary}`);
    }
    console.log('   ✓ Salary updated and net salary recalculated: ₹70,000 + ₹7,000 - ₹4,000 = ₹73,000');

    // Verify employee sync after update
    const updatedEmp = await Employee.findById(testEmp1._id);
    if (updatedEmp.salary !== 73000) {
      throw new Error(`Employee salary sync after update failed: Expected 73000, got ${updatedEmp.salary}`);
    }
    console.log('   ✓ Employee document salary synchronized after update\n');

    // -------------------------------------------------------------
    // 8. SEARCH, FILTER, SORT & PAGINATION
    // -------------------------------------------------------------
    console.log('8. Testing Search, Department Filter, Sorting, and Pagination:');

    // Create second salary for testEmp2
    const createEmp2Sal = await fetch(`${API_URL}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: testEmp2._id.toString(),
        basicSalary: 45000,
        allowances: 3000,
        deductions: 1000,
        effectiveFrom: '2026-08-01',
      }),
    });
    const emp2SalData = await createEmp2Sal.json();
    if (createEmp2Sal.status !== 201) throw new Error('Failed to create second salary record');
    const createdSalary2Id = emp2SalData.salary._id;

    // 8a. Search by Employee Name
    const searchNameRes = await fetch(`${API_URL}/salaries?search=Alexander`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!searchNameRes.salaries.some((s) => s.employee?.fullName.includes('Alexander'))) {
      throw new Error('Search by employee name failed');
    }
    console.log('   ✓ Search by employee name works');

    // 8b. Search by Employee ID
    const searchIdRes = await fetch(`${API_URL}/salaries?search=SAL-TEST-02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!searchIdRes.salaries.some((s) => s.employee?.employeeId === 'SAL-TEST-02')) {
      throw new Error('Search by employee ID failed');
    }
    console.log('   ✓ Search by employee ID works');

    // 8c. Department filter
    const deptRes = await fetch(`${API_URL}/salaries?department=Development`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const onlyDev = deptRes.salaries.every((s) => s.employee?.department === 'Development');
    if (!onlyDev) throw new Error('Department filtering failed');
    console.log('   ✓ Department filtering works');

    // 8d. Sorting (Salary: High -> Low)
    const sortDescRes = await fetch(`${API_URL}/salaries?sort=salary_desc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const salariesDesc = sortDescRes.salaries;
    if (salariesDesc.length >= 2 && salariesDesc[0].netSalary < salariesDesc[1].netSalary) {
      throw new Error('Sorting salary_desc failed');
    }
    console.log('   ✓ Sorting by salary (High -> Low) works');

    // 8e. Backend Pagination
    const pageRes = await fetch(`${API_URL}/salaries?limit=1&page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (pageRes.salaries.length !== 1 || pageRes.totalPages < 2) {
      throw new Error('Pagination limit/totalPages failed');
    }
    console.log('   ✓ Backend pagination works (limit=1, page=1 returned exactly 1 record)\n');

    // -------------------------------------------------------------
    // 9. SALARY STATS & DASHBOARD INTEGRATION
    // -------------------------------------------------------------
    console.log('9. Testing Salary Summary Stats & Dashboard Integration:');
    const statsRes = await fetch(`${API_URL}/salaries/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!statsRes.success || statsRes.stats.totalEmployees < 2) {
      throw new Error('Salary stats totalEmployees calculation failed');
    }
    if (statsRes.stats.highestSalary < statsRes.stats.lowestSalary) {
      throw new Error('Salary stats highest/lowest comparison invalid');
    }
    console.log('   ✓ Salary summary stats returned accurate aggregates');

    // Admin Dashboard stats includes salaryOverview
    const dashAdminRes = await fetch(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!dashAdminRes.stats?.salaryOverview && !dashAdminRes.salaryOverview) {
      throw new Error('Dashboard stats missing salaryOverview for admin role');
    }
    console.log('   ✓ Dashboard stats includes salaryOverview for admin users\n');

    // -------------------------------------------------------------
    // 10. DELETE SALARY
    // -------------------------------------------------------------
    console.log('10. Testing Delete Salary Record:');
    const deleteRes = await fetch(`${API_URL}/salaries/${createdSalaryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (deleteRes.status !== 200) throw new Error('Delete salary failed');

    // Verify 404 after deletion
    const verifyDelRes = await fetch(`${API_URL}/salaries/${createdSalaryId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (verifyDelRes.status !== 404) throw new Error('Salary record still exists after deletion');

    // Clean up second test salary
    await fetch(`${API_URL}/salaries/${createdSalary2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Verify employee salary reset
    const delEmp = await Employee.findById(testEmp1._id);
    if (delEmp.salary !== 0) throw new Error('Employee salary not reset after deletion');
    console.log('   ✓ Salary record deleted and verified with 404');
    console.log('   ✓ Employee document salary reset to 0 upon deletion\n');

    // Cleanup test employees
    await Employee.deleteMany({ employeeId: { $in: ['SAL-TEST-01', 'SAL-TEST-02'] } });

    console.log('=================================================================');
    console.log('ALL SALARY MANAGEMENT & SECURITY AUTOMATED TESTS PASSED (100%)');
    console.log('=================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ [TEST FAILURE]:', error.message);
    // Safe cleanup on error
    if (testEmp1?._id || testEmp2?._id) {
      await Salary.deleteMany({ employee: { $in: [testEmp1?._id, testEmp2?._id].filter(Boolean) } });
      await Employee.deleteMany({ employeeId: { $in: ['SAL-TEST-01', 'SAL-TEST-02'] } });
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runSalaryTests();
