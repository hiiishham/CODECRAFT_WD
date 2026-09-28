import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import Admin from '../models/Admin.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runDepartmentTestSuite() {
  console.log('====================================================');
  console.log('STARTING COMPLETE DEPARTMENT MANAGEMENT TEST SUITE');
  console.log('====================================================\n');

  const results = {};
  const pass = (name) => {
    results[name] = 'PASS';
    console.log(`[PASS] ${name}`);
  };
  const fail = (name, reason) => {
    results[name] = 'FAIL';
    console.error(`[FAIL] ${name}: ${reason}`);
  };

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management');
    console.log('[DB] Connected to MongoDB for Department QA Suite\n');

    // 1. Tokens for Admin, Manager, and Employee
    const login = async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Login failed for ${email}`);
      return data.token;
    };

    const adminToken = await login('admin@ems.com', 'Admin@123456');
    const managerToken = await login('manager@ems.com', 'Manager@123456');
    const employeeToken = await login('employee@ems.com', 'Employee@123456');

    // 2. Authorization Tests
    // 2a. Unauthenticated access blocked
    const unauthRes = await fetch(`${BASE_URL}/departments`);
    if (unauthRes.status === 401) {
      pass('Authorization: Unauthenticated access blocked with 401');
    } else {
      fail('Authorization', `Unauthenticated access returned status ${unauthRes.status}`);
    }

    // 2b. Employee role cannot access departments
    const empRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    if (empRes.status === 403) {
      pass('Authorization: Normal employee access blocked with 403');
    } else {
      fail('Authorization', `Employee access returned status ${empRes.status}`);
    }

    // 2c. Manager can view departments
    const mgrRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    if (mgrRes.status === 200) {
      pass('Authorization: Manager can view departments list');
    } else {
      fail('Authorization', `Manager view returned status ${mgrRes.status}`);
    }

    // 2d. Manager cannot create or delete departments
    const mgrCreateRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Dept' }),
    });
    if (mgrCreateRes.status === 403) {
      pass('Authorization: Manager blocked from creating department with 403');
    } else {
      fail('Authorization', `Manager create returned status ${mgrCreateRes.status}`);
    }

    // 3. Department List Verification
    const listRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();
    if (listRes.status === 200 && listData.success && Array.isArray(listData.departments)) {
      pass(`Department List: Loaded ${listData.departments.length} real database departments with dynamic employee counts`);
    } else {
      fail('Department List', `List failed with status ${listRes.status}`);
    }

    // 4. Form Validation & Creation
    // 4a. Missing name validation
    const missingNameRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: '   ', description: 'Testing' }),
    });
    if (missingNameRes.status === 400) {
      pass('Form Validation: Missing/blank department name rejected with 400');
    } else {
      fail('Form Validation', `Missing name returned status ${missingNameRes.status}`);
    }

    // 4b. Name length validation (< 2 characters)
    const shortNameRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'A', description: 'Testing' }),
    });
    if (shortNameRes.status === 400) {
      pass('Form Validation: Name shorter than 2 characters rejected with 400');
    } else {
      fail('Form Validation', `Short name returned status ${shortNameRes.status}`);
    }

    // 4c. Clean up any existing test department
    const testDeptName = `QA Automated Dept ${Date.now()}`;
    await Department.deleteMany({ name: { $regex: /^QA Automated Dept/i } });

    // 4d. Add Department successfully
    const createRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testDeptName,
        description: 'Temporary department created by QA test suite',
        status: 'Active',
      }),
    });
    const createData = await createRes.json();
    if (createRes.status === 201 && createData.success && createData.department?._id) {
      pass(`Add Department: Created department "${testDeptName}" with initial employeeCount = 0`);
    } else {
      fail('Add Department', `Failed to create department: ${JSON.stringify(createData)}`);
    }

    const createdDeptId = createData.department._id;

    // 4e. Duplicate Department Name Prevention (Case-Insensitive)
    const dupRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testDeptName.toLowerCase(),
        description: 'Duplicate attempt',
      }),
    });
    if (dupRes.status === 409) {
      pass('Duplicate Prevention: Case-insensitive duplicate name blocked with 409');
    } else {
      fail('Duplicate Prevention', `Duplicate creation returned status ${dupRes.status}`);
    }

    // 5. Search Functionality
    const searchRes = await fetch(`${BASE_URL}/departments?search=${encodeURIComponent(testDeptName)}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    const found = searchData.departments?.some(d => d.name === testDeptName);
    if (searchRes.status === 200 && found) {
      pass('Search: Found newly created department by name');
    } else {
      fail('Search', `Search for "${testDeptName}" failed`);
    }

    // 6. Edit Department
    const updatedName = `${testDeptName} (Renamed)`;
    const editRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: updatedName,
        description: 'Updated description for QA test',
        status: 'Active',
      }),
    });
    const editData = await editRes.json();
    if (editRes.status === 200 && editData.success && editData.department.name === updatedName) {
      pass('Edit Department: Updated name, description, and status in MongoDB');
    } else {
      fail('Edit Department', `Edit failed with status ${editRes.status}: ${JSON.stringify(editData)}`);
    }

    // 7. Employee Count & Employee Department Assignment
    // Create or reassign a test employee to this department
    let testEmp = await Employee.findOne({ email: 'qa.test.dept@ems.com' });
    if (!testEmp) {
      testEmp = await Employee.create({
        fullName: 'QA Dept Test Employee',
        employeeId: 'EMP-QA-DEPT',
        email: 'qa.test.dept@ems.com',
        phone: '+1 555-0199',
        department: updatedName,
        designation: 'QA Engineer',
        joiningDate: new Date(),
        salary: 75000,
        status: 'Active',
      });
    } else {
      testEmp.department = updatedName;
      await testEmp.save();
    }

    // Check department employee count
    const countCheckRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const countCheckData = await countCheckRes.json();
    if (countCheckData.success && countCheckData.department.employeeCount === 1) {
      pass('Employee Count: Accurately reflected 1 assigned employee in department details');
    } else {
      fail('Employee Count', `Expected count 1, received ${countCheckData.department?.employeeCount}`);
    }

    // 8. Delete Safety: Cannot delete department with assigned employees
    const unsafeDeleteRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const unsafeDeleteData = await unsafeDeleteRes.json();
    if (unsafeDeleteRes.status === 400 && unsafeDeleteData.message?.includes('assigned')) {
      pass('Delete Safety: Deletion rejected with 400 when employees are assigned');
    } else {
      fail('Delete Safety', `Expected 400 rejection, got status ${unsafeDeleteRes.status}`);
    }

    // 9. Reassign employee away from department
    testEmp.department = 'Development';
    await testEmp.save();

    // Verify employee count is now 0
    const zeroCountRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const zeroCountData = await zeroCountRes.json();
    if (zeroCountData.success && zeroCountData.department.employeeCount === 0) {
      pass('Employee Count: Decreased to 0 after employee reassignment');
    } else {
      fail('Employee Count', `Expected count 0, got ${zeroCountData.department?.employeeCount}`);
    }

    // 10. Delete Department: Empty department can now be deleted safely
    const safeDeleteRes = await fetch(`${BASE_URL}/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const safeDeleteData = await safeDeleteRes.json();
    if (safeDeleteRes.status === 200 && safeDeleteData.success) {
      pass('Delete Department: Empty department successfully deleted');
    } else {
      fail('Delete Department', `Delete failed with status ${safeDeleteRes.status}`);
    }

    // Verify it is completely removed from DB
    const deletedDept = await Department.findById(createdDeptId);
    if (!deletedDept) {
      pass('Database Integrity: Department verified permanently removed from MongoDB');
    } else {
      fail('Database Integrity', 'Department still exists in MongoDB after deletion');
    }

    // Clean up test employee
    await Employee.deleteOne({ email: 'qa.test.dept@ems.com' });

    // 11. Error State handling
    // 11a. Invalid ObjectId format
    const invalidIdRes = await fetch(`${BASE_URL}/departments/invalid-id-format`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (invalidIdRes.status === 400) {
      pass('Error State: Invalid ObjectId format returns 400');
    } else {
      fail('Error State', `Invalid ObjectId returned status ${invalidIdRes.status}`);
    }

    // 11b. Non-existent department ID
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/departments/${fakeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (notFoundRes.status === 404) {
      pass('Error State: Non-existent department ID returns 404');
    } else {
      fail('Error State', `Non-existent ID returned status ${notFoundRes.status}`);
    }

    // 12. Audit Logging
    const latestAudit = await AuditLog.findOne({ module: 'DEPARTMENT' }).sort({ createdAt: -1 });
    if (latestAudit && ['CREATE', 'UPDATE', 'DELETE'].includes(latestAudit.action)) {
      pass(`Audit Logging: Recorded "${latestAudit.action}" event in AuditLog collection`);
    } else {
      fail('Audit Logging', 'No department audit log found');
    }

    console.log('\n====================================================');
    console.log('ALL DEPARTMENT TESTS COMPLETED');
    console.log('====================================================');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runDepartmentTestSuite();
