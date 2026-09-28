import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';

const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=================================================================');
  console.log('STAFFPULSE MANAGER API TEST SUITE (STEP 24)');
  console.log('=================================================================\n');

  try {
    await connectDB();
    console.log('[Database] MongoDB Connected: ' + mongoose.connection.host);

    // 1. Ensure a manager exists
    let manager = await Admin.findOne({ email: 'manager@ems.com' });
    if (!manager) {
      manager = await Admin.create({
        name: 'Jane Manager',
        email: 'manager@ems.com',
        password: 'Password@123',
        role: 'manager',
        department: 'Development'
      });
      console.log('   ✓ Created test manager (manager@ems.com, Dept: Development)');
    }

    // 2. Login as Manager
    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Password@123' })
    }).then(r => r.json());

    if (!managerLogin.success) {
      // Try default admin login password
      const retryLogin = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' })
      }).then(r => r.json());
      
      if (!retryLogin.success) {
          throw new Error('Manager login failed');
      }
      managerLogin.token = retryLogin.token;
    }
    const token = managerLogin.token;
    console.log('   ✓ Manager authenticated successfully.');

    // 3. Test Dashboard Stats
    console.log('\nTesting Dashboard Stats...');
    const dashboardRes = await fetch(`${API_URL}/manager/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    if (!dashboardRes.success) throw new Error('Dashboard stats failed');
    console.log('   ✓ Dashboard stats retrieved:', dashboardRes.stats);

    // 4. Test Team List (Should only contain Development employees)
    console.log('\nTesting Team List Scope...');
    const teamRes = await fetch(`${API_URL}/manager/team`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json());
    if (!teamRes.success) throw new Error('Team list failed');
    
    let scopeViolation = false;
    for (const emp of teamRes.employees) {
      if (emp.department !== 'Development') scopeViolation = true;
    }
    if (scopeViolation) throw new Error('SECURITY BREACH: Manager returned employees from other departments');
    console.log(`   ✓ Team list scoped correctly to Development (${teamRes.count} members found)`);

    console.log('\nTesting Admin Route Protection...');
    const adminRes = await fetch(`${API_URL}/employees`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fullName: 'Hack Attempt', email: 'hack@ems.com' })
    }).then(r => r.json());
    console.log('Admin route response:', adminRes);
    if (adminRes.success || !adminRes.message?.includes('Access denied')) {
      throw new Error('SECURITY BREACH: Manager was able to access an admin-only route');
    }
    console.log('   ✓ Admin routes correctly blocked for Manager');

    console.log('\n=================================================================');
    console.log('🎉 ALL STEP 24 MANAGER API & SECURITY TESTS PASSED!');
    console.log('=================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

runTests();
