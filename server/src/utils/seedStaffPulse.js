import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Task from '../models/Task.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Salary from '../models/Salary.js';
import Performance from '../models/Performance.js';
import Goal from '../models/Goal.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Announcement from '../models/Announcement.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Target 6 Real Departments
export const REAL_DEPARTMENTS = [
  {
    name: 'Engineering',
    description: 'Software engineering, architecture, cloud infrastructure, and technical quality.',
    status: 'Active',
  },
  {
    name: 'HR',
    description: 'Talent management, organizational development, employee relations, and compliance.',
    status: 'Active',
  },
  {
    name: 'Design',
    description: 'Product UI/UX design, visual systems, brand design, and interaction architecture.',
    status: 'Active',
  },
  {
    name: 'Sales',
    description: 'Enterprise accounts, client acquisitions, revenue growth, and strategic partnerships.',
    status: 'Active',
  },
  {
    name: 'Marketing',
    description: 'Product marketing, digital growth campaigns, branding, and customer engagement.',
    status: 'Active',
  },
  {
    name: 'Finance',
    description: 'Corporate financial planning, budgeting, audit compliance, and payroll accounting.',
    status: 'Active',
  },
];

// Target 2 Real Managers
export const REAL_MANAGERS = [
  {
    name: 'Rahul Menon',
    username: 'rahul.menon',
    email: 'rahul.menon@staffpulse.local',
    role: 'manager',
    department: 'Engineering',
    phone: '+91 98111 00001',
    temporaryPassword: 'Rahul@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    name: 'Anjali Nair',
    username: 'anjali.nair',
    email: 'anjali.nair@staffpulse.local',
    role: 'manager',
    department: 'HR',
    phone: '+91 98111 00002',
    temporaryPassword: 'Anjali@StaffPulse2026!',
    mustChangePassword: true,
  },
];

// Target 10 Real Employees
export const REAL_EMPLOYEES = [
  {
    employeeId: 'EMP-101',
    fullName: 'Arjun Kumar',
    username: 'arjun.kumar',
    email: 'arjun.kumar@staffpulse.local',
    department: 'Engineering',
    designation: 'Frontend Developer',
    managerUsername: 'rahul.menon',
    phone: '+91 98222 10101',
    salary: 75000,
    joiningDate: new Date('2024-01-10'),
    temporaryPassword: 'Arjun@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-102',
    fullName: 'Neha Thomas',
    username: 'neha.thomas',
    email: 'neha.thomas@staffpulse.local',
    department: 'Engineering',
    designation: 'Backend Developer',
    managerUsername: 'rahul.menon',
    phone: '+91 98222 10102',
    salary: 80000,
    joiningDate: new Date('2024-02-15'),
    temporaryPassword: 'Neha@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-103',
    fullName: 'Adithya Raj',
    username: 'adithya.raj',
    email: 'adithya.raj@staffpulse.local',
    department: 'Engineering',
    designation: 'Full Stack Developer',
    managerUsername: 'rahul.menon',
    phone: '+91 98222 10103',
    salary: 85000,
    joiningDate: new Date('2024-03-01'),
    temporaryPassword: 'Adithya@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-104',
    fullName: 'Fathima Salim',
    username: 'fathima.salim',
    email: 'fathima.salim@staffpulse.local',
    department: 'Design',
    designation: 'UI/UX Designer',
    managerUsername: 'rahul.menon',
    phone: '+91 98222 10104',
    salary: 70000,
    joiningDate: new Date('2024-03-20'),
    temporaryPassword: 'Fathima@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-105',
    fullName: 'Vishnu Prasad',
    username: 'vishnu.prasad',
    email: 'vishnu.prasad@staffpulse.local',
    department: 'Engineering',
    designation: 'QA Engineer',
    managerUsername: 'rahul.menon',
    phone: '+91 98222 10105',
    salary: 65000,
    joiningDate: new Date('2024-04-10'),
    temporaryPassword: 'Vishnu@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-106',
    fullName: 'Meera Joseph',
    username: 'meera.joseph',
    email: 'meera.joseph@staffpulse.local',
    department: 'HR',
    designation: 'HR Executive',
    managerUsername: 'anjali.nair',
    phone: '+91 98333 10106',
    salary: 60000,
    joiningDate: new Date('2024-01-15'),
    temporaryPassword: 'Meera@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-107',
    fullName: 'Nikhil Das',
    username: 'nikhil.das',
    email: 'nikhil.das@staffpulse.local',
    department: 'Sales',
    designation: 'Sales Executive',
    managerUsername: 'anjali.nair',
    phone: '+91 98333 10107',
    salary: 62000,
    joiningDate: new Date('2024-02-01'),
    temporaryPassword: 'Nikhil@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-108',
    fullName: 'Aiswarya Menon',
    username: 'aiswarya.menon',
    email: 'aiswarya.menon@staffpulse.local',
    department: 'Marketing',
    designation: 'Marketing Executive',
    managerUsername: 'anjali.nair',
    phone: '+91 98333 10108',
    salary: 64000,
    joiningDate: new Date('2024-03-05'),
    temporaryPassword: 'Aiswarya@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-109',
    fullName: 'Mohammed Riyas',
    username: 'mohammed.riyas',
    email: 'mohammed.riyas@staffpulse.local',
    department: 'Finance',
    designation: 'Finance Executive',
    managerUsername: 'anjali.nair',
    phone: '+91 98333 10109',
    salary: 68000,
    joiningDate: new Date('2024-03-15'),
    temporaryPassword: 'Riyas@StaffPulse2026!',
    mustChangePassword: true,
  },
  {
    employeeId: 'EMP-110',
    fullName: 'Sneha Krishnan',
    username: 'sneha.krishnan',
    email: 'sneha.krishnan@staffpulse.local',
    department: 'HR',
    designation: 'HR Coordinator',
    managerUsername: 'anjali.nair',
    phone: '+91 98333 10110',
    salary: 58000,
    joiningDate: new Date('2024-04-01'),
    temporaryPassword: 'Sneha@StaffPulse2026!',
    mustChangePassword: true,
  },
];

/**
 * Main Database Cleanup and Seeding Orchestrator
 */
export const seedStaffPulse = async () => {
  let createdCount = 0;
  let existingCount = 0;
  let skippedCount = 0;

  console.log('==================================================');
  console.log('  StaffPulse Database Cleanup & Real Seeding');
  console.log('==================================================');

  // 1. Ensure Super Admin is preserved and verified
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ems.com').toLowerCase().trim();
  let superAdmin = await Admin.findOne({ email: adminEmail });

  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', salt);
    superAdmin = await Admin.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      department: 'Executive',
      status: 'Active',
      mustChangePassword: false,
    });
    createdCount++;
    console.log(`[Seed] Super Admin created: ${superAdmin.email}`);
  } else {
    // Preserve existing Super Admin
    superAdmin.role = 'admin';
    superAdmin.status = 'Active';
    if (!superAdmin.username) superAdmin.username = 'admin';
    await superAdmin.save();
    existingCount++;
    console.log(`[Seed] Super Admin preserved: ${superAdmin.email}`);
  }

  // 2. Identify and safely remove ONLY demo/fake records
  const realManagerEmails = REAL_MANAGERS.map((m) => m.email.toLowerCase());
  const realEmployeeEmails = REAL_EMPLOYEES.map((e) => e.email.toLowerCase());
  const preserveEmails = [adminEmail, ...realManagerEmails, ...realEmployeeEmails];

  // Find demo users to delete
  const demoAdmins = await Admin.find({ email: { $nin: preserveEmails } }).select('_id email role').lean();
  const demoEmployees = await Employee.find({ email: { $nin: realEmployeeEmails } }).select('_id email').lean();

  const demoAdminIds = demoAdmins.map((a) => a._id);
  const demoEmployeeIds = demoEmployees.map((e) => e._id);

  if (demoAdminIds.length > 0 || demoEmployeeIds.length > 0) {
    console.log(`[Cleanup] Removing ${demoAdmins.length} demo admin/manager accounts and ${demoEmployees.length} demo employee profiles...`);

    // Remove demo admins & employees
    await Admin.deleteMany({ _id: { $in: demoAdminIds } });
    await Employee.deleteMany({ _id: { $in: demoEmployeeIds } });

    // Clean up dependent collections associated with demo employees
    await Promise.all([
      Attendance.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Leave.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Task.deleteMany({ assignedTo: { $in: demoEmployeeIds } }),
      Salary.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Performance.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Goal.deleteMany({ employee: { $in: demoEmployeeIds } }),
      WorkSubmission.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Document.deleteMany({ employee: { $in: demoEmployeeIds } }),
      Notification.deleteMany({ recipient: { $in: demoAdminIds } }),
    ]);

    console.log(`[Cleanup] Demo records successfully purged.`);
  }

  // 3. Departments: Ensure exactly the 6 real departments
  const validDeptNames = REAL_DEPARTMENTS.map((d) => d.name);

  // Remove any obsolete departments not in the real 6 list
  const obsoleteDepts = await Department.find({ name: { $nin: validDeptNames } }).select('_id name').lean();
  if (obsoleteDepts.length > 0) {
    console.log(`[Cleanup] Removing ${obsoleteDepts.length} obsolete departments: ${obsoleteDepts.map((d) => d.name).join(', ')}`);
    await Department.deleteMany({ _id: { $in: obsoleteDepts.map((d) => d._id) } });
  }

  const deptMap = {};
  for (const deptData of REAL_DEPARTMENTS) {
    let dept = await Department.findOne({ name: deptData.name });
    if (!dept) {
      dept = await Department.create(deptData);
      createdCount++;
      console.log(`[Seed] Created Department: ${dept.name}`);
    } else {
      dept.description = deptData.description;
      dept.status = 'Active';
      await dept.save();
      existingCount++;
    }
    deptMap[dept.name] = dept;
  }

  // 4. Managers: Seed exactly 2 real managers
  const managerMap = {};
  for (const mgrData of REAL_MANAGERS) {
    let manager = await Admin.findOne({ email: mgrData.email.toLowerCase() });

    if (!manager) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(mgrData.temporaryPassword, salt);

      manager = await Admin.create({
        name: mgrData.name,
        username: mgrData.username,
        email: mgrData.email.toLowerCase(),
        password: hashedPassword,
        role: mgrData.role,
        department: mgrData.department,
        phone: mgrData.phone,
        status: 'Active',
        mustChangePassword: mgrData.mustChangePassword,
      });
      createdCount++;
      console.log(`[Seed] Created Manager: ${manager.name} (${manager.email})`);
    } else {
      manager.name = mgrData.name;
      manager.username = mgrData.username;
      manager.role = 'manager';
      manager.department = mgrData.department;
      manager.status = 'Active';
      manager.mustChangePassword = mgrData.mustChangePassword;
      const salt = await bcrypt.genSalt(10);
      manager.password = await bcrypt.hash(mgrData.temporaryPassword, salt);
      await manager.save();
      existingCount++;
      console.log(`[Seed] Updated Manager: ${manager.name} (${manager.email})`);
    }

    managerMap[mgrData.username] = manager;
  }

  // 5. Employees: Seed exactly 10 real employees
  const employeeDocMap = {};
  for (const empData of REAL_EMPLOYEES) {
    const assignedManager = managerMap[empData.managerUsername];

    // Check or create Employee document
    let employee = await Employee.findOne({ email: empData.email.toLowerCase() });

    if (!employee) {
      employee = await Employee.create({
        employeeId: empData.employeeId,
        fullName: empData.fullName,
        username: empData.username,
        email: empData.email.toLowerCase(),
        department: empData.department,
        designation: empData.designation,
        manager: assignedManager ? assignedManager._id : null,
        managerName: assignedManager ? assignedManager.name : '',
        phone: empData.phone,
        salary: empData.salary,
        joiningDate: empData.joiningDate,
        status: 'Active',
      });
      createdCount++;
      console.log(`[Seed] Created Employee: ${employee.fullName} (${employee.employeeId})`);
    } else {
      employee.employeeId = empData.employeeId;
      employee.fullName = empData.fullName;
      employee.username = empData.username;
      employee.department = empData.department;
      employee.designation = empData.designation;
      employee.manager = assignedManager ? assignedManager._id : null;
      employee.managerName = assignedManager ? assignedManager.name : '';
      employee.phone = empData.phone;
      employee.salary = empData.salary;
      employee.status = 'Active';
      await employee.save();
      existingCount++;
    }

    employeeDocMap[empData.username] = employee;

    // Check or create linked Admin authentication account for this employee
    let empAccount = await Admin.findOne({ email: empData.email.toLowerCase() });
    if (!empAccount) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(empData.temporaryPassword, salt);

      empAccount = await Admin.create({
        name: empData.fullName,
        username: empData.username,
        email: empData.email.toLowerCase(),
        password: hashedPassword,
        role: 'employee',
        department: empData.department,
        phone: empData.phone,
        status: 'Active',
        mustChangePassword: empData.mustChangePassword,
      });
    } else {
      empAccount.name = empData.fullName;
      empAccount.username = empData.username;
      empAccount.role = 'employee';
      empAccount.department = empData.department;
      empAccount.status = 'Active';
      empAccount.mustChangePassword = empData.mustChangePassword;
      const salt = await bcrypt.genSalt(10);
      empAccount.password = await bcrypt.hash(empData.temporaryPassword, salt);
      await empAccount.save();
    }
  }

  // 6. Seed Realistic Operational Data for Dashboards
  const rahulMgr = managerMap['rahul.menon'];
  const anjaliMgr = managerMap['anjali.nair'];
  const arjun = employeeDocMap['arjun.kumar'];
  const neha = employeeDocMap['neha.thomas'];
  const adithya = employeeDocMap['adithya.raj'];
  const fathima = employeeDocMap['fathima.salim'];
  const vishnu = employeeDocMap['vishnu.prasad'];
  const meera = employeeDocMap['meera.joseph'];
  const nikhil = employeeDocMap['nikhil.das'];
  const aiswarya = employeeDocMap['aiswarya.menon'];
  const riyas = employeeDocMap['mohammed.riyas'];
  const sneha = employeeDocMap['sneha.krishnan'];

  // A. Today's Attendance
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const attendanceSeeds = [
    { employee: arjun._id, status: 'Present', checkIn: new Date(todayStart.getTime() + 9 * 3600 * 1000) },
    { employee: neha._id, status: 'Present', checkIn: new Date(todayStart.getTime() + 9.2 * 3600 * 1000) },
    { employee: adithya._id, status: 'Present', checkIn: new Date(todayStart.getTime() + 8.9 * 3600 * 1000) },
    { employee: meera._id, status: 'Present', checkIn: new Date(todayStart.getTime() + 9.1 * 3600 * 1000) },
    { employee: nikhil._id, status: 'Late', checkIn: new Date(todayStart.getTime() + 9.6 * 3600 * 1000) },
    { employee: riyas._id, status: 'Present', checkIn: new Date(todayStart.getTime() + 9.05 * 3600 * 1000) },
  ];

  for (const att of attendanceSeeds) {
    const existing = await Attendance.findOne({ employee: att.employee, date: todayStart });
    if (!existing) {
      await Attendance.create({
        employee: att.employee,
        date: todayStart,
        checkIn: att.checkIn,
        checkOut: null,
        totalHours: 0,
        status: att.status,
        notes: `Clocked in on-time via StaffPulse Portal`,
      });
    }
  }

  // B. Leave Records
  // Approved leave for today (Vishnu Prasad)
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const existingVishnuLeave = await Leave.findOne({ employee: vishnu._id });
  if (!existingVishnuLeave) {
    await Leave.create({
      employee: vishnu._id,
      leaveType: 'Sick Leave',
      startDate: todayStart,
      endDate: todayEnd,
      duration: 1,
      reason: 'Medical checkup and rest',
      status: 'Approved',
      reviewedBy: rahulMgr._id,
      reviewedAt: new Date(Date.now() - 24 * 3600 * 1000),
      reviewComment: 'Approved by Manager Rahul Menon',
    });
  }

  // Pending leave for upcoming dates (Aiswarya Menon)
  const futureStart = new Date(todayStart.getTime() + 5 * 24 * 3600 * 1000);
  const futureEnd = new Date(todayStart.getTime() + 7 * 24 * 3600 * 1000);
  const existingAiswaryaLeave = await Leave.findOne({ employee: aiswarya._id });
  if (!existingAiswaryaLeave) {
    await Leave.create({
      employee: aiswarya._id,
      leaveType: 'Annual Leave',
      startDate: futureStart,
      endDate: futureEnd,
      duration: 3,
      reason: 'Family event and vacation',
      status: 'Pending',
    });
  }

  // C. Tasks
  const taskSeeds = [
    {
      title: 'Implement Dark Mode Analytics Visualizations',
      description: 'Design and connect real database telemetry charts with dark-mode aesthetic styling.',
      assignedTo: arjun._id,
      assignedBy: rahulMgr._id,
      department: deptMap['Engineering']._id,
      priority: 'High',
      status: 'In Progress',
      progress: 55,
      startDate: new Date('2026-09-20'),
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
    },
    {
      title: 'MongoDB Query Pipeline Optimization',
      description: 'Audit aggregation pipelines across employee, attendance, and leave modules for sub-10ms latency.',
      assignedTo: neha._id,
      assignedBy: rahulMgr._id,
      department: deptMap['Engineering']._id,
      priority: 'Urgent',
      status: 'In Progress',
      progress: 40,
      startDate: new Date('2026-09-22'),
      dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
    },
    {
      title: 'Mobile Design Tokens & UI Kit Expansion',
      description: 'Deliver responsive mobile tokens and form input styles matching the StaffPulse design spec.',
      assignedTo: fathima._id,
      assignedBy: rahulMgr._id,
      department: deptMap['Design']._id,
      priority: 'Medium',
      status: 'Completed',
      progress: 100,
      startDate: new Date('2026-09-10'),
      dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    {
      title: 'Quarterly HR Performance & Goals Cycle',
      description: 'Prepare review templates and trigger annual self-assessments for all teams.',
      assignedTo: meera._id,
      assignedBy: anjaliMgr._id,
      department: deptMap['HR']._id,
      priority: 'High',
      status: 'In Progress',
      progress: 30,
      startDate: new Date('2026-09-24'),
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
    {
      title: 'Q4 Enterprise Client Outreach Strategy',
      description: 'Target 50 enterprise client prospects and schedule discovery sessions.',
      assignedTo: nikhil._id,
      assignedBy: anjaliMgr._id,
      department: deptMap['Sales']._id,
      priority: 'Medium',
      status: 'Assigned',
      progress: 10,
      startDate: new Date('2026-09-25'),
      dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
    },
    {
      title: 'Annual Statutory Audit & Payroll Reconciliation',
      description: 'Validate salary deductions, tax withholding statements, and ledger summaries.',
      assignedTo: riyas._id,
      assignedBy: anjaliMgr._id,
      department: deptMap['Finance']._id,
      priority: 'Urgent',
      status: 'In Progress',
      progress: 75,
      startDate: new Date('2026-09-15'),
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
    },
  ];

  let completedTaskDoc = null;
  let inProgressTaskDoc = null;
  for (const t of taskSeeds) {
    let task = await Task.findOne({ title: t.title });
    if (!task) {
      task = await Task.create(t);
    }
    if (t.status === 'Completed') completedTaskDoc = task;
    if (t.status === 'In Progress' && t.assignedTo.toString() === arjun._id.toString()) inProgressTaskDoc = task;
  }

  // D. Work Submissions
  if (completedTaskDoc) {
    const existingSub = await WorkSubmission.findOne({ task: completedTaskDoc._id });
    if (!existingSub) {
      await WorkSubmission.create({
        task: completedTaskDoc._id,
        employee: fathima._id,
        description: 'Completed responsive tokens and typography scale components for StaffPulse mobile layout.',
        githubUrl: 'https://github.com/staffpulse/design-system',
        liveUrl: 'https://preview.staffpulse.local/tokens',
        status: 'Approved',
        reviewedBy: rahulMgr._id,
        reviewedAt: new Date(),
        reviewComment: 'Outstanding execution and comprehensive token coverage.',
      });
    }
  }

  if (inProgressTaskDoc) {
    const existingSub2 = await WorkSubmission.findOne({ task: inProgressTaskDoc._id });
    if (!existingSub2) {
      await WorkSubmission.create({
        task: inProgressTaskDoc._id,
        employee: arjun._id,
        description: 'First version of the dark mode analytics graphs integrated with Recharts.',
        githubUrl: 'https://github.com/staffpulse/analytics-charts',
        status: 'Pending Review',
      });
    }
  }

  // E. Salaries for Current Month
  const now = new Date();
  const currentPayMonth = now.getMonth() + 1;
  const currentPayYear = now.getFullYear();

  for (const empData of REAL_EMPLOYEES) {
    const empDoc = employeeDocMap[empData.username];
    if (empDoc) {
      const existingSalary = await Salary.findOne({
        employee: empDoc._id,
        payMonth: currentPayMonth,
        payYear: currentPayYear,
      });

      if (!existingSalary) {
        const basicSalary = Math.round(empDoc.salary * 0.6);
        const allowances = [
          { name: 'HRA', amount: Math.round(empDoc.salary * 0.25) },
          { name: 'Special Allowance', amount: Math.round(empDoc.salary * 0.15) },
        ];
        const deductions = [
          { name: 'Provident Fund', amount: 1800 },
          { name: 'Professional Tax', amount: 200 },
        ];
        const totalAllowances = allowances.reduce((acc, curr) => acc + curr.amount, 0);
        const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0);
        const netSalary = basicSalary + totalAllowances - totalDeductions;

        await Salary.create({
          employee: empDoc._id,
          basicSalary,
          allowances,
          deductions,
          netSalary,
          payMonth: currentPayMonth,
          payYear: currentPayYear,
          paymentDate: new Date(),
          status: 'Processed',
          paymentMethod: 'Bank Transfer',
        });
      }
    }
  }

  // F. Goals
  const goalSeeds = [
    {
      employee: arjun._id,
      title: 'Build Reusable Frontend Design System Components',
      description: 'Develop accessible, tested design system components for internal portals.',
      assignedBy: rahulMgr._id,
      startDate: new Date('2026-09-01'),
      dueDate: new Date('2026-12-31'),
      progress: 65,
      status: 'In Progress',
      priority: 'High',
    },
    {
      employee: neha._id,
      title: 'API Performance & Latency SLA',
      description: 'Maintain sub-100ms API response time across 99.9% of production requests.',
      assignedBy: rahulMgr._id,
      startDate: new Date('2026-09-01'),
      dueDate: new Date('2026-12-31'),
      progress: 50,
      status: 'In Progress',
      priority: 'High',
    },
    {
      employee: meera._id,
      title: 'Employee Onboarding NPS Score > 90',
      description: 'Streamline the new joiner checklist and digital orientation process.',
      assignedBy: anjaliMgr._id,
      startDate: new Date('2026-09-01'),
      dueDate: new Date('2026-11-30'),
      progress: 80,
      status: 'In Progress',
      priority: 'Medium',
    },
  ];

  for (const g of goalSeeds) {
    const existingGoal = await Goal.findOne({ employee: g.employee, title: g.title });
    if (!existingGoal) {
      await Goal.create(g);
    }
  }

  // G. Performance Reviews
  const existingArjunPerf = await Performance.findOne({ employee: arjun._id });
  if (!existingArjunPerf) {
    await Performance.create({
      employee: arjun._id,
      reviewedBy: rahulMgr._id,
      reviewPeriod: '2026-Q1',
      overallRating: 5,
      strengths: 'Frontend architecture, React component design, and attention to user experience.',
      areasForImprovement: 'Continuous integration automated testing coverage.',
      managerFeedback: 'Consistently delivers top-tier frontend code with excellent code review practices.',
      status: 'Reviewed',
    });
  }

  // H. Announcements
  const announcementSeeds = [
    {
      title: 'Welcome to StaffPulse HR Management System',
      content: 'We are pleased to introduce StaffPulse, our unified platform for attendance, leaves, project deliverables, and team collaboration.',
      audience: 'All',
      priority: 'Important',
      status: 'Published',
      publishDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      publishedBy: superAdmin._id,
    },
    {
      title: 'Engineering Technical Sync — Every Thursday',
      content: 'The engineering team holds its bi-weekly technical architecture and code health sync on Thursdays at 3:00 PM IST.',
      audience: 'Department',
      department: deptMap['Engineering']._id,
      priority: 'Normal',
      status: 'Published',
      publishDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      publishedBy: rahulMgr._id,
    },
    {
      title: 'Annual Benefits & Medical Insurance Renewal Notice',
      content: 'The open enrollment period for corporate medical coverage updates will commence next Monday.',
      audience: 'Department',
      department: deptMap['HR']._id,
      priority: 'Normal',
      status: 'Published',
      publishDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      publishedBy: anjaliMgr._id,
    },
  ];

  for (const ann of announcementSeeds) {
    const existingAnn = await Announcement.findOne({ title: ann.title });
    if (!existingAnn) {
      await Announcement.create(ann);
    }
  }

  // I. Audit Log Entry
  await AuditLog.create({
    user: superAdmin._id,
    userRole: 'admin',
    action: 'CREATE',
    module: 'AUTH',
    description: 'StaffPulse initialization & verification completed successfully',
  });

  // 7. Verify Database State
  const finalManagersCount = await Admin.countDocuments({ role: 'manager' });
  const finalEmployeesCount = await Employee.countDocuments();
  const finalDepartmentsCount = await Department.countDocuments();

  console.log('==================================================');
  console.log('  StaffPulse Seed Complete');
  console.log('==================================================');
  console.log(`  Super Admin: preserved (${superAdmin.email})`);
  console.log(`  Managers: ${finalManagersCount}`);
  console.log(`  Employees: ${finalEmployeesCount}`);
  console.log(`  Departments: ${finalDepartmentsCount}`);
  console.log('==================================================');
  console.log(`  Created: ${createdCount} | Existing: ${existingCount} | Purged: ${demoAdmins.length + demoEmployees.length}`);
  console.log('==================================================');

  return {
    superAdmin: superAdmin.email,
    managers: finalManagersCount,
    employees: finalEmployeesCount,
    departments: finalDepartmentsCount,
    created: createdCount,
    existing: existingCount,
  };
};

// Standalone CLI runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/employee_management';

  const run = async () => {
    try {
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
      console.log(`[Seed CLI] Connected to MongoDB at ${primaryUri}`);
    } catch (primaryError) {
      if (primaryUri !== localFallbackUri) {
        console.warn(`[Seed CLI] Primary connection failed: ${primaryError.message}. Connecting to local fallback...`);
        await mongoose.connect(localFallbackUri);
        console.log(`[Seed CLI] Connected to local fallback: ${localFallbackUri}`);
      } else {
        throw primaryError;
      }
    }

    await seedStaffPulse();
    console.log('[Seed CLI] Seeding completed.');
    process.exit(0);
  };

  run().catch((err) => {
    console.error('[Seed CLI Error]:', err.message);
    process.exit(1);
  });
}

export default seedStaffPulse;
