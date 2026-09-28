import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Download, Eye, File, 
  Image as ImageIcon, Loader2, UploadCloud, Trash2 
} from 'lucide-react';
import api from '../services/api.js';
import DocumentUploadModal from '../components/common/DocumentUploadModal.jsx';

const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const documentTypes = ['All', 'Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter', 'ID Proof', 'Certificate', 'Other'];

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'All') params.append('documentType', filterType);
      
      const response = await api.get(`/documents?${params.toString()}`);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line
  }, [filterType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const getFileIcon = (mimeType, fileType) => {
    const type = (mimeType || fileType || '').toLowerCase();
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc._id);
      const res = await api.get(`/documents/${doc._id}/download`);
      if (res.data?.secureUrl) {
        window.open(res.data.secureUrl, '_blank');
      }
    } catch (error) {
      console.error('Download failed', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc) => {
    try {
      window.open(`/api/documents/${doc._id}/view`, '_blank');
    } catch (error) {
      console.error('View failed', error);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      setDeletingId(docId);
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter(doc => doc._id !== docId));
    } catch (error) {
      console.error('Failed to delete document', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Organization Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and access all employee documents securely.</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          <UploadCloud className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents by title or employee name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </form>
        
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-w-[160px]"
          >
            {documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p>Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No documents found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {searchTerm || filterType !== 'All' 
              ? "We couldn't find any documents matching your current filters."
              : "There are no documents in the vault yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {documents.map((doc) => (
            <div key={doc._id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  {getFileIcon(doc.mimeType, doc.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-800 truncate" title={doc.title}>
                    {doc.title}
                  </h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                    {doc.documentType}
                  </span>
                </div>
              </div>

              {doc.employee && (
                 <div className="flex items-center gap-2 mb-3">
                   {doc.employee.profileImage ? (
                      <img src={doc.employee.profileImage} alt={doc.employee.fullName} className="w-6 h-6 rounded-full object-cover" />
                   ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {doc.employee.fullName.charAt(0)}
                      </div>
                   )}
                   <span className="text-sm text-gray-600 truncate">{doc.employee.fullName}</span>
                 </div>
              )}

              {doc.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                  {doc.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(doc)}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc._id}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Download Document"
                  >
                    {downloadingId === doc._id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    disabled={deletingId === doc._id}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Document"
                  >
                    {deletingId === doc._id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchDocuments();
          setIsUploadModalOpen(false);
        }}
        title="Upload Organization Document"
      />
    </div>
  );
};

export default AdminDocumentsPage;
