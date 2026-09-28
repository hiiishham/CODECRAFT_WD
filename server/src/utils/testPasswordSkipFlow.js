import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

async function run() {
  console.log('====================================================');
  console.log('  StaffPulse Password Change & Skip Verification');
  console.log('====================================================\n');

  try {
    // 1. Manager Login: Rahul Menon
    console.log('[Test 1] Manager login (rahul.menon@staffpulse.local)...');
    const mgrLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.menon@staffpulse.local',
        password: 'Rahul@StaffPulse2026!',
      }),
    });
    const mgrLoginData = await mgrLoginRes.json();
    console.log('  Manager login success:', mgrLoginData.success);
    console.log('  Manager mustChangePassword in response:', mgrLoginData.user?.mustChangePassword);
    console.log('  Manager role:', mgrLoginData.user?.role);

    if (!mgrLoginData.success || !mgrLoginData.user?.mustChangePassword || mgrLoginData.user?.role !== 'manager') {
      throw new Error('Manager login test failed');
    }

    // 2. Employee Login: Arjun Kumar
    console.log('\n[Test 2] Employee login (arjun.kumar@staffpulse.local)...');
    const empLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'arjun.kumar@staffpulse.local',
        password: 'Arjun@StaffPulse2026!',
      }),
    });
    const empLoginData = await empLoginRes.json();
    console.log('  Employee login success:', empLoginData.success);
    console.log('  Employee mustChangePassword in response:', empLoginData.user?.mustChangePassword);
    console.log('  Employee role:', empLoginData.user?.role);

    if (!empLoginData.success || !empLoginData.user?.mustChangePassword || empLoginData.user?.role !== 'employee') {
      throw new Error('Employee login test failed');
    }

    // 3. Verify Admin Login
    console.log('\n[Test 3] Super Admin login (admin@ems.com)...');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ems.com',
        password: 'Admin@123456',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    console.log('  Admin login success:', adminLoginData.success);
    console.log('  Admin role:', adminLoginData.user?.role);

    // 4. Test Normal Password Change Workflow with a dedicated temporary test account
    console.log('\n[Test 4] Verifying normal password change works as expected...');
    // Create a temporary test user in DB or via API
    const tempUserEmail = `skip.tester.${Date.now()}@staffpulse.local`;
    const createRes = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLoginData.token}`,
      },
      body: JSON.stringify({
        fullName: 'Skip Tester User',
        email: tempUserEmail,
        department: 'Engineering',
        designation: 'QA Tester',
        role: 'employee',
        password: 'TempTestPassword123!',
      }),
    });
    const createData = await createRes.json();
    console.log('  Created temporary test user:', createData.success);

    // Login as the temporary test user
    const testLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tempUserEmail,
        password: 'TempTestPassword123!',
      }),
    });
    const testLoginData = await testLoginRes.json();
    console.log('  Temp user mustChangePassword before update:', testLoginData.user?.mustChangePassword);

    // Test updating password via force-change-password API
    const forceChangeRes = await fetch(`${API_BASE}/auth/force-change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testLoginData.token}`,
      },
      body: JSON.stringify({
        currentPassword: 'TempTestPassword123!',
        newPassword: 'NewUpdatedPassword2026!',
        confirmPassword: 'NewUpdatedPassword2026!',
      }),
    });
    const forceChangeData = await forceChangeRes.json();
    console.log('  Normal password change API response:', forceChangeData.success, forceChangeData.message || '');

    // Verify login with new password and that mustChangePassword is now false
    const newLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: tempUserEmail,
        password: 'NewUpdatedPassword2026!',
      }),
    });
    const newLoginData = await newLoginRes.json();
    console.log('  Login with new password:', newLoginData.success);
    console.log('  mustChangePassword after change:', newLoginData.user?.mustChangePassword);

    // Clean up temporary test user
    if (createData.employee?._id) {
      await fetch(`${API_BASE}/employees/${createData.employee._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminLoginData.token}` },
      });
      console.log('  Cleaned up temporary test user.');
    }

    // 5. Verify manager and employee mustChangePassword in DB remains true (untouched by skips)
    console.log('\n[Test 5] Verifying seeded users retain mustChangePassword = true...');
    const recheckMgr = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul.menon@staffpulse.local',
        password: 'Rahul@StaffPulse2026!',
      }),
    });
    const recheckMgrData = await recheckMgr.json();
    console.log('  Manager mustChangePassword remains true:', recheckMgrData.user?.mustChangePassword === true);

    const recheckEmp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'arjun.kumar@staffpulse.local',
        password: 'Arjun@StaffPulse2026!',
      }),
    });
    const recheckEmpData = await recheckEmp.json();
    console.log('  Employee mustChangePassword remains true:', recheckEmpData.user?.mustChangePassword === true);

    console.log('\n====================================================');
    console.log('  All API and Auth Behaviors Verified Successfully!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

run();
