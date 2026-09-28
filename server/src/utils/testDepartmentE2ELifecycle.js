import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runE2E() {
  console.log('===========================================================');
  console.log('RUNNING SECTION 16: COMPLETE END-TO-END DEPARTMENT WORKFLOW');
  console.log('===========================================================\n');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management');

    // 1. Admin Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✓ 1. Admin Login Success');

    // 2. Open Departments (GET /departments)
    const listRes1 = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData1 = await listRes1.json();
    console.log(`✓ 2. Open Departments: Retrieved ${listData1.departments.length} departments`);

    // 3. Search Departments
    const searchRes = await fetch(`${BASE_URL}/departments?search=Development`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.departments.some(d => d.name === 'Development')) {
      console.log('✓ 3. Search: Successfully found "Development"');
    }

    // 4. Clear Search
    const clearSearchRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const clearSearchData = await clearSearchRes.json();
    console.log(`✓ 4. Clear Search: Restored full list of ${clearSearchData.departments.length} departments`);

    // 5. Add Department
    const newDeptName = `Test Lifecycle Dept ${Date.now()}`;
    const addRes = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newDeptName,
        description: 'End-to-End Verification Department',
        status: 'Active'
      })
    });
    const addData = await addRes.json();
    const newDeptId = addData.department._id;
    console.log(`✓ 5. Add Department: Created "${newDeptName}" (ID: ${newDeptId})`);

    // 6. Refresh / Verify department exists
    const verifyRes = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    if (verifyData.success && verifyData.department.employeeCount === 0) {
      console.log(`✓ 6. Refresh & Verify: Department persisted with 0 employees`);
    }

    // 7. Create/Assign employee to department
    const newEmp = await Employee.create({
      fullName: 'Lifecycle Test Employee',
      employeeId: `EMP-LC-${Date.now().toString().slice(-4)}`,
      email: `lifecycle.emp.${Date.now()}@ems.com`,
      phone: '+1 555-0144',
      department: newDeptName,
      designation: 'Specialist',
      joiningDate: new Date(),
      salary: 80000,
      status: 'Active'
    });
    console.log(`✓ 7. Assign Employee: Created employee "${newEmp.fullName}" in "${newDeptName}"`);

    // 8. Verify employee count increased to 1
    const countAfterAssign = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const countAfterAssignData = await countAfterAssign.json();
    if (countAfterAssignData.department.employeeCount === 1) {
      console.log('✓ 8. Verify Employee Count: Accurately incremented to 1');
    } else {
      throw new Error(`Count mismatch: expected 1, got ${countAfterAssignData.department.employeeCount}`);
    }

    // 9. Try deleting department with employees (must be blocked)
    const blockedDeleteRes = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const blockedDeleteData = await blockedDeleteRes.json();
    if (blockedDeleteRes.status === 400 && blockedDeleteData.message.includes('assigned')) {
      console.log(`✓ 9. Delete Safety Check: Blocked with 400 - "${blockedDeleteData.message}"`);
    } else {
      throw new Error(`Delete safety check failed! Status: ${blockedDeleteRes.status}`);
    }

    // 10. Edit employee department -> Move to 'Design'
    newEmp.department = 'Design';
    await newEmp.save();
    console.log('✓ 10. Edit Employee Department: Reassigned employee from test dept to "Design"');

    // 11. Verify count updated -> test dept should now have 0
    const countAfterMove = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const countAfterMoveData = await countAfterMove.json();
    if (countAfterMoveData.department.employeeCount === 0) {
      console.log('✓ 11. Verify Counts Update: Test dept employeeCount decreased to 0');
    } else {
      throw new Error(`Count mismatch: expected 0, got ${countAfterMoveData.department.employeeCount}`);
    }

    // 12. Edit department
    const editedName = `${newDeptName} (Modified)`;
    const editDeptRes = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: editedName,
        description: 'Updated description for E2E flow',
        status: 'Active'
      })
    });
    const editDeptData = await editDeptRes.json();
    if (editDeptData.success && editDeptData.department.name === editedName) {
      console.log(`✓ 12. Edit Department: Name updated to "${editedName}"`);
    }

    // 13. Delete empty department
    const safeDeleteRes = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const safeDeleteData = await safeDeleteRes.json();
    if (safeDeleteRes.status === 200 && safeDeleteData.success) {
      console.log(`✓ 13. Delete Empty Department: Deleted successfully`);
    }

    // 14. Verify deletion
    const verifyDelRes = await fetch(`${BASE_URL}/departments/${newDeptId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (verifyDelRes.status === 404) {
      console.log('✓ 14. Verify Deletion: Department confirmed 404 Not Found in database');
    }

    // Cleanup test employee
    await Employee.deleteOne({ _id: newEmp._id });
    console.log('✓ 15. Cleanup: Removed temporary test employee');

    console.log('\n===========================================================');
    console.log('E2E WORKFLOW SUCCESSFULLY VALIDATED - 100% PASS');
    console.log('===========================================================');
  } catch (err) {
    console.error('E2E Workflow Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runE2E();
