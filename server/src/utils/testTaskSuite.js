// Automated Test Suite for StaffPulse Task Management & Security Controls
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Notification from '../models/Notification.js';
import Task from '../models/Task.js';

const API_URL = 'http://localhost:5000/api';

async function runTaskTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE TASK MANAGEMENT & ASSIGNMENT AUTOMATED TEST SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let managerToken = '';
  let employeeToken = '';
  let employee2Token = '';
  let createdTaskId = null;
  let testDept = null;
  let testEmployee = null;

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ALL ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin, Manager, and Employee...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success) throw new Error('Admin login failed');
    adminToken = adminLogin.token;

    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (!managerLogin.success) throw new Error('Manager login failed');
    managerToken = managerLogin.token;

    const empLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!empLogin.success) throw new Error('Employee login failed');
    employeeToken = empLogin.token;

    // Ensure a second employee user exists for isolation testing
    let emp2User = await Admin.findOne({ email: 'employee2@ems.com' });
    if (!emp2User) {
      emp2User = await Admin.create({
        name: 'Sarah Connor',
        email: 'employee2@ems.com',
        password: 'Employee@123456',
        role: 'employee',
      });
    }

    let emp2Doc = await Employee.findOne({ email: 'employee2@ems.com' });
    if (!emp2Doc) {
      const highestEmp = await Employee.findOne().sort({ employeeId: -1 });
      const nextNum = (parseInt(highestEmp?.employeeId?.replace('EMP-', '') || '200', 10) + 1);
      await Employee.create({
        employeeId: `EMP-${nextNum}`,
        fullName: 'Sarah Connor',
        email: 'employee2@ems.com',
        phone: '+91 98765 43299',
        department: 'Development',
        designation: 'QA Engineer',
        salary: 55000,
        status: 'Active',
      });
    }

    const emp2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp2Login.success) throw new Error('Employee 2 login failed');
    employee2Token = emp2Login.token;

    console.log('   ✓ Admin, Manager, and 2 Employees authenticated\n');

    // -------------------------------------------------------------
    // 2. RESOLVE PREREQUISITE DATA (Department & Employee)
    // -------------------------------------------------------------
    testDept = await Department.findOne({ status: 'Active' });
    if (!testDept) {
      testDept = await Department.create({
        name: 'Engineering & Technology',
        description: 'Core product engineering and architecture',
        status: 'Active',
      });
    }

    testEmployee = await Employee.findOne({ email: 'employee@ems.com' });
    if (!testEmployee) {
      testEmployee = await Employee.create({
        employeeId: 'EMP-100',
        fullName: 'David Staff',
        email: 'employee@ems.com',
        phone: '+91 98000 11223',
        department: 'Development',
        designation: 'Software Engineer',
        salary: 65000,
        status: 'Active',
      });
    }

    console.log(`   ✓ Target Department: ${testDept.name}`);
    console.log(`   ✓ Target Employee: ${testEmployee.fullName} (${testEmployee.employeeId})\n`);

    // -------------------------------------------------------------
    // 3. TASK VALIDATION TESTS (POST /api/tasks)
    // -------------------------------------------------------------
    console.log('3. Testing Task Creation Validations...');

    // Test A: Missing required title
    const invalidTitle = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: '',
        description: 'Sample description',
        assignedTo: testEmployee._id,
        department: testDept._id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 86400000),
      }),
    }).then((r) => r.json());
    if (invalidTitle.success || invalidTitle.statusCode !== 400) {
      throw new Error(`Expected 400 on empty title, got ${invalidTitle.statusCode}`);
    }
    console.log('   ✓ Rejected empty title with 400');

    // Test B: Due date before start date
    const invalidDates = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Invalid Date Task',
        description: 'Sample description',
        assignedTo: testEmployee._id,
        department: testDept._id,
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        dueDate: new Date(), // Today
      }),
    }).then((r) => r.json());
    if (invalidDates.success || invalidDates.statusCode !== 400) {
      throw new Error(`Expected 400 on due date < start date, got ${invalidDates.statusCode}`);
    }
    console.log('   ✓ Rejected dueDate < startDate with 400');

    // Test C: Valid task creation by Admin
    const validTaskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Implement Employee Task Management Feature',
        description: 'Build robust MongoDB Task schema, endpoints, and frontend progress tracking.',
        assignedTo: testEmployee._id,
        department: testDept._id,
        priority: 'High',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000),
        estimatedHours: 16,
      }),
    }).then((r) => r.json());

    if (!validTaskRes.success || !validTaskRes.task?._id) {
      throw new Error(`Task creation failed: ${JSON.stringify(validTaskRes)}`);
    }
    createdTaskId = validTaskRes.task._id;
    console.log(`   ✓ Task created successfully (ID: ${createdTaskId})`);
    console.log(`     Initial Status: ${validTaskRes.task.status}, Progress: ${validTaskRes.task.progress}%\n`);

    // -------------------------------------------------------------
    // 4. NOTIFICATION DISPATCH VERIFICATION
    // -------------------------------------------------------------
    console.log('4. Verifying Task Assignment Notification...');
    const notif = await Notification.findOne({
      relatedId: createdTaskId,
      type: 'task',
    });
    if (!notif) {
      throw new Error('Notification for task creation was not dispatched or saved in MongoDB');
    }
    console.log(`   ✓ Notification created: "${notif.title}" - ${notif.message}\n`);

    // -------------------------------------------------------------
    // 5. EMPLOYEE MY TASKS (GET /api/tasks/my)
    // -------------------------------------------------------------
    console.log('5. Testing Employee My Tasks Endpoint (GET /api/tasks/my)...');
    const myTasksRes = await fetch(`${API_URL}/tasks/my`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());

    if (!myTasksRes.success) throw new Error('Failed to fetch employee personal tasks');
    const foundTask = myTasksRes.tasks.find((t) => t._id.toString() === createdTaskId.toString());
    if (!foundTask) throw new Error('Created task not found in employee tasks list');
    console.log(`   ✓ Task listed for employee: "${foundTask.title}"`);
    console.log(`   ✓ Summary stats: Total ${myTasksRes.summary.total}, Assigned ${myTasksRes.summary.assigned}\n`);

    // -------------------------------------------------------------
    // 6. PROGRESS UPDATE & AUTOMATED STATUS TRANSITIONS (PUT /api/tasks/:id/progress)
    // -------------------------------------------------------------
    console.log('6. Testing Employee Progress Updates & State Transitions...');

    // A: Update to 25% -> status should become 'In Progress'
    const prog25 = await fetch(`${API_URL}/tasks/${createdTaskId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ progress: 25, employeeComment: 'Started development' }),
    }).then((r) => r.json());

    if (!prog25.success || prog25.task.status !== 'In Progress' || prog25.task.progress !== 25) {
      throw new Error(`Expected progress 25% and status 'In Progress', got ${JSON.stringify(prog25)}`);
    }
    console.log('   ✓ Progress 25% -> Status auto-transitioned to "In Progress"');

    // B: Update to 100% -> status should become 'Completed'
    const prog100 = await fetch(`${API_URL}/tasks/${createdTaskId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ progress: 100 }),
    }).then((r) => r.json());

    if (!prog100.success || prog100.task.status !== 'Completed' || prog100.task.progress !== 100) {
      throw new Error(`Expected progress 100% and status 'Completed', got ${JSON.stringify(prog100)}`);
    }
    console.log('   ✓ Progress 100% -> Status auto-transitioned to "Completed"');

    // C: Update to 0% -> status should revert to 'Assigned'
    const prog0 = await fetch(`${API_URL}/tasks/${createdTaskId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ progress: 0 }),
    }).then((r) => r.json());

    if (!prog0.success || prog0.task.status !== 'Assigned' || prog0.task.progress !== 0) {
      throw new Error(`Expected progress 0% and status 'Assigned', got ${JSON.stringify(prog0)}`);
    }
    console.log('   ✓ Progress 0% -> Status auto-transitioned to "Assigned"\n');

    // -------------------------------------------------------------
    // 7. SECURITY & ACCESS CONTROL ISOLATION TESTS
    // -------------------------------------------------------------
    console.log('7. Testing Security & Access Isolation Controls:');

    // Security A: Employee 2 cannot view Employee 1's task (403)
    const emp2Access = await fetch(`${API_URL}/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${employee2Token}` },
    }).then((r) => r.json());
    if (emp2Access.success || emp2Access.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee 2 accessing Employee 1's task, got ${emp2Access.statusCode}`);
    }
    console.log("   ✓ Employee 2 blocked from viewing Employee 1's task (403 Forbidden)");

    // Security B: Employee 2 cannot update progress on Employee 1's task (403)
    const emp2UpdateProg = await fetch(`${API_URL}/tasks/${createdTaskId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employee2Token}`,
      },
      body: JSON.stringify({ progress: 50 }),
    }).then((r) => r.json());
    if (emp2UpdateProg.success || emp2UpdateProg.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee 2 updating Employee 1's task, got ${emp2UpdateProg.statusCode}`);
    }
    console.log("   ✓ Employee 2 blocked from updating progress on Employee 1's task (403 Forbidden)");

    // Security C: Employee cannot delete task (403)
    const empDelete = await fetch(`${API_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employeeToken}` },
    }).then((r) => r.json());
    if (empDelete.success || empDelete.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee deleting task, got ${empDelete.statusCode}`);
    }
    console.log('   ✓ Employee blocked from deleting task (403 Forbidden)');

    // Security D: Employee cannot reassign task / change priority via PUT /api/tasks/:id (403)
    const empEditTask = await fetch(`${API_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ priority: 'Urgent', title: 'Hacked Title' }),
    }).then((r) => r.json());
    if (empEditTask.success || empEditTask.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee editing task fields, got ${empEditTask.statusCode}`);
    }
    console.log('   ✓ Employee blocked from editing admin task fields (403 Forbidden)');

    // Security E: Employee cannot create task via POST /api/tasks (403)
    const empCreate = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Task',
        description: 'Desc',
        assignedTo: testEmployee._id,
        department: testDept._id,
        startDate: new Date(),
        dueDate: new Date(),
      }),
    }).then((r) => r.json());
    if (empCreate.success || empCreate.statusCode !== 403) {
      throw new Error(`Expected 403 on Employee creating task, got ${empCreate.statusCode}`);
    }
    console.log('   ✓ Employee blocked from creating tasks (403 Forbidden)');

    // Security F: Progress validation (invalid progress > 100)
    const invalidProg = await fetch(`${API_URL}/tasks/${createdTaskId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ progress: 150 }),
    }).then((r) => r.json());
    if (invalidProg.success || invalidProg.statusCode !== 400) {
      throw new Error(`Expected 400 on progress > 100, got ${invalidProg.statusCode}`);
    }
    console.log('   ✓ Rejected progress > 100 with 400 Bad Request\n');

    // -------------------------------------------------------------
    // 8. ADMIN & MANAGER MANAGEMENT (GET /api/tasks, /stats, PUT, DELETE)
    // -------------------------------------------------------------
    console.log('8. Testing Admin & Manager Management Endpoints...');

    // Admin & Manager can fetch stats
    const statsRes = await fetch(`${API_URL}/tasks/stats`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    if (!statsRes.success || typeof statsRes.stats.total !== 'number') {
      throw new Error('Failed to fetch task stats');
    }
    console.log(`   ✓ Manager fetched task stats: Total=${statsRes.stats.total}, Assigned=${statsRes.stats.assigned}`);

    // Admin lists tasks with search
    const listRes = await fetch(`${API_URL}/tasks?search=Task+Management`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!listRes.success || listRes.tasks.length === 0) {
      throw new Error('Failed to search tasks');
    }
    console.log(`   ✓ Admin searched tasks: found ${listRes.tasks.length} matching task(s)`);

    // Admin updates task
    const updateRes = await fetch(`${API_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ priority: 'Urgent', estimatedHours: 20 }),
    }).then((r) => r.json());
    if (!updateRes.success || updateRes.task.priority !== 'Urgent') {
      throw new Error('Admin task update failed');
    }
    console.log('   ✓ Admin updated task priority to Urgent');

    // Admin deletes task
    const deleteRes = await fetch(`${API_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    if (!deleteRes.success) throw new Error('Admin task deletion failed');
    console.log('   ✓ Admin deleted task successfully\n');

    console.log('=================================================================');
    console.log('ALL TASK MANAGEMENT AUTOMATED TESTS PASSED (100% SUCCESS)');
    console.log('=================================================================');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTaskTests();
