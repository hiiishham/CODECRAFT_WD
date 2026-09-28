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
import Department from '../models/Department.js';
import Salary from '../models/Salary.js';
import Notification from '../models/Notification.js';

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

const runComprehensiveSalaryAudit = async () => {
  console.log('\n==================================================');
  console.log('STARTING SALARY MANAGEMENT COMPREHENSIVE QA AUDIT');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');

    // 1. Setup Test Actors & Records
    let devDept = await Department.findOne({ name: 'Development' });
    if (!devDept) {
      devDept = await Department.create({ name: 'Development', description: 'Engineering team' });
    }

    let mktDept = await Department.findOne({ name: 'Marketing' });
    if (!mktDept) {
      mktDept = await Department.create({ name: 'Marketing', description: 'Marketing team' });
    }

    let admin = await Admin.findOne({ email: 'admin@ems.com' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Administrator',
        email: 'admin@ems.com',
        password: '$2a$10$hashedpasswordplaceholder',
        role: 'admin',
      });
    }

    let devManager = await Admin.findOne({ email: 'manager@ems.com' });
    if (!devManager) {
      devManager = await Admin.create({
        name: 'Dev Manager',
        email: 'manager@ems.com',
        password: '$2a$10$hashedpasswordplaceholder',
        role: 'manager',
        department: 'Development',
      });
    }

    let empA = await Employee.findOne({ email: 'employee@ems.com' });
    if (!empA) {
      empA = await Employee.create({
        employeeId: 'EMP-A-01',
        fullName: 'Alice Developer',
        email: 'employee@ems.com',
        phone: '+91 98765 11111',
        department: 'Development',
        designation: 'Software Engineer',
        salary: 0,
        status: 'Active',
      });
    }

    let empAUser = await Admin.findOne({ email: 'employee@ems.com' });
    if (!empAUser) {
      empAUser = await Admin.create({
        name: empA.fullName,
        email: empA.email,
        password: '$2a$10$hashedpasswordplaceholder',
        role: 'employee',
        department: 'Development',
      });
    }

    let empB = await Employee.findOne({ email: 'employee2@ems.com' });
    if (!empB) {
      empB = await Employee.create({
        employeeId: 'EMP-B-02',
        fullName: 'Bob Marketer',
        email: 'employee2@ems.com',
        phone: '+91 98765 22222',
        department: 'Marketing',
        designation: 'Marketing Associate',
        salary: 0,
        status: 'Active',
      });
    }

    let empBUser = await Admin.findOne({ email: 'employee2@ems.com' });
    if (!empBUser) {
      empBUser = await Admin.create({
        name: empB.fullName,
        email: empB.email,
        password: '$2a$10$hashedpasswordplaceholder',
        role: 'employee',
        department: 'Marketing',
      });
    }

    const adminToken = generateToken(admin._id, 'admin');
    const managerToken = generateToken(devManager._id, 'manager', devManager.department);
    const empAToken = generateToken(empAUser._id, 'employee', 'Development');
    const empBToken = generateToken(empBUser._id, 'employee', 'Marketing');

    console.log('Actors initialized:');
    console.log(`  Admin: ${admin.email}`);
    console.log(`  Manager: ${devManager.email}`);
    console.log(`  Employee A: ${empA.fullName} (${empA.email})`);
    console.log(`  Employee B: ${empB.fullName} (${empB.email})\n`);

    // Clean up test salary records for Emp A & Emp B
    await Salary.deleteMany({ employee: { $in: [empA._id, empB._id] } });

    // ==============================================================
    // 1. SALARY ARCHITECTURE & SCHEMA
    // ==============================================================
    console.log('--- Testing 1: Salary Architecture ---');
    const salaryIndexes = await Salary.collection.indexes();
    const hasCompoundPeriodIndex = salaryIndexes.some((idx) => idx.name === 'employee_1_payYear_1_payMonth_1');
    const hasStatusIndex = salaryIndexes.some((idx) => idx.name === 'status_1_createdAt_-1');
    recordResult(
      'Architecture',
      'Salary schema compound indexes configured properly',
      hasCompoundPeriodIndex && hasStatusIndex,
      `Indexes: ${salaryIndexes.length}`
    );

    // ==============================================================
    // 2. INPUT VALIDATION & NEGATIVE VALUES
    // ==============================================================
    console.log('\n--- Testing 2: Input Validation ---');

    // Missing required fields
    const missingRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    recordResult('Input Validation', 'Rejects missing required fields with 400', missingRes.status === 400);

    // Invalid employee ObjectId format
    const badIdRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: 'not-a-valid-id',
        basicSalary: 50000,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Input Validation', 'Rejects invalid employee ObjectId with 400', badIdRes.status === 400);

    // Non-existent employee ObjectId
    const fakeEmpId = new mongoose.Types.ObjectId().toString();
    const nonExistRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: fakeEmpId,
        basicSalary: 50000,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Input Validation', 'Rejects non-existent employee with 404', nonExistRes.status === 404);

    // Negative basic salary
    const negBasicRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: -1000,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Basic Salary', 'Rejects negative basic salary with 400', negBasicRes.status === 400);

    // Zero basic salary
    const zeroBasicRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 0,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Basic Salary', 'Rejects zero basic salary with 400', zeroBasicRes.status === 400);

    // Non-numeric basic salary
    const stringBasicRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 'abc',
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Basic Salary', 'Rejects non-numeric basic salary with 400', stringBasicRes.status === 400);

    // Negative allowances
    const negAllowRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 50000,
        allowances: -500,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Allowances', 'Rejects negative allowance amount with 400', negAllowRes.status === 400);

    // Itemized negative allowance
    const itemNegAllowRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 50000,
        allowances: [{ name: 'Bonus', amount: -250 }],
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Allowances', 'Rejects itemized negative allowance with 400', itemNegAllowRes.status === 400);

    // Negative deductions
    const negDeductRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 50000,
        deductions: -200,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Deductions', 'Rejects negative deduction amount with 400', negDeductRes.status === 400);

    // Deductions exceed gross earnings
    const exceedDeductRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 30000,
        allowances: 2000,
        deductions: 35000,
        effectiveFrom: '2026-09-01',
      }),
    });
    recordResult('Net Salary Calculation', 'Rejects deductions exceeding gross salary with 400', exceedDeductRes.status === 400);

    // ==============================================================
    // 3. CREATE SALARY & NET CALCULATION
    // ==============================================================
    console.log('\n--- Testing 3: Create Salary & Authoritative Net Calculation ---');
    // Basic: 50000, Allowances: 5000 (HRA 3000, Travel 2000), Deductions: 2000 (PF 1500, Tax 500) => Net: 53000
    const createRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 50000,
        allowances: [
          { name: 'HRA', amount: 3000 },
          { name: 'Travel Allowance', amount: 2000 },
        ],
        deductions: [
          { name: 'PF', amount: 1500 },
          { name: 'Professional Tax', amount: 500 },
        ],
        effectiveFrom: '2026-09-01',
        payMonth: 9,
        payYear: 2026,
        status: 'Draft',
        netSalary: 999999, // Attempted client-side spoof
      }),
    });
    const createData = await createRes.json();
    const createdSalaryAId = createData.salary?._id;

    recordResult(
      'Create Salary',
      'Admin creates salary record successfully',
      createRes.status === 201 && createData.success
    );

    recordResult(
      'Net Salary Calculation',
      'Server authoritatively computes Net Salary: 50k + 5k - 2k = 53k (spoofed value discarded)',
      createData.salary?.netSalary === 53000 && createData.salary?.grossSalary === 55000 && createData.salary?.totalDeductions === 2000
    );

    // Verify employee record synchronization
    const syncedEmpA = await Employee.findById(empA._id);
    recordResult(
      'Employee Sync',
      'Employee model salary field synchronized with calculated net salary',
      syncedEmpA.salary === 53000
    );

    // Duplicate prevention for same pay period
    const dupRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 60000,
        effectiveFrom: '2026-09-15',
        payMonth: 9,
        payYear: 2026,
      }),
    });
    recordResult('Duplicate Prevention', 'Rejects duplicate salary record for same pay period with 409 Conflict', dupRes.status === 409);

    // Create a salary record for Employee B
    const createBRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: empB._id.toString(),
        basicSalary: 60000,
        allowances: [{ name: 'Marketing Allowance', amount: 4000 }],
        deductions: [{ name: 'Tax', amount: 2000 }],
        effectiveFrom: '2026-09-01',
        payMonth: 9,
        payYear: 2026,
        status: 'Processed',
      }),
    });
    const createBData = await createBRes.json();
    const createdSalaryBId = createBData.salary?._id;

    recordResult(
      'Create Salary',
      'Admin creates salary record for Employee B successfully',
      createBRes.status === 201 && createBData.success
    );

    // ==============================================================
    // 4. EMPLOYEE OWN SALARY & ISOLATION
    // ==============================================================
    console.log('\n--- Testing 4: Employee Own Salary Access ---');

    // Employee A accesses own latest salary
    const empAMySalRes = await fetch(`${BASE_URL}/salary/my`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    const empAMySalData = await empAMySalRes.json();
    recordResult(
      'Employee Own Salary',
      'Employee A retrieves own latest salary successfully',
      empAMySalRes.status === 200 && empAMySalData.salary?.netSalary === 53000
    );

    // Employee A accesses own salary history
    const empAHistRes = await fetch(`${BASE_URL}/salary/my/history`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    const empAHistData = await empAHistRes.json();
    recordResult(
      'Salary History',
      'Employee A retrieves own salary history',
      empAHistRes.status === 200 && Array.isArray(empAHistData.salaries) && empAHistData.salaries.length >= 1
    );

    // Employee A accesses own salary by ID
    const empAOwnByIdRes = await fetch(`${BASE_URL}/salary/my/${createdSalaryAId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult(
      'Employee Own Salary',
      'Employee A accesses own specific salary record by ID',
      empAOwnByIdRes.status === 200
    );

    // ==============================================================
    // 5. IDOR / BOLA SECURITY TESTING (CRITICAL)
    // ==============================================================
    console.log('\n--- Testing 5: IDOR / BOLA Security Testing ---');

    // 5a. Employee A attempts to fetch Employee B's salary via /api/salary/my/:id
    const idorGetMyRes = await fetch(`${BASE_URL}/salary/my/${createdSalaryBId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult(
      'IDOR/BOLA Security',
      'Employee A blocked from accessing Employee B salary via /api/salary/my/:id (403 Forbidden)',
      idorGetMyRes.status === 403
    );

    // 5b. Employee A attempts to fetch Employee B's salary via admin route /api/salary/:id
    const idorAdminGetRes = await fetch(`${BASE_URL}/salary/${createdSalaryBId}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult(
      'IDOR/BOLA Security',
      'Employee A blocked from admin /api/salary/:id (403 Forbidden)',
      idorAdminGetRes.status === 403
    );

    // 5c. Employee A attempts to query salaries with parameter manipulation
    const idorQueryRes = await fetch(`${BASE_URL}/salary?employeeId=${empB._id}`, {
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult(
      'IDOR/BOLA Security',
      'Employee A blocked from querying /api/salary?employeeId= (403 Forbidden)',
      idorQueryRes.status === 403
    );

    // 5d. Employee A attempts to edit Employee B's salary
    const idorPutRes = await fetch(`${BASE_URL}/salary/${createdSalaryBId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${empAToken}` },
      body: JSON.stringify({ basicSalary: 100000 }),
    });
    recordResult(
      'IDOR/BOLA Security',
      'Employee A blocked from editing Employee B salary (403 Forbidden)',
      idorPutRes.status === 403
    );

    // 5e. Employee A attempts to delete Employee B's salary
    const idorDelRes = await fetch(`${BASE_URL}/salary/${createdSalaryBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${empAToken}` },
    });
    recordResult(
      'IDOR/BOLA Security',
      'Employee A blocked from deleting Employee B salary (403 Forbidden)',
      idorDelRes.status === 403
    );

    // ==============================================================
    // 6. MANAGER SECURITY TESTING
    // ==============================================================
    console.log('\n--- Testing 6: Manager Role Security ---');

    // Manager attempts to access /api/salary
    const mgrListRes = await fetch(`${BASE_URL}/salary`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    recordResult(
      'Manager Security',
      'Manager blocked from /api/salary (403 Forbidden)',
      mgrListRes.status === 403
    );

    // Manager attempts to access /api/salary/stats
    const mgrStatsRes = await fetch(`${BASE_URL}/salary/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    recordResult(
      'Manager Security',
      'Manager blocked from /api/salary/stats (403 Forbidden)',
      mgrStatsRes.status === 403
    );

    // Manager attempts to create a salary record
    const mgrCreateRes = await fetch(`${BASE_URL}/salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        employee: empA._id.toString(),
        basicSalary: 60000,
        effectiveFrom: '2026-11-01',
      }),
    });
    recordResult(
      'Manager Security',
      'Manager blocked from creating salary records (403 Forbidden)',
      mgrCreateRes.status === 403
    );

    // ==============================================================
    // 7. API RESPONSE & DATA LEAK AUDIT
    // ==============================================================
    console.log('\n--- Testing 7: API Response & Data Leak Audit ---');

    // 7a. Employee list response hides salary from manager
    const empListMgr = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    const leakedInEmpList = empListMgr.employees?.some((e) => e.salary !== undefined);
    recordResult(
      'API Response Security',
      'Employee list endpoint strictly omits salary field for non-admin',
      !leakedInEmpList
    );

    // 7b. Single employee details response hides salary from non-admin
    const empDetailMgr = await fetch(`${BASE_URL}/employees/${empA._id}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    recordResult(
      'API Response Security',
      'Employee details endpoint omits salary field for non-admin',
      empDetailMgr.employee?.salary === undefined
    );

    // 7c. Dashboard stats omits salaryOverview for manager
    const dashMgr = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    recordResult(
      'Dashboard Integration',
      'Dashboard stats omits salary overview for manager role',
      !dashMgr.salaryOverview && !dashMgr.stats?.salaryOverview
    );

    // 7d. Admin dashboard stats includes salaryOverview
    const dashAdmin = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult(
      'Dashboard Integration',
      'Admin dashboard stats correctly includes salary overview metrics',
      !!(dashAdmin.stats?.salaryOverview || dashAdmin.salaryOverview)
    );

    // 7e. Global search omits salary information
    const searchRes = await fetch(`${BASE_URL}/search?q=Alice`, {
      headers: { Authorization: `Bearer ${empBToken}` },
    }).then((r) => r.json());
    const searchResults = searchRes.results?.employees || [];
    const leakedInSearch = searchResults.some((e) => e.salary !== undefined);
    recordResult(
      'Global Search Security',
      'Global search omits confidential salary values',
      !leakedInSearch
    );

    // ==============================================================
    // 8. EDIT SALARY & RECALCULATION
    // ==============================================================
    console.log('\n--- Testing 8: Edit Salary ---');
    // Update Salary A to Basic: 70000, Allowances: 8000, Deductions: 3000 => Net: 75000
    const editRes = await fetch(`${BASE_URL}/salary/${createdSalaryAId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        basicSalary: 70000,
        allowances: [{ name: 'HRA', amount: 5000 }, { name: 'Travel', amount: 3000 }],
        deductions: [{ name: 'PF', amount: 2000 }, { name: 'Tax', amount: 1000 }],
      }),
    });
    const editData = await editRes.json();
    recordResult(
      'Edit Salary',
      'Admin updates salary and server recalculates Net: 70k + 8k - 3k = 75k',
      editRes.status === 200 && editData.salary?.netSalary === 75000
    );

    // Verify employee record synchronized after edit
    const updatedEmpA = await Employee.findById(empA._id);
    recordResult(
      'Employee Sync',
      'Employee model salary synchronized after salary update',
      updatedEmpA.salary === 75000
    );

    // Refresh persistence check
    const refreshedSalary = await Salary.findById(createdSalaryAId);
    recordResult(
      'Refresh Persistence',
      'Salary changes persisted accurately in MongoDB',
      refreshedSalary.netSalary === 75000 && refreshedSalary.basicSalary === 70000
    );

    // ==============================================================
    // 9. SEARCH, FILTERS, SORT & PAGINATION
    // ==============================================================
    console.log('\n--- Testing 9: Search, Filters, Sort & Pagination ---');

    // Search by employee name
    const firstNameA = empA.fullName.split(' ')[0];
    const searchName = await fetch(`${BASE_URL}/salary?search=${encodeURIComponent(firstNameA)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult(
      'Search',
      'Search salary by employee name works',
      searchName.salaries?.some((s) => s.employee?.fullName.includes(firstNameA))
    );

    // Search by employee ID
    const searchId = await fetch(`${BASE_URL}/salary?search=${encodeURIComponent(empB.employeeId)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult(
      'Search',
      'Search salary by employee ID works',
      searchId.salaries?.some((s) => s.employee?.employeeId === empB.employeeId)
    );

    // Filter by department
    const filterDept = await fetch(`${BASE_URL}/salary?department=Development`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const allDev = filterDept.salaries?.every((s) => s.employee?.department === 'Development');
    recordResult(
      'Filters',
      'Filter salaries by department works',
      allDev && filterDept.salaries?.length >= 1
    );

    // Filter by payMonth and payYear
    const filterMonth = await fetch(`${BASE_URL}/salary?month=9&year=2026`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult(
      'Filters',
      'Filter salaries by month/year works with parameter compatibility',
      filterMonth.salaries?.every((s) => s.payMonth === 9 && s.payYear === 2026)
    );

    // Sort by salary desc
    const sortDesc = await fetch(`${BASE_URL}/salary?sort=salary_desc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const sortedList = sortDesc.salaries || [];
    const isSortedDesc = sortedList.length < 2 || sortedList[0].netSalary >= sortedList[1].netSalary;
    recordResult(
      'Filters',
      'Sorting salaries by salary_desc works',
      isSortedDesc
    );

    // Backend pagination
    const paginated = await fetch(`${BASE_URL}/salary?limit=1&page=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    recordResult(
      'Filters',
      'Backend pagination returns exact limit count',
      paginated.salaries?.length === 1 && paginated.totalPages >= 2
    );

    // ==============================================================
    // 10. NOTIFICATIONS SECURITY
    // ==============================================================
    console.log('\n--- Testing 10: Notifications Security ---');
    const empANotifs = await Notification.find({ recipient: empAUser._id }).sort({ createdAt: -1 });
    const hasSalaryNotif = empANotifs.some((n) => n.type === 'salary');
    const hasLeakedAmount = empANotifs.some((n) => n.message?.includes('75000') || n.message?.includes('53000'));
    recordResult(
      'Notifications Security',
      'Salary update sent notification to target employee without exposing cleartext figures',
      hasSalaryNotif && !hasLeakedAmount
    );

    // ==============================================================
    // 11. DELETE SALARY & EMPLOYEE SYNC
    // ==============================================================
    console.log('\n--- Testing 11: Delete Salary & Business Rules ---');

    // Attempt to delete Processed salary (Salary B) -> blocked with 400
    const delProcessedRes = await fetch(`${BASE_URL}/salary/${createdSalaryBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult(
      'Delete Salary',
      'Rejects deletion of processed/paid salary records with 400',
      delProcessedRes.status === 400
    );

    // Delete Draft salary (Salary A) -> succeeds
    const delDraftRes = await fetch(`${BASE_URL}/salary/${createdSalaryAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult(
      'Delete Salary',
      'Admin deletes draft salary record successfully',
      delDraftRes.status === 200
    );

    // Verify employee A salary field reset/resynced
    const empAAfterDel = await Employee.findById(empA._id);
    recordResult(
      'Employee Sync',
      'Employee model salary resynced to 0 when last salary record deleted',
      empAAfterDel.salary === 0
    );

    // Clean up test salary B
    await Salary.findByIdAndDelete(createdSalaryBId);

    // ==============================================================
    // SUMMARY
    // ==============================================================
    console.log('\n==================================================');
    console.log('SALARY MANAGEMENT QA SUITE SUMMARY');
    console.log('==================================================');
    const totalChecks = results.length;
    const passedChecks = results.filter((r) => r.passed).length;
    const failedChecks = results.filter((r) => !r.passed).length;

    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${failedChecks}\n`);

    if (failedChecks === 0) {
      console.log('🎉 ALL SALARY MANAGEMENT CHECKS PASSED WITH 100% SUCCESS!\n');
      process.exit(0);
    } else {
      console.error(`❌ ${failedChecks} CHECKS FAILED! Check logs above.\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runComprehensiveSalaryAudit();
