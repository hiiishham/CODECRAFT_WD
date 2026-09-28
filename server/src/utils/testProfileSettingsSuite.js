import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Admin from '../models/Admin.js';
import Settings from '../models/Settings.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runProfileSettingsTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PROFILE & SETTINGS TEST SUITE (STEP 12)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Connect to DB for direct checks if needed
    await connectDB();

    // 1. Admin Login
    console.log('\n--- 1. Authenticating Admin & Manager ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login returns 200');
    assert(!!adminLoginData.token, 'Admin login returns JWT token');
    assert('avatar' in adminLoginData.user, 'Admin user object contains avatar field');

    const adminToken = adminLoginData.token;

    // Manager Login
    const mgrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    });
    const mgrLoginData = await mgrLoginRes.json();
    assert(mgrLoginRes.status === 200, 'Manager login returns 200');
    const mgrToken = mgrLoginData.token;

    // 2. GET /api/auth/me
    console.log('\n--- 2. Testing GET /api/auth/me ---');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /auth/me returns 200');
    assert(meData.user.email === 'admin@ems.com', 'Me endpoint returns correct admin email');
    assert('avatar' in meData.user, 'Me endpoint user payload includes avatar');

    // 3. PUT /api/auth/profile
    console.log('\n--- 3. Testing PUT /api/auth/profile ---');
    // Positive profile update
    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Super Administrator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      }),
    });
    const updateProfileData = await updateProfileRes.json();
    assert(updateProfileRes.status === 200, 'Profile update returns 200');
    assert(updateProfileData.user.name === 'Super Administrator', 'Profile name updated correctly');
    assert(
      updateProfileData.user.avatar === 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      'Profile avatar updated correctly'
    );
    assert(updateProfileData.user.role === 'admin', 'Profile role remains admin');

    // Negative profile update: Name too short
    const shortNameRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'A' }),
    });
    assert(shortNameRes.status === 400, 'Profile update rejects name < 2 chars with 400');

    // 4. PUT /api/auth/change-password
    console.log('\n--- 4. Testing PUT /api/auth/change-password ---');
    // Wrong current password
    const wrongCurrentRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword999',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      }),
    });
    const wrongCurrentData = await wrongCurrentRes.json();
    assert(wrongCurrentRes.status === 400, 'Wrong current password rejected with 400');
    assert(
      wrongCurrentData.message.toLowerCase().includes('current password'),
      'Appropriate error message for incorrect current password'
    );

    // Mismatched new passwords
    const mismatchRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@123456',
        newPassword: 'NewPassword@123',
        confirmPassword: 'DifferentPassword@123',
      }),
    });
    assert(mismatchRes.status === 400, 'Mismatched new password rejected with 400');

    // New password too short
    const shortPasswordRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@123456',
        newPassword: '123',
        confirmPassword: '123',
      }),
    });
    assert(shortPasswordRes.status === 400, 'Short new password rejected with 400');

    // Same as current password
    const samePasswordRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@123456',
        newPassword: 'Admin@123456',
        confirmPassword: 'Admin@123456',
      }),
    });
    assert(samePasswordRes.status === 400, 'Identical new password rejected with 400');

    // Valid change to temporary password
    const validChangeRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@123456',
        newPassword: 'Admin@New654321',
        confirmPassword: 'Admin@New654321',
      }),
    });
    const validChangeData = await validChangeRes.json();
    assert(validChangeRes.status === 200, 'Valid password change returns 200');
    assert(validChangeData.success === true, 'Valid password change has success: true');

    // Verify OLD password fails login
    const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    assert(oldLoginRes.status === 401, 'Old password rejected on login with 401');

    // Verify NEW password succeeds login
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@New654321' }),
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200, 'New password succeeds on login with 200');
    assert(!!newLoginData.token, 'New password login issues fresh token');

    const freshAdminToken = newLoginData.token;

    // Restore original password back to Admin@123456 to keep test environment clean
    const restoreRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshAdminToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Admin@New654321',
        newPassword: 'Admin@123456',
        confirmPassword: 'Admin@123456',
      }),
    });
    assert(restoreRes.status === 200, 'Restoring original password returns 200');

    // Re-verify login with restored original password
    const restoredLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    });
    const restoredLoginData = await restoredLoginRes.json();
    assert(restoredLoginRes.status === 200, 'Login with restored password succeeds');
    const workingAdminToken = restoredLoginData.token;

    // 5. GET /api/settings
    console.log('\n--- 5. Testing GET /api/settings ---');
    const getSettingsRes = await fetch(`${BASE_URL}/settings`, {
      headers: { Authorization: `Bearer ${workingAdminToken}` },
    });
    const getSettingsData = await getSettingsRes.json();
    assert(getSettingsRes.status === 200, 'GET /api/settings returns 200');
    assert(!!getSettingsData.settings, 'GET /api/settings returns settings object');
    assert(getSettingsData.settings.companyName.length > 0, 'Company name is present');
    assert(getSettingsData.settings.currency === 'INR', 'Default currency is INR');

    // 6. PUT /api/settings RBAC & Updates
    console.log('\n--- 6. Testing PUT /api/settings & RBAC ---');
    // Non-admin (manager) attempt to modify settings
    const mgrSettingsRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgrToken}`,
      },
      body: JSON.stringify({ companyName: 'Hacked Inc.' }),
    });
    assert(mgrSettingsRes.status === 403, 'Manager modifying settings is rejected with 403 Forbidden');

    // Invalid currency validation
    const invalidCurrencyRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workingAdminToken}`,
      },
      body: JSON.stringify({ currency: 'BITCOIN' }),
    });
    assert(invalidCurrencyRes.status === 400, 'Invalid currency rejected with 400');

    // Valid admin settings update
    const validSettingsUpdateRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workingAdminToken}`,
      },
      body: JSON.stringify({
        companyName: 'StaffPulse Enterprise Solutions',
        companyEmail: 'operations@staffpulse.com',
        companyPhone: '+91 80 1234 5678',
        companyAddress: 'Prestige Tech Cloud, Phase 2, Whitefield, Bengaluru, India',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        theme: 'dark',
      }),
    });
    const validSettingsData = await validSettingsUpdateRes.json();
    assert(validSettingsUpdateRes.status === 200, 'Admin updating settings returns 200');
    assert(
      validSettingsData.settings.companyName === 'StaffPulse Enterprise Solutions',
      'Settings companyName updated correctly'
    );
    assert(
      validSettingsData.settings.companyEmail === 'operations@staffpulse.com',
      'Settings companyEmail updated correctly'
    );
    assert(validSettingsData.settings.theme === 'dark', 'Settings theme updated to dark');
    assert(
      validSettingsData.settings.updatedBy?.email === 'admin@ems.com',
      'Settings updatedBy populated with admin info'
    );

    // 7. Security: Verify password hash is never returned in any response
    console.log('\n--- 7. Verifying No Password Hash Leakage ---');
    const stringifiedMe = JSON.stringify(meData);
    const stringifiedProfile = JSON.stringify(updateProfileData);
    const stringifiedSettings = JSON.stringify(validSettingsData);

    assert(!stringifiedMe.includes('$2a$') && !stringifiedMe.includes('$2b$'), 'Me API does not leak bcrypt hash');
    assert(
      !stringifiedProfile.includes('$2a$') && !stringifiedProfile.includes('$2b$'),
      'Profile API does not leak bcrypt hash'
    );
    assert(
      !stringifiedSettings.includes('$2a$') && !stringifiedSettings.includes('$2b$'),
      'Settings API does not leak bcrypt hash'
    );

    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    process.exit(1);
  }
}

runProfileSettingsTests();
