import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Admin from '../models/Admin.js';
import Task from '../models/Task.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING STAFFPULSE EMPLOYEE MODULE COMPREHENSIVE TEST SUITE');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management');
  console.log('Connected to MongoDB');

  // Fetch or generate tokens for admin, manager, employee
  const adminUser = await Admin.findOne({ email: 'admin@ems.com' });
  const managerUser = await Admin.findOne({ email: 'manager@ems.com' });
  const employeeUser = await Admin.findOne({ email: 'employee@ems.com' });

  if (!adminUser || !managerUser || !employeeUser) {
    throw new Error('Required test accounts not found in database!');
  }

  const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  const managerToken = jwt.sign({ id: managerUser._id, role: managerUser.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });
  const employeeToken = jwt.sign({ id: employeeUser._id, role: employeeUser.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

  let results = {};

  const request = async (url, options = {}, token = adminToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  };

  // 1. Employee List
  console.log('\n--- 1. Testing Employee List ---');
  const listRes = await request('/employees?page=1&limit=5');
  console.log(`Status: ${listRes.status}, count: ${listRes.data?.employees?.length}, total: ${listRes.data?.totalEmployees}`);
  if (listRes.status === 200 && Array.isArray(listRes.data?.employees) && listRes.data.employees.length > 0) {
    const firstEmp = listRes.data.employees[0];
    const hasRequiredFields = firstEmp.fullName && firstEmp.employeeId && firstEmp.email && firstEmp.department && firstEmp.designation && firstEmp.status;
    results.employeeList = hasRequiredFields ? 'PASS' : 'FAIL';
  } else {
    results.employeeList = 'FAIL';
  }
  console.log('Employee List:', results.employeeList);

  // 2. Search
  console.log('\n--- 2. Testing Employee Search ---');
  const sampleEmp = await Employee.findOne();
  // Name search
  const searchNameRes = await request(`/employees?search=${encodeURIComponent(sampleEmp.fullName.substring(0, 4))}`);
  // Employee ID search
  const searchIdRes = await request(`/employees?search=${encodeURIComponent(sampleEmp.employeeId)}`);
  // Email search
  const searchEmailRes = await request(`/employees?search=${encodeURIComponent(sampleEmp.email)}`);
  // Special characters regex search (+, (, [)
  const searchRegexRes = await request(`/employees?search=${encodeURIComponent('+91 (0)')}`);
  // Empty result search
  const searchEmptyRes = await request('/employees?search=XYZ_NON_EXISTENT_NAME_12345');

  const searchPass = searchNameRes.status === 200 && searchIdRes.status === 200 &&
                     searchEmailRes.status === 200 && searchRegexRes.status === 200 &&
                     searchEmptyRes.status === 200 && searchEmptyRes.data.employees.length === 0 &&
                     searchIdRes.data.employees.some(e => e.employeeId === sampleEmp.employeeId);
  results.search = searchPass ? 'PASS' : 'FAIL';
  console.log('Search:', results.search);

  // 3. Filters
  console.log('\n--- 3. Testing Filters ---');
  const filterDeptRes = await request(`/employees?department=${encodeURIComponent(sampleEmp.department)}`);
  const filterStatusRes = await request('/employees?status=Active');
  const filterCombRes = await request(`/employees?department=${encodeURIComponent(sampleEmp.department)}&status=Active`);
  const filterSearchCombRes = await request(`/employees?search=${encodeURIComponent(sampleEmp.fullName.substring(0, 3))}&department=${encodeURIComponent(sampleEmp.department)}&status=Active`);

  const filterPass = filterDeptRes.status === 200 && filterDeptRes.data.employees.every(e => e.department === sampleEmp.department) &&
                     filterStatusRes.status === 200 && filterStatusRes.data.employees.every(e => e.status === 'Active') &&
                     filterCombRes.status === 200 && filterSearchCombRes.status === 200;
  results.filters = filterPass ? 'PASS' : 'FAIL';
  console.log('Filters:', results.filters);

  // 4. Sorting
  console.log('\n--- 4. Testing Sorting ---');
  const sortNameAsc = await request('/employees?sort=fullName:asc&limit=10');
  const sortNameDesc = await request('/employees?sort=fullName:desc&limit=10');
  const sortIdAsc = await request('/employees?sort=employeeId:asc&limit=10');
  const sortIdDesc = await request('/employees?sort=employeeId:desc&limit=10');
  const sortDateAsc = await request('/employees?sort=joiningDate:asc&limit=10');
  const sortDateDesc = await request('/employees?sort=joiningDate:desc&limit=10');
  const sortStatusAsc = await request('/employees?sort=status:asc&limit=10');
  const sortStatusDesc = await request('/employees?sort=status:desc&limit=10');

  const sortPass = sortNameAsc.status === 200 && sortNameDesc.status === 200 &&
                   sortIdAsc.status === 200 && sortIdDesc.status === 200 &&
                   sortDateAsc.status === 200 && sortDateDesc.status === 200 &&
                   sortStatusAsc.status === 200 && sortStatusDesc.status === 200;
  results.sorting = sortPass ? 'PASS' : 'FAIL';
  console.log('Sorting:', results.sorting);

  // 5. Pagination
  console.log('\n--- 5. Testing Pagination ---');
  const page1Res = await request('/employees?page=1&limit=2');
  const page2Res = await request('/employees?page=2&limit=2');
  const paginationPass = page1Res.status === 200 && page2Res.status === 200 &&
                         page1Res.data.currentPage === 1 && page2Res.data.currentPage === 2 &&
                         page1Res.data.limit === 2 && page1Res.data.totalEmployees > 0;
  results.pagination = paginationPass ? 'PASS' : 'FAIL';
  console.log('Pagination:', results.pagination);

  // 6. Form Validation & Add Employee
  console.log('\n--- 6. Testing Form Validation & Add Employee ---');
  // Missing required fields
  const invalidAddRes = await request('/employees', {
    method: 'POST',
    body: JSON.stringify({ fullName: 'Only Name' })
  });
  // Duplicate employee ID
  const dupIdRes = await request('/employees', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: sampleEmp.employeeId,
      fullName: 'Duplicate Tester',
      email: 'unique_dup_test@ems.com',
      phone: '+91 99999 88888',
      department: 'Development',
      designation: 'Tester',
      salary: 50000,
      status: 'Active'
    })
  });
  // Duplicate email
  const dupEmailRes = await request('/employees', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: 'EMP-UNIQUE-999',
      fullName: 'Duplicate Email Tester',
      email: sampleEmp.email,
      phone: '+91 99999 88888',
      department: 'Development',
      designation: 'Tester',
      salary: 50000,
      status: 'Active'
    })
  });

  const validationPass = invalidAddRes.status === 400 && dupIdRes.status === 409 && dupEmailRes.status === 409;
  results.formValidation = validationPass ? 'PASS' : 'FAIL';
  results.addEmployee = validationPass ? 'PASS' : 'FAIL';
  console.log('Form Validation:', results.formValidation);

  // 7. Create API & MongoDB Persistence
  console.log('\n--- 7. Testing Create API & Mongo Persistence ---');
  const testEmpData = {
    employeeId: `TEST-AUDIT-${Date.now()}`,
    fullName: 'Audit Test Employee',
    email: `audit.emp.${Date.now()}@ems.com`,
    phone: '+91 98765 43210',
    department: 'Development',
    designation: 'Quality Assurance Specialist',
    joiningDate: '2026-01-15',
    salary: 75000,
    status: 'Active'
  };

  const createRes = await request('/employees', {
    method: 'POST',
    body: JSON.stringify(testEmpData)
  });

  const createdId = createRes.data?.employee?._id;
  const dbEmp = createdId ? await Employee.findById(createdId) : null;
  const createPass = createRes.status === 201 && dbEmp !== null && dbEmp.email === testEmpData.email;
  results.createAPI = createPass ? 'PASS' : 'FAIL';
  console.log('Create API & Persistence:', results.createAPI);

  // 8. View Employee
  console.log('\n--- 8. Testing View Employee ---');
  const viewRes = await request(`/employees/${createdId}`);
  const viewPass = viewRes.status === 200 && viewRes.data.employee.employeeId === testEmpData.employeeId &&
                   viewRes.data.employee.salary === 75000; // Admin sees salary
  results.viewEmployee = viewPass ? 'PASS' : 'FAIL';
  console.log('View Employee:', results.viewEmployee);

  // 9. Edit Employee
  console.log('\n--- 9. Testing Edit Employee ---');
  const updateData = {
    fullName: 'Audit Test Employee Updated',
    designation: 'Lead Quality Specialist',
    salary: 82000,
    status: 'On Leave'
  };
  const updateRes = await request(`/employees/${createdId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  const updatedDbEmp = await Employee.findById(createdId);
  const editPass = updateRes.status === 200 && updatedDbEmp.fullName === updateData.fullName &&
                   updatedDbEmp.status === 'On Leave' && updatedDbEmp.salary === 82000;
  results.editEmployee = editPass ? 'PASS' : 'FAIL';
  console.log('Edit Employee:', results.editEmployee);

  // 10. Status Management
  console.log('\n--- 10. Testing Status Management ---');
  const statusTestRes = await request(`/employees/${createdId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Inactive' })
  });
  const dbStatusEmp = await Employee.findById(createdId);
  const statusPass = statusTestRes.status === 200 && dbStatusEmp.status === 'Inactive';
  results.statusManagement = statusPass ? 'PASS' : 'FAIL';
  console.log('Status Management:', results.statusManagement);

  // 11. Delete Safety & Delete Employee
  console.log('\n--- 11. Testing Delete Safety & Delete Employee ---');
  // First test safety: create a task assigned to this employee
  const testDept = await Department.findOne({ name: 'Development' });
  const testTask = await Task.create({
    title: 'Audit Verification Task',
    description: 'Verifying deletion protection',
    assignedTo: createdId,
    assignedBy: adminUser._id,
    department: testDept._id,
    priority: 'Medium',
    status: 'In Progress',
    startDate: new Date(),
    dueDate: new Date(Date.now() + 86400000)
  });

  // Attempt delete while active task exists -> must reject safely with 400
  const unsafeDeleteRes = await request(`/employees/${createdId}`, { method: 'DELETE' });
  const deleteSafetyBlocked = unsafeDeleteRes.status === 400 && unsafeDeleteRes.data.activeTasks > 0;

  // Complete/delete task and then delete employee
  await testTask.deleteOne();
  const safeDeleteRes = await request(`/employees/${createdId}`, { method: 'DELETE' });
  const deletedDbEmp = await Employee.findById(createdId);
  const deletePass = deleteSafetyBlocked && safeDeleteRes.status === 200 && deletedDbEmp === null;
  results.deleteEmployee = deletePass ? 'PASS' : 'FAIL';
  console.log('Delete Safety & Delete Employee:', results.deleteEmployee);

  // 12. Department Integration
  console.log('\n--- 12. Testing Department Integration ---');
  const deptsRes = await request('/departments');
  const deptsPass = deptsRes.status === 200 && Array.isArray(deptsRes.data.departments) &&
                    deptsRes.data.departments.every(d => typeof d.employeeCount === 'number');
  results.departmentIntegration = deptsPass ? 'PASS' : 'FAIL';
  console.log('Department Integration:', results.departmentIntegration);

  // 13. Authorization
  console.log('\n--- 13. Testing Role Authorization ---');
  // Manager trying to create employee -> 403
  const managerCreateRes = await request('/employees', {
    method: 'POST',
    body: JSON.stringify(testEmpData)
  }, managerToken);
  // Employee trying to get list -> 403
  const employeeListForbiddenRes = await request('/employees', {}, employeeToken);
  // Employee trying to delete -> 403
  const employeeDeleteRes = await request(`/employees/${sampleEmp._id}`, { method: 'DELETE' }, employeeToken);

  const authPass = managerCreateRes.status === 403 &&
                   employeeListForbiddenRes.status === 403 &&
                   employeeDeleteRes.status === 403;
  results.authorization = authPass ? 'PASS' : 'FAIL';
  console.log('Authorization:', results.authorization);

  // 14. IDOR / Security Test
  console.log('\n--- 14. Testing Security / IDOR ---');
  // Find employee doc for employeeUser
  const myEmpDoc = await Employee.findOne({ email: employeeUser.email.toLowerCase() });
  // Find other employee doc
  const otherEmpDoc = await Employee.findOne({ email: { $ne: employeeUser.email.toLowerCase() } });

  // Employee accessing their own record -> 200 (salary omitted)
  const myProfileRes = await request(`/employees/${myEmpDoc._id}`, {}, employeeToken);
  // Employee accessing another employee's record -> 403 Forbidden
  const idorRes = await request(`/employees/${otherEmpDoc._id}`, {}, employeeToken);
  // Manager accessing employee record -> 200 (salary omitted)
  const managerViewRes = await request(`/employees/${otherEmpDoc._id}`, {}, managerToken);

  const idorPass = myProfileRes.status === 200 && myProfileRes.data.employee.salary === undefined &&
                   idorRes.status === 403 &&
                   managerViewRes.status === 200 && managerViewRes.data.employee.salary === undefined;
  results.idorSecurity = idorPass ? 'PASS' : 'FAIL';
  console.log('IDOR / Security:', results.idorSecurity);

  // 15. Error Handling
  console.log('\n--- 15. Testing Error Handling ---');
  // Invalid Mongo ID
  const invalidIdRes = await request('/employees/12345_invalid_id');
  // Nonexistent Mongo ID
  const nonExistentId = new mongoose.Types.ObjectId();
  const notFoundRes = await request(`/employees/${nonExistentId}`);
  // Unauthenticated request
  const unauthRes = await request('/employees', {}, null);

  const errorHandlingPass = invalidIdRes.status === 400 &&
                            notFoundRes.status === 404 &&
                            unauthRes.status === 401;
  results.errorHandling = errorHandlingPass ? 'PASS' : 'FAIL';
  console.log('Error Handling:', results.errorHandling);

  // 16. End-to-End Flow Check
  console.log('\n--- 16. End-to-End Flow Check ---');
  const e2ePass = Object.values(results).every(v => v === 'PASS');
  results.endToEndFlow = e2ePass ? 'PASS' : 'FAIL';
  console.log('End-to-End Flow:', results.endToEndFlow);

  console.log('\n====================================================');
  console.log('TEST SUMMARY RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');

  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
