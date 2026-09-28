import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  MessageSquare, 
  Shield, 
  Keyboard, 
  ExternalLink, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Mail, 
  PhoneCall, 
  FileText 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardPath } from '../utils/roleRoutes.js';
import { Link } from 'react-router-dom';

const HelpCenterPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const faqs = [
    {
      id: 1,
      category: 'attendance',
      question: 'How do I clock in or record my daily attendance?',
      answer: 'Navigate to Attendance from the sidebar. If attendance is not marked today, click the "Clock In" button. Your time and status will be recorded instantly.'
    },
    {
      id: 2,
      category: 'leaves',
      question: 'How do I apply for annual or sick leave?',
      answer: 'Go to My Leave (or Leave Management for managers) and click "Request Leave". Select your leave type, start and end dates, and provide a reason. Your manager will be notified for review.'
    },
    {
      id: 3,
      category: 'tasks',
      question: 'How do I submit deliverables for assigned tasks?',
      answer: 'Click on My Tasks, select the task you completed, and click "Submit Work". Attach your repository link, live preview URL, and any notes, then submit for review.'
    },
    {
      id: 4,
      category: 'security',
      question: 'How can I change my password or profile info?',
      answer: 'Visit Profile from the top-right user menu or sidebar. Click "Edit Profile" or navigate to Settings to update personal info, credentials, and notification preferences.'
    },
    {
      id: 5,
      category: 'navigation',
      question: 'Is there a keyboard shortcut for quick navigation?',
      answer: 'Press Ctrl+K (or Cmd+K on Mac) anywhere in the application to open the StaffPulse Command Center to search and navigate instantly.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeTab === 'all' || faq.category === activeTab;
    const matchesQuery = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const dashboardPath = getDashboardPath(user?.role);

  return (
    <div className="help-center-container" style={{ paddingBottom: '3rem' }}>
      {/* Hero Header */}
      <div 
        style={{
          background: 'linear-gradient(135deg, var(--primary-600) 0%, #1e293b 100%)',
          borderRadius: '1rem',
          padding: '2.5rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '650px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.15)', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
            <HelpCircle size={16} />
            <span>StaffPulse Support & Documentation</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.75rem', lineHeight: 1.2 }}>
            How can we help you today?
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
            Explore guides, frequently asked questions, shortcut keys, and support resources for StaffPulse HR.
          </p>

          <div style={{ position: 'relative', maxWidth: '540px' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} 
            />
            <input
              type="text"
              placeholder="Search topics, questions, shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontSize: '0.9rem',
                outline: 'none',
                color: 'var(--slate-800)',
                background: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1.25rem', 
          marginBottom: '2rem' 
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Keyboard size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--slate-800)' }}>Quick Shortcuts</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--slate-500)', margin: 0 }}>
              Use <kbd style={{ background: 'var(--slate-100)', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid var(--slate-300)' }}>Ctrl</kbd> + <kbd style={{ background: 'var(--slate-100)', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid var(--slate-300)' }}>K</kbd> to search anywhere.
            </p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--slate-800)' }}>HR & Admin Helpdesk</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--slate-500)', margin: 0 }}>
              Email us at <a href="mailto:support@staffpulse.com" style={{ color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}>support@staffpulse.com</a>
            </p>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--slate-800)' }}>System Security</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--slate-500)', margin: 0 }}>
              StaffPulse v1.2 Enterprise Edition with role-level data protection.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div style={{ background: '#ffffff', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--slate-900)' }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>Find immediate answers to common operational questions.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'attendance', 'leaves', 'tasks', 'security'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab ? 'var(--primary-50)' : 'var(--slate-100)',
                  color: activeTab === tab ? 'var(--primary-600)' : 'var(--slate-600)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map(faq => (
              <div 
                key={faq.id}
                style={{
                  border: '1px solid var(--slate-200)',
                  borderRadius: '0.5rem',
                  padding: '1rem 1.25rem',
                  background: 'var(--slate-50)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <CheckCircle2 size={18} color="var(--primary-500)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--slate-900)' }}>
                      {faq.question}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.5 }}>
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)' }}>
              No help articles found matching "{searchQuery}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
