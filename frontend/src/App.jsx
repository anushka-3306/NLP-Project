import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CandidatePage from './pages/CandidatePage';
import RecruiterPage from './pages/RecruiterPage';

function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Background orbs */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', top: '20%', right: '15%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      <div className="fade-up" style={{ textAlign: 'center', zIndex: 10, maxWidth: 560, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 12px 40px rgba(124,58,237,0.4)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'white', fontVariationSettings: "'FILL' 1" }}>analytics</span>
        </div>

        <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 56, lineHeight: 1.05, letterSpacing: '-2px', margin: '0 0 16px', background: 'linear-gradient(135deg, #e8eaf0 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Aira Intelligence
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 17, lineHeight: 1.6, margin: '0 0 48px' }}>
          The autonomous applicant tracking system that parses talent with AI precision.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/candidate" className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px', minWidth: 210, gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#a78bfa', fontSize: 26 }}>person_search</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Candidate</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Apply & view AI scores</div>
            </div>
          </Link>

          <Link to="/recruiter" className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px', minWidth: 210, gap: 12, textDecoration: 'none', borderColor: 'rgba(124,58,237,.3)', background: 'rgba(124,58,237,.06)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px var(--accent-glow)' }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 26 }}>dashboard</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Recruiter</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage jobs & rank talent</div>
            </div>
          </Link>
        </div>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--text-faint)' }}>
          Powered by BGE-M3 · dbmdz BERT · Neo4j Graph
        </p>
      </div>
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