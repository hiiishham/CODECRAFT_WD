// Automated Test Suite for StaffPulse Employee Document Management System (Step 21)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';

const API_URL = 'http://localhost:5000/api';

async function runDocumentTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE EMPLOYEE DOCUMENT MANAGEMENT SYSTEM TEST SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let employee1Token = '';
  let employee2Token = '';
  let employee1 = null;
  let employee2 = null;
  let createdDocumentId = null;
  let createdDocumentFilePath = null;

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ALL ROLES
    // -------------------------------------------------------------
    console.log('1. Authenticating Admin and 2 Employees...');

    const adminLogin = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminLogin.success) throw new Error('Admin login failed: ' + adminLogin.message);
    adminToken = adminLogin.token;

    const emp1Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp1Login.success) throw new Error('Employee 1 login failed: ' + emp1Login.message);
    employee1Token = emp1Login.token;

    // Ensure a second employee exists for cross-tenant security verification
    let emp2User = await Admin.findOne({ email: 'employee2@ems.com' });
    if (!emp2User) {
      emp2User = await Admin.create({
        name: 'Sarah Smith',
        email: 'employee2@ems.com',
        password: 'Employee@123456',
        role: 'employee',
        department: 'Design',
      });
    }

    const emp2Login = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp2Login.success) throw new Error('Employee 2 login failed: ' + emp2Login.message);
    employee2Token = emp2Login.token;

    // Resolve or provision corresponding Employee models
    employee1 = await Employee.findOne({ email: 'employee@ems.com' });
    if (!employee1) {
      employee1 = await Employee.create({
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

    employee2 = await Employee.findOne({ email: 'employee2@ems.com' });
    if (!employee2) {
      employee2 = await Employee.create({
        employeeId: 'EMP-102',
        fullName: 'Sarah Smith',
        email: 'employee2@ems.com',
        phone: '+91 98000 11224',
        department: 'Design',
        designation: 'UI/UX Designer',
        salary: 60000,
        status: 'Active',
      });
    }

    console.log('   ✅ Successfully authenticated Admin, Employee 1 (David), and Employee 2 (Sarah).\n');

    // -------------------------------------------------------------
    // 2. FILE VALIDATION CHECKS (BACKEND & SECURITY)
    // -------------------------------------------------------------
    console.log('2. Testing File Type & Security Validation...');

    // A. Reject executable file
    const exePayload = {
      employee: employee1._id,
      title: 'Malicious Document',
      documentType: 'Other',
      fileName: 'hack.exe',
      fileData: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA',
    };
    const exeRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(exePayload),
    }).then((r) => r.json());

    if (exeRes.statusCode === 400 || exeRes.success === false) {
      console.log('   ✅ Disallowed extension (.exe) rejected correctly with 400.');
    } else {
      throw new Error('Failed to block .exe file upload!');
    }

    // B. Reject fake PDF (disguised content that fails magic bytes)
    const fakePdfPayload = {
      employee: employee1._id,
      title: 'Fake PDF Test',
      documentType: 'Certificate',
      fileName: 'fake.pdf',
      fileData: 'data:application/pdf;base64,Tk9UQVBERg==', // "NOTAPDF" in base64
    };
    const fakePdfRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(fakePdfPayload),
    }).then((r) => r.json());

    if (fakePdfRes.statusCode === 400 || fakePdfRes.success === false) {
      console.log('   ✅ Spoofed file content rejected by magic byte verification.');
    } else {
      throw new Error('Failed to reject disguised file!');
    }

    // -------------------------------------------------------------
    // 3. ADMIN DOCUMENT UPLOAD (GENUINE PDF)
    // -------------------------------------------------------------
    console.log('\n3. Testing Admin Document Upload (Valid PDF)...');

    // Minimal valid PDF binary: "%PDF-1.4 ... %%EOF"
    const validPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
    );
    const validPdfBase64 = `data:application/pdf;base64,${validPdfBuffer.toString('base64')}`;

    const uploadPayload = {
      employee: employee1._id,
      title: 'StaffPulse Senior Software Engineer Offer Letter',
      documentType: 'Offer Letter',
      description: 'Official offer letter detailing joining terms and compensation.',
      fileName: 'offer_letter_david_staff.pdf',
      fileData: validPdfBase64,
      mimeType: 'application/pdf',
    };

    const uploadRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(uploadPayload),
    }).then((r) => r.json());

    if (!uploadRes.success || !uploadRes.document) {
      throw new Error('Document upload failed: ' + (uploadRes.message || 'Unknown error'));
    }

    createdDocumentId = uploadRes.document._id;
    console.log(`   ✅ Document created in MongoDB with ID: ${createdDocumentId}`);
    console.log(`   ✅ File stored in private path: ${uploadRes.document.filePath || 'Saved'}`);

    // Verify file exists on disk
    const docInDb = await Document.findById(createdDocumentId);
    createdDocumentFilePath = docInDb.filePath;
    if (fs.existsSync(createdDocumentFilePath)) {
      console.log('   ✅ Verified file exists on local storage disk.');
    } else {
      throw new Error('Uploaded file is missing from disk storage!');
    }

    // -------------------------------------------------------------
    // 4. NOTIFICATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n4. Verifying Employee Notification...');

    const empUser = await Admin.findOne({ email: 'employee@ems.com' });
    const notification = await Notification.findOne({
      recipient: empUser._id,
      type: 'document',
      relatedId: createdDocumentId,
    });

    if (notification && notification.title === 'New Document Available') {
      console.log(`   ✅ Notification verified: "${notification.title}" - "${notification.message}"`);
    } else {
      throw new Error('Employee notification was not created or has invalid fields!');
    }

    // -------------------------------------------------------------
    // 5. EMPLOYEE MY DOCUMENTS VAULT
    // -------------------------------------------------------------
    console.log('\n5. Testing Employee My Documents Vault...');

    const myDocsRes = await fetch(`${API_URL}/documents/my`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${employee1Token}` },
    }).then((r) => r.json());

    if (!myDocsRes.success || !Array.isArray(myDocsRes.documents)) {
      throw new Error('Failed to retrieve employee documents');
    }

    const foundDoc = myDocsRes.documents.find((d) => d._id === createdDocumentId);
    if (foundDoc) {
      console.log(`   ✅ Employee 1 retrieved own document: "${foundDoc.title}"`);
    } else {
      throw new Error('Employee 1 could not find uploaded document in personal vault!');
    }

    // -------------------------------------------------------------
    // 6. SECURITY & ACCESS CONTROL CHECKS
    // -------------------------------------------------------------
    console.log('\n6. Testing Security & Authorization Boundaries...');

    // A. Employee 2 trying to access Employee 1's document details
    const crossAccessRes = await fetch(`${API_URL}/documents/${createdDocumentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${employee2Token}` },
    });
    if (crossAccessRes.status === 403) {
      console.log('   ✅ Employee 2 access to Employee 1 document denied (403 Forbidden).');
    } else {
      throw new Error(`Cross-employee access violation! Status: ${crossAccessRes.status}`);
    }

    // B. Employee 2 trying to download Employee 1's document
    const crossDownloadRes = await fetch(`${API_URL}/documents/${createdDocumentId}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${employee2Token}` },
    });
    if (crossDownloadRes.status === 403) {
      console.log('   ✅ Employee 2 download of Employee 1 document denied (403 Forbidden).');
    } else {
      throw new Error(`Cross-employee download violation! Status: ${crossDownloadRes.status}`);
    }

    // C. Employee cannot upload document to another employee
    const empUploadRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employee1Token}`,
      },
      body: JSON.stringify(uploadPayload),
    });
    if (empUploadRes.status === 403) {
      console.log('   ✅ Employee upload attempt denied (403 Forbidden).');
    } else {
      throw new Error(`Employee upload not blocked! Status: ${empUploadRes.status}`);
    }

    // D. Employee cannot delete document
    const empDeleteRes = await fetch(`${API_URL}/documents/${createdDocumentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${employee1Token}` },
    });
    if (empDeleteRes.status === 403) {
      console.log('   ✅ Employee delete attempt denied (403 Forbidden).');
    } else {
      throw new Error(`Employee delete not blocked! Status: ${empDeleteRes.status}`);
    }

    // E. Unauthenticated request rejected
    const unauthRes = await fetch(`${API_URL}/documents`);
    if (unauthRes.status === 401) {
      console.log('   ✅ Unauthenticated request rejected (401 Unauthorized).');
    } else {
      throw new Error(`Unauthenticated request allowed! Status: ${unauthRes.status}`);
    }

    // -------------------------------------------------------------
    // 7. SECURE STREAMING & DOWNLOAD BY OWNER
    // -------------------------------------------------------------
    console.log('\n7. Testing Secure Streaming & Download by Owner...');

    const streamRes = await fetch(`${API_URL}/documents/${createdDocumentId}/view`, {
      headers: { Authorization: `Bearer ${employee1Token}` },
    });
    if (streamRes.status === 200 && streamRes.headers.get('content-type')?.includes('application/pdf')) {
      const streamBytes = await streamRes.arrayBuffer();
      console.log(`   ✅ Document stream successful (${streamBytes.byteLength} bytes received).`);
    } else {
      throw new Error('Failed to stream document to owner!');
    }

    const downloadRes = await fetch(`${API_URL}/documents/${createdDocumentId}/download`, {
      headers: { Authorization: `Bearer ${employee1Token}` },
    });
    if (
      downloadRes.status === 200 &&
      downloadRes.headers.get('content-disposition')?.includes('attachment')
    ) {
      console.log('   ✅ Document download successful with attachment header.');
    } else {
      throw new Error('Failed to download document with attachment header!');
    }

    // -------------------------------------------------------------
    // 8. ADMIN DELETE & DISK CLEANUP
    // -------------------------------------------------------------
    console.log('\n8. Testing Admin Deletion & Storage Cleanup...');

    const deleteRes = await fetch(`${API_URL}/documents/${createdDocumentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    if (!deleteRes.success) {
      throw new Error('Admin deletion failed: ' + deleteRes.message);
    }
    console.log('   ✅ Document record deleted from MongoDB.');

    // Verify storage file is removed from disk
    if (!fs.existsSync(createdDocumentFilePath)) {
      console.log('   ✅ Storage file removed from disk — no orphaned files left.');
    } else {
      throw new Error('Storage file was NOT removed from disk!');
    }

    console.log('\n=================================================================');
    console.log('✅ ALL STEP 21 EMPLOYEE DOCUMENT SYSTEM TESTS PASSED PERFECTLY!');
    console.log('=================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runDocumentTests();
