import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CandidatePage from './pages/CandidatePage';
import RecruiterPage from './pages/RecruiterPage';

function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: '#f8f9fa'
    }}>

      {/* Background orbs */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
        top: '20%',
        right: '15%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46,0,82,0.08) 0%, transparent 70%)',
        bottom: '10%',
        left: '10%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none'
      }} />

      <div className="fade-up" style={{
        textAlign: 'center',
        zIndex: 10,
        maxWidth: 560,
        padding: '0 24px',
        animation: 'fadeUp 0.6s ease-out'
      }}>
        {/* Logo */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #2e0052, #4b0082)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          boxShadow: '0 20px 40px rgba(46,0,82,0.3)'
        }}>
          <svg className="w-10 h-10" fill="none" stroke="white" viewBox="0 0 24 24" style={{ width: 40, height: 40 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        <h1 style={{
          fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(40px, 8vw, 56px)',
          lineHeight: 1.05,
          letterSpacing: '-2px',
          margin: '0 0 16px',
          background: 'linear-gradient(135deg, #2e0052, #7c3aed, #06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Aira Intelligence
        </h1>
        <p style={{
          color: '#4c4451',
          fontSize: 'clamp(15px, 4vw, 17px)',
          lineHeight: 1.6,
          margin: '0 0 48px',
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          The autonomous applicant tracking system that parses talent with AI precision.
        </p>

        <div style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '0 16px'
        }}>
          <Link
            to="/candidate"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 40px',
              minWidth: 200,
              gap: 16,
              textDecoration: 'none',
              background: '#fff',
              borderRadius: 20,
              border: '1px solid #e5e7eb',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 30px rgba(46,0,82,0.1)';
              e.currentTarget.style.borderColor = '#2e0052';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(46,0,82,0.1)',
              border: '1px solid rgba(46,0,82,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg className="w-7 h-7" fill="none" stroke="#2e0052" viewBox="0 0 24 24" style={{ width: 28, height: 28 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 6, color: '#191c1d' }}>Candidate</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Apply & view AI scores</div>
            </div>
          </Link>

          <Link
            to="/recruiter"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 40px',
              minWidth: 200,
              gap: 16,
              textDecoration: 'none',
              background: 'linear-gradient(135deg, rgba(46,0,82,0.05), rgba(75,0,130,0.08))',
              borderRadius: 20,
              border: '2px solid rgba(46,0,82,0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(46,0,82,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 20px 30px rgba(46,0,82,0.15)';
              e.currentTarget.style.borderColor = '#2e0052';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46,0,82,0.08), rgba(75,0,130,0.12))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(46,0,82,0.08)';
              e.currentTarget.style.borderColor = 'rgba(46,0,82,0.2)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(46,0,82,0.05), rgba(75,0,130,0.08))';
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2e0052, #4b0082)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(46,0,82,0.2)'
            }}>
              <svg className="w-7 h-7" fill="none" stroke="white" viewBox="0 0 24 24" style={{ width: 28, height: 28 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 6, color: '#191c1d' }}>Recruiter</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Manage jobs & rank talent</div>
            </div>
          </Link>
        </div>

        <div style={{
          marginTop: 64,
          padding: '20px 24px',
          fontSize: 12,
          color: '#6b7280',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Powered by BGE-M3</span>
            <span style={{ width: 4, height: 4, background: '#6b7280', borderRadius: '50%' }}></span>
            <span>dbmdz BERT</span>
            <span style={{ width: 4, height: 4, background: '#6b7280', borderRadius: '50%' }}></span>
            <span>Neo4j Graph</span>
          </span>
        </div>
      </div>

      {/* Add keyframe animation */}
      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/candidate" element={<CandidatePage />} />
        <Route path="/recruiter" element={<RecruiterPage />} />
      </Routes>
    </BrowserRouter>
  );
}