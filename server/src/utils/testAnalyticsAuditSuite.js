import mongoose from 'mongoose';
import connectDB from '../config/db.js';

const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=================================================================');
  console.log('STAFFPULSE ANALYTICS & AUDIT LOG TEST SUITE (STEP 25)');
  console.log('=================================================================\n');

  try {
    await connectDB();
    console.log('[Database] MongoDB Connected: ' + mongoose.connection.host);

    // 1. Login as Admin
    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Password@123' })
    }).then(r => r.json());

    if (!adminLogin.success) {
      const retryAdmin = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' })
      }).then(r => r.json());
      if (retryAdmin.success) adminLogin.token = retryAdmin.token;
      else throw new Error('Admin login failed');
    }
    const adminToken = adminLogin.token;
    console.log('   ✓ Admin authenticated successfully.');

    // 2. Login as Manager (for security testing)
    const managerLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Password@123' })
    }).then(r => r.json());
    
    if (!managerLogin.success) {
      // Try secondary password if first fails
      const retry = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' })
      }).then(r => r.json());
      if (retry.success) managerLogin.token = retry.token;
      else throw new Error('Manager login failed');
    }
    const managerToken = managerLogin.token;
    console.log('   ✓ Manager authenticated successfully.');

    // 3. Test Admin Super Dashboard
    console.log('\nTesting Analytics (Admin)...');
    const dbRes = await fetch(`${API_URL}/admin/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    
    if (dbRes.success) {
      console.log('   ✓ Super Dashboard stats retrieved');
    }

    // 4. Test Audit Logs (Admin)
    console.log('\nTesting Audit Logs API...');
    const auditRes = await fetch(`${API_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());

    if (!auditRes.success) throw new Error('Audit logs API failed');
    console.log(`   ✓ Audit logs fetched successfully (${auditRes.pagination.totalRecords} total records)`);

    // 5. Test Analytics Security (Manager shouldn't access Admin Analytics)
    console.log('\nTesting Analytics Security Enforcement...');
    const sec1 = await fetch(`${API_URL}/admin/analytics/workforce`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    }).then(r => r.json());

    if (sec1.success || !sec1.message?.includes('Access denied')) {
      throw new Error('SECURITY BREACH: Manager accessed Admin Analytics');
    }
    console.log('   ✓ Admin Analytics correctly blocked for Manager');

    // 6. Test Audit Security (Manager shouldn't access Audit Logs)
    const sec2 = await fetch(`${API_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    }).then(r => r.json());

    if (sec2.success || !sec2.message?.includes('Access denied')) {
      throw new Error('SECURITY BREACH: Manager accessed Audit Logs');
    }
    console.log('   ✓ Audit Logs correctly blocked for Manager');

    console.log('\n=================================================================');
    console.log('🎉 ALL STEP 25 ANALYTICS & AUDIT SECURITY TESTS PASSED!');
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
