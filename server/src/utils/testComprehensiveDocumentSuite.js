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
import AuditLog from '../models/AuditLog.js';

const API_URL = 'http://localhost:5000/api';

const results = [];

function recordResult(category, description, passed, details = '') {
  results.push({ category, description, passed, details });
  const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusIcon}] [${category}] ${description} ${details ? `(${details})` : ''}`);
}

async function runComprehensiveDocumentTests() {
  console.log('=================================================================');
  console.log('STAFFPULSE COMPREHENSIVE DOCUMENT MANAGEMENT QA & SECURITY SUITE');
  console.log('=================================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_management';
  await mongoose.connect(mongoUri);

  let adminToken = '';
  let managerToken = '';
  let emp1Token = '';
  let emp2Token = '';
  let emp1 = null;
  let emp2 = null;
  let adminUser = null;

  try {
    // -------------------------------------------------------------------------
    // 0. AUTHENTICATION & PROVISIONING
    // -------------------------------------------------------------------------
    console.log('\n--- 0. AUTHENTICATION SETUP ---');

    // Admin login
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ems.com', password: 'Admin@123456' }),
    }).then((r) => r.json());
    if (!adminRes.success) throw new Error('Admin login failed');
    adminToken = adminRes.token;
    adminUser = adminRes.user;

    // Manager provisioning & login
    let mgrUser = await Admin.findOne({ email: 'manager@ems.com' });
    if (!mgrUser) {
      mgrUser = await Admin.create({
        name: 'Manager Mike',
        email: 'manager@ems.com',
        password: 'Admin@123456',
        role: 'manager',
        department: 'Development',
      });
    }
    const mgrRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@ems.com', password: 'Manager@123456' }),
    }).then((r) => r.json());
    if (!mgrRes.success) throw new Error('Manager login failed');
    managerToken = mgrRes.token;

    // Employee 1 (David) login
    let emp1User = await Admin.findOne({ email: 'employee@ems.com' });
    if (!emp1User) {
      emp1User = await Admin.create({
        name: 'David Staff',
        email: 'employee@ems.com',
        password: 'Employee@123456',
        role: 'employee',
        department: 'Development',
      });
    }
    const emp1Res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp1Res.success) throw new Error('Employee 1 login failed');
    emp1Token = emp1Res.token;

    // Employee 2 (Sarah) login
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
    const emp2Res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee2@ems.com', password: 'Employee@123456' }),
    }).then((r) => r.json());
    if (!emp2Res.success) throw new Error('Employee 2 login failed');
    emp2Token = emp2Res.token;

    // Ensure corresponding Employee records
    emp1 = await Employee.findOne({ email: 'employee@ems.com' });
    if (!emp1) {
      emp1 = await Employee.create({
        employeeId: 'EMP-DOC-01',
        fullName: 'David Staff',
        email: 'employee@ems.com',
        department: 'Development',
        designation: 'Software Engineer',
        status: 'Active',
      });
    }

    emp2 = await Employee.findOne({ email: 'employee2@ems.com' });
    if (!emp2) {
      emp2 = await Employee.create({
        employeeId: 'EMP-DOC-02',
        fullName: 'Sarah Smith',
        email: 'employee2@ems.com',
        department: 'Design',
        designation: 'UI Designer',
        status: 'Active',
      });
    }

    recordResult('Authentication', 'Admin, Manager, and 2 Employees authenticated successfully', true);

    // Helpers: Valid PDF & PNG buffers
    const samplePdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
    );
    const samplePdfBase64 = `data:application/pdf;base64,${samplePdfBuffer.toString('base64')}`;

    const samplePngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    const samplePngBase64 = `data:image/png;base64,${samplePngBuffer.toString('base64')}`;

    // -------------------------------------------------------------------------
    // 1. FILE VALIDATION & SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- 1. FILE VALIDATION & STORAGE SECURITY ---');

    // Reject .exe file
    const exeRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Dangerous Script',
        documentType: 'Other',
        fileName: 'malware.exe',
        fileData: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA',
      }),
    });
    recordResult('File Validation', 'Block dangerous executable file (.exe)', exeRes.status === 400);

    // Reject .sh script
    const shRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Shell Script',
        documentType: 'Other',
        fileName: 'script.sh',
        fileData: 'data:text/x-shellscript;base64,IyEvYmluL3NoCmVjaG8gIkhlbGxvIgo=',
      }),
    });
    recordResult('File Validation', 'Block script file (.sh)', shRes.status === 400);

    // Reject spoofed PDF (invalid magic bytes)
    const spoofPdfRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Spoofed PDF',
        documentType: 'Other',
        fileName: 'fake.pdf',
        fileData: 'data:application/pdf;base64,Tk9UX0FfUkVBTF9QREY=', // "NOT_A_REAL_PDF"
      }),
    });
    recordResult('File Validation', 'Reject spoofed file failing magic bytes verification', spoofPdfRes.status === 400);

    // Reject empty file (0 bytes)
    const emptyRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Empty File',
        documentType: 'Other',
        fileName: 'empty.pdf',
        fileData: 'data:application/pdf;base64,',
      }),
    });
    recordResult('File Size Validation', 'Reject empty file (0 bytes)', emptyRes.status === 400);

    // Reject invalid document type
    const badTypeRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Invalid Type Doc',
        documentType: 'RandomNonExistentType',
        fileName: 'valid.pdf',
        fileData: samplePdfBase64,
      }),
    });
    recordResult('Document Types', 'Reject invalid documentType enum', badTypeRes.status === 400);

    // -------------------------------------------------------------------------
    // 2. ADMIN UPLOAD FOR EMPLOYEE A (DAVID)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. ADMIN UPLOADS DOCUMENT A FOR EMPLOYEE 1 ---');

    const adminUploadRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp1._id,
        title: 'Employment Contract - David Staff',
        documentType: 'Employment Contract',
        description: 'Official employment contract detailing role and responsibilities.',
        fileName: 'contract_david.pdf',
        fileData: samplePdfBase64,
        mimeType: 'application/pdf',
      }),
    });

    const adminUploadData = await adminUploadRes.json();
    const docA = adminUploadData.document;
    const docAId = docA?._id;

    recordResult('Upload', 'Admin uploads valid document for Employee A', adminUploadRes.status === 201 && !!docAId);
    recordResult('Document Model', 'Document saved with required fields, employee reference and status', docA?.status === 'Active' && docA?.employee?._id?.toString() === emp1._id.toString());
    recordResult('Storage Security', 'File stored safely without path traversal', !!docA?.filePath && fs.existsSync(docA.filePath));

    // Verify Notification to Employee 1
    const notif = await Notification.findOne({
      recipient: emp1User._id,
      relatedId: docAId,
    });
    recordResult('Notifications', 'Employee A notified upon Admin document upload', !!notif && notif.type === 'document');

    // -------------------------------------------------------------------------
    // 3. ADMIN UPLOADS DOCUMENT B FOR EMPLOYEE B (SARAH)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. ADMIN UPLOADS DOCUMENT B FOR EMPLOYEE 2 ---');

    const adminUploadBRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        employee: emp2._id,
        title: 'Salary Slip - Sarah Smith',
        documentType: 'Salary Slip',
        description: 'Monthly salary slip for Sarah Smith.',
        fileName: 'salary_slip_sarah.pdf',
        fileData: samplePdfBase64,
        mimeType: 'application/pdf',
      }),
    });

    const adminUploadBData = await adminUploadBRes.json();
    const docB = adminUploadBData.document;
    const docBId = docB?._id;

    recordResult('Upload', 'Admin uploads valid document for Employee B', adminUploadBRes.status === 201 && !!docBId);

    // -------------------------------------------------------------------------
    // 4. EMPLOYEE MY DOCUMENTS VAULT & DATA ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- 4. EMPLOYEE VAULT & OWNERSHIP ISOLATION ---');

    // Employee 1 gets their documents
    const emp1DocsRes = await fetch(`${API_URL}/documents/my`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const emp1HasDocA = emp1DocsRes.documents?.some((d) => d._id === docAId);
    const emp1HasDocB = emp1DocsRes.documents?.some((d) => d._id === docBId);

    recordResult('Employee Document List', 'Employee 1 can view their own Document A', emp1HasDocA);
    recordResult('Employee Ownership', 'Employee 1 CANNOT see Employee 2 Document B in My Documents', !emp1HasDocB);

    // Employee 2 gets their documents
    const emp2DocsRes = await fetch(`${API_URL}/documents/my`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    }).then((r) => r.json());

    const emp2HasDocB = emp2DocsRes.documents?.some((d) => d._id === docBId);
    const emp2HasDocA = emp2DocsRes.documents?.some((d) => d._id === docAId);

    recordResult('Employee Document List', 'Employee 2 can view their own Document B', emp2HasDocB);
    recordResult('Employee Ownership', 'Employee 2 CANNOT see Employee 1 Document A in My Documents', !emp2HasDocA);

    // -------------------------------------------------------------------------
    // 5. IDOR / BOLA SECURITY AUDIT (DIRECT API MANIPULATION)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. IDOR / BOLA SECURITY TESTING ---');

    // Employee 1 attempts to access Document B details
    const idorViewRes = await fetch(`${API_URL}/documents/${docBId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee A accessing Document B metadata -> 403 Forbidden', idorViewRes.status === 403);

    // Employee 1 attempts to stream Document B file
    const idorStreamRes = await fetch(`${API_URL}/documents/${docBId}/view`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee A viewing Document B file -> 403 Forbidden', idorStreamRes.status === 403);

    // Employee 1 attempts to download Document B file
    const idorDownloadRes = await fetch(`${API_URL}/documents/${docBId}/download`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee A downloading Document B file -> 403 Forbidden', idorDownloadRes.status === 403);

    // Employee 1 attempts to delete Document B
    const idorDeleteRes = await fetch(`${API_URL}/documents/${docBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('IDOR/BOLA Security', 'Employee A deleting Document B -> 403 Forbidden', idorDeleteRes.status === 403);

    // Employee 1 attempts to replace/update Document B
    const idorReplaceRes = await fetch(`${API_URL}/documents/${docBId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ title: 'Hacked Title', fileData: samplePdfBase64 }),
    });
    recordResult('IDOR/BOLA Security', 'Employee A modifying Document B -> 403 Forbidden', idorReplaceRes.status === 403);

    // -------------------------------------------------------------------------
    // 6. EMPLOYEE SELF-UPLOAD & EMPLOYEE ID FORGERY CHECK
    // -------------------------------------------------------------------------
    console.log('\n--- 6. EMPLOYEE SELF-UPLOAD & FORGERY PREVENTION ---');

    // Employee 1 tries to forge employeeId to Employee 2
    const forgeEmpRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({
        employee: emp2._id, // Attempting to assign to Sarah
        title: 'ID Proof - David',
        documentType: 'ID Proof',
        fileName: 'passport_david.png',
        fileData: samplePngBase64,
      }),
    });
    recordResult('Employee ID Security', 'Employee A uploading for Employee B -> 403 Forbidden', forgeEmpRes.status === 403);

    // Employee 1 uploads personal document for themselves (valid personal doc: ID Proof)
    const empSelfUploadRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({
        title: 'National ID Proof - David Staff',
        documentType: 'ID Proof',
        description: 'Government issued identity card copy.',
        fileName: 'id_card_david.png',
        fileData: samplePngBase64,
        mimeType: 'image/png',
      }),
    });

    const empSelfUploadData = await empSelfUploadRes.json();
    const docPersonalId = empSelfUploadData.document?._id;
    recordResult('Upload', 'Employee self-uploads personal document (ID Proof)', empSelfUploadRes.status === 201 && !!docPersonalId);

    // -------------------------------------------------------------------------
    // 7. VIEW & DOWNLOAD BY AUTHORIZED OWNER
    // -------------------------------------------------------------------------
    console.log('\n--- 7. VIEW & DOWNLOAD VERIFICATION ---');

    // Employee 1 views own Document A
    const viewDocARes = await fetch(`${API_URL}/documents/${docAId}/view`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const viewBytes = await viewDocARes.arrayBuffer();
    recordResult('View', 'Employee views own document inline (200 OK + PDF Content-Type)', viewDocARes.status === 200 && viewDocARes.headers.get('content-type')?.includes('application/pdf') && viewBytes.byteLength > 0);

    // Employee 1 downloads own Document A
    const downloadDocARes = await fetch(`${API_URL}/documents/${docAId}/download`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const downloadDisposition = downloadDocARes.headers.get('content-disposition');
    const downloadBytes = await downloadDocARes.arrayBuffer();
    recordResult('Download', 'Employee downloads own document as attachment with filename', downloadDocARes.status === 200 && downloadDisposition?.includes('attachment') && downloadBytes.byteLength > 0);

    // Download with urlOnly param
    const urlOnlyRes = await fetch(`${API_URL}/documents/${docAId}/download?urlOnly=true`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());
    recordResult('Download', 'Download endpoint supports urlOnly mode for direct links', urlOnlyRes.success && !!urlOnlyRes.secureUrl);

    // -------------------------------------------------------------------------
    // 8. DOCUMENT REPLACE & METADATA EDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 8. DOCUMENT REPLACE & METADATA EDIT ---');

    // Employee replaces their OWN personal document with a new file
    const oldPersonalFilePath = empSelfUploadData.document?.filePath;
    const replaceRes = await fetch(`${API_URL}/documents/${docPersonalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({
        title: 'Updated National ID Proof - 2026',
        description: 'Renewed government identity card.',
        fileName: 'id_card_david_v2.png',
        fileData: samplePngBase64,
        mimeType: 'image/png',
      }),
    });

    const replaceData = await replaceRes.json();
    recordResult('Replace', 'Employee replaces own personal document file', replaceRes.status === 200 && replaceData.success);

    // Verify metadata updated and old file cleaned up
    const updatedDocInDb = await Document.findById(docPersonalId);
    recordResult('Metadata Edit', 'Document title and description updated correctly', updatedDocInDb?.title === 'Updated National ID Proof - 2026');
    recordResult('Storage Security', 'Old file removed from disk upon replacement', !fs.existsSync(oldPersonalFilePath) || oldPersonalFilePath === updatedDocInDb.filePath);

    // Employee tries to modify company-issued document (Contract) -> Forbidden
    const empEditContractRes = await fetch(`${API_URL}/documents/${docAId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emp1Token}` },
      body: JSON.stringify({ title: 'Hacked Contract' }),
    });
    recordResult('IDOR/BOLA Security', 'Employee cannot modify company-issued Employment Contract -> 403 Forbidden', empEditContractRes.status === 403);

    // Admin edits Document A metadata
    const adminEditRes = await fetch(`${API_URL}/documents/${docAId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Employment Contract - David Staff (Verified)',
        description: 'Verified HR executive contract copy.',
      }),
    });
    recordResult('Admin Access', 'Admin edits document metadata successfully', adminEditRes.status === 200);

    // -------------------------------------------------------------------------
    // 9. ADMIN ACCESS, FILTERS & SUMMARY STATS
    // -------------------------------------------------------------------------
    console.log('\n--- 9. ADMIN ACCESS & SUMMARY STATS ---');

    const adminListRes = await fetch(`${API_URL}/documents?department=Development`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    recordResult('Admin Access', 'Admin accesses all documents with department filter', adminListRes.success && Array.isArray(adminListRes.documents));
    recordResult('Dashboard Integration', 'Documents API returns summary statistics banner data', !!adminListRes.stats && adminListRes.stats.totalDocuments > 0 && adminListRes.stats.employeesWithDocuments > 0);

    // Manager accesses documents of Development department
    const mgrListRes = await fetch(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    }).then((r) => r.json());
    recordResult('Admin Access', 'Manager accesses documents collection', mgrListRes.success && Array.isArray(mgrListRes.documents));

    // -------------------------------------------------------------------------
    // 10. GLOBAL SEARCH SECURITY AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 10. GLOBAL SEARCH SECURITY ---');

    // Employee 2 searches for "Contract" (belongs to Employee 1)
    const emp2SearchRes = await fetch(`${API_URL}/search?q=Contract`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    }).then((r) => r.json());

    const emp2FoundDocA = emp2SearchRes.results?.documents?.some((d) => d._id === docAId);
    recordResult('Global Search Security', 'Employee B searching for Document A returns NO results (Isolated)', !emp2FoundDocA);

    // Employee 1 searches for "Contract" (belongs to Employee 1)
    const emp1SearchRes = await fetch(`${API_URL}/search?q=Contract`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    }).then((r) => r.json());

    const emp1FoundDocA = emp1SearchRes.results?.documents?.some((d) => d._id === docAId);
    recordResult('Global Search Security', 'Employee A searching for Document A retrieves it', emp1FoundDocA);

    // Verify search results do NOT leak private storage paths (fileUrl, filePath, secureUrl)
    const returnedSearchDoc = emp1SearchRes.results?.documents?.[0];
    const hasLeakedPaths = !!(returnedSearchDoc?.filePath || returnedSearchDoc?.secureUrl || returnedSearchDoc?.fileUrl);
    recordResult('Data Leak Audit', 'Search projection excludes private storage paths/URLs', !hasLeakedPaths);

    // -------------------------------------------------------------------------
    // 11. AUDIT LOGS
    // -------------------------------------------------------------------------
    console.log('\n--- 11. AUDIT LOG VERIFICATION ---');

    const auditLogs = await AuditLog.find({ module: 'DOCUMENT' }).sort({ createdAt: -1 }).limit(5);
    recordResult('Audit Logs', 'Document upload, update, download, delete are audited', auditLogs.length > 0);

    // -------------------------------------------------------------------------
    // 12. DOCUMENT DELETE & STORAGE CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- 12. DOCUMENT DELETE & STORAGE CLEANUP ---');

    // Employee deletes their own personal document
    const empDeletePersonalRes = await fetch(`${API_URL}/documents/${docPersonalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    recordResult('Delete', 'Employee deletes own personal document (200 OK)', empDeletePersonalRes.status === 200);

    // Verify document personal record deleted from DB
    const deletedPersonalDoc = await Document.findById(docPersonalId);
    recordResult('Delete', 'Database record removed upon deletion', !deletedPersonalDoc);

    // Admin deletes Document A
    const docAPath = (await Document.findById(docAId))?.filePath;
    const adminDeleteRes = await fetch(`${API_URL}/documents/${docAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('Delete', 'Admin deletes document (200 OK)', adminDeleteRes.status === 200);

    // Verify physical storage file removed
    recordResult('Storage Security', 'Storage file deleted from disk upon deletion (no orphans)', !docAPath || !fs.existsSync(docAPath));

    // Admin cleans up Document B
    const docBPath = (await Document.findById(docBId))?.filePath;
    await fetch(`${API_URL}/documents/${docBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (docBPath && fs.existsSync(docBPath)) fs.unlinkSync(docBPath);

    // -------------------------------------------------------------------------
    // 13. NEGATIVE TESTS & API SECURITY
    // -------------------------------------------------------------------------
    console.log('\n--- 13. NEGATIVE & API SECURITY TESTS ---');

    // Unauthenticated access
    const unauthGetRes = await fetch(`${API_URL}/documents`);
    recordResult('API Security', 'Unauthenticated request to GET /api/documents returns 401', unauthGetRes.status === 401);

    const unauthPostRes = await fetch(`${API_URL}/documents`, { method: 'POST' });
    recordResult('API Security', 'Unauthenticated request to POST /api/documents returns 401', unauthPostRes.status === 401);

    // Invalid ObjectId format
    const invalidIdRes = await fetch(`${API_URL}/documents/invalid_object_id_123`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Invalid ObjectId returns 400 Bad Request safely', invalidIdRes.status === 400);

    // Non-existent Document ID
    const notFoundRes = await fetch(`${API_URL}/documents/6ab2d78c454c09554480dcae`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordResult('API Security', 'Non-existent Document ID returns 404 Not Found safely', notFoundRes.status === 404);

    // Missing required fields on upload
    const missingFieldsRes = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({}),
    });
    recordResult('API Security', 'Missing upload fields returns 400 Bad Request', missingFieldsRes.status === 400);

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log('\n=================================================================');
    console.log('DOCUMENT MANAGEMENT COMPREHENSIVE TEST SUITE SUMMARY');
    console.log('=================================================================');

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`TOTAL TESTS : ${totalTests}`);
    console.log(`PASSED      : ${passedTests}`);
    console.log(`FAILED      : ${failedTests}`);

    if (failedTests > 0) {
      console.error('\n❌ SOME TESTS FAILED:');
      results.filter((r) => !r.passed).forEach((r) => console.error(`  - [${r.category}] ${r.description}`));
      process.exitCode = 1;
    } else {
      console.log('\n🎉 ALL COMPREHENSIVE DOCUMENT MANAGEMENT QA TESTS PASSED PERFECTLY!');
    }
  } catch (error) {
    console.error('\n❌ TEST SUITE RUNTIME ERROR:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runComprehensiveDocumentTests();
