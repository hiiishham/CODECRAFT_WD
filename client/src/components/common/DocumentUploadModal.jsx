import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import employeeService from '../../services/employeeService.js';

const ALL_TYPES = [
  'Offer Letter',
  'Employment Contract',
  'Salary Slip',
  'Experience Letter',
  'ID Proof',
  'Certificate',
  'Resume',
  'Other',
];

const EMPLOYEE_TYPES = [
  'ID Proof',
  'Certificate',
  'Resume',
  'Other',
];

const DocumentUploadModal = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId = null,
  title = 'Upload Document',
}) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';

  const [file, setFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [documentType, setDocumentType] = useState(isEmployee ? 'ID Proof' : 'Offer Letter');
  const [description, setDescription] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(employeeId || '');
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const inputRef = useRef(null);

  // Load employees if admin/manager and no employeeId provided
  useEffect(() => {
    if (isOpen && !isEmployee && !employeeId) {
      const loadEmployees = async () => {
        try {
          setLoadingEmployees(true);
          const res = await employeeService.getEmployees({ limit: 200 });
          if (res.success && res.employees) {
            setEmployees(res.employees);
            if (res.employees.length > 0 && !selectedEmployee) {
              setSelectedEmployee(res.employees[0]._id);
            }
          }
        } catch (e) {
          console.warn('Failed to load employees for upload modal:', e.message);
        } finally {
          setLoadingEmployees(false);
        }
      };
      loadEmployees();
    }
  }, [isOpen, isEmployee, employeeId, selectedEmployee]);

  if (!isOpen) return null;

  const validTypes = isEmployee ? EMPLOYEE_TYPES : ALL_TYPES;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }
    setFile(selectedFile);
    if (!docTitle) {
      setDocTitle(selectedFile.name.split('.')[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !docTitle || !documentType) {
      setError('Please fill in all required fields and select a file.');
      return;
    }

    if (!isEmployee && !employeeId && !selectedEmployee) {
      setError('Please select an employee.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', docTitle.trim());
      formData.append('documentType', documentType);
      if (description) formData.append('description', description.trim());

      const targetEmp = employeeId || selectedEmployee;
      if (targetEmp && !isEmployee) {
        formData.append('employee', targetEmp);
      }

      await api.post('/documents', formData);

      onSuccess();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDocTitle('');
    setDocumentType(isEmployee ? 'ID Proof' : 'Offer Letter');
    setDescription('');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-10 h-10 text-gray-400" />;
    if (file.type?.includes('image')) return <ImageIcon className="w-10 h-10 text-blue-500" />;
    if (file.type?.includes('pdf')) return <FileText className="w-10 h-10 text-red-500" />;
    return <File className="w-10 h-10 text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up" style={{ borderRadius: '1rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={resetForm}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-red-600 bg-red-50 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Employee Selector for Admin/Manager */}
          {!isEmployee && !employeeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              {loadingEmployees ? (
                <div className="text-xs text-gray-400 py-1">Loading employee directory...</div>
              ) : (
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500"
                  required
                >
                  <option value="">Select an employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId}) — {emp.department}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* File Upload Dropzone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-orange-500 bg-orange-50'
                : file
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              onChange={handleChange}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />

            <div className="flex flex-col items-center justify-center gap-2">
              {getFileIcon()}
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700 truncate max-w-[240px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to browse or drag & drop file
                  </p>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG, DOCX up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500"
                placeholder="e.g. Identity Proof / Experience Certificate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500"
              >
                {validTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-500 resize-none"
                placeholder="Add context or notes..."
              ></textarea>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
              style={{ background: 'var(--primary-600, #ea580c)' }}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
