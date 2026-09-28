import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const run = async () => {
  const uri = 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(uri);
  const Admin = mongoose.connection.db.collection('admins');
  const Employee = mongoose.connection.db.collection('employees');
  const Department = mongoose.connection.db.collection('departments');

  const managersCount = await Admin.countDocuments({ role: 'manager' });
  const employeesCount = await Employee.countDocuments();
  const departmentsCount = await Department.countDocuments();
  const allAdmins = await Admin.find({}).toArray();
  const allEmps = await Employee.find({}).toArray();
  const allDepts = await Department.find({}).toArray();

  console.log('=== DATABASE VERIFICATION REPORT ===');
  console.log('Managers:', managersCount);
  console.log('Employees:', employeesCount);
  console.log('Departments:', departmentsCount);

  // Check duplicate emails
  const emails = allAdmins.map((a) => a.email);
  const dupEmails = emails.filter((item, index) => emails.indexOf(item) !== index);
  console.log('Duplicate Admin Emails:', dupEmails.length);

  const empEmails = allEmps.map((e) => e.email);
  const dupEmpEmails = empEmails.filter((item, index) => empEmails.indexOf(item) !== index);
  console.log('Duplicate Employee Emails:', dupEmpEmails.length);

  // Check duplicate usernames
  const usernames = allAdmins.map((a) => a.username).filter(Boolean);
  const dupUsernames = usernames.filter((item, index) => usernames.indexOf(item) !== index);
  console.log('Duplicate Usernames:', dupUsernames.length);

  // Check plaintext passwords
  const plaintextPasswords = allAdmins.filter((a) => !a.password || !a.password.startsWith('$2'));
  console.log('Plaintext passwords count:', plaintextPasswords.length);

  // Check manager references
  const mgrIds = (await Admin.find({ role: 'manager' }).toArray()).map((m) => m._id.toString());
  const invalidMgrRefs = allEmps.filter((e) => !e.manager || !mgrIds.includes(e.manager.toString()));
  console.log('Invalid Manager References:', invalidMgrRefs.length);

  console.log('\n--- Managers (Exact 2) ---');
  allAdmins
    .filter((a) => a.role === 'manager')
    .forEach((m) => console.log(` * ${m.name} | Username: ${m.username} | Email: ${m.email} | Dept: ${m.department}`));

  console.log('\n--- Employees (Exact 10) ---');
  allEmps.forEach((e) =>
    console.log(` * [${e.employeeId}] ${e.fullName} | Username: ${e.username} | Email: ${e.email} | Dept: ${e.department} | Manager: ${e.managerName}`)
  );

  console.log('\n--- Departments (Exact 6) ---');
  allDepts.forEach((d) => console.log(` * ${d.name}`));

  console.log('\n====================================');
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
