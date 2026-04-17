import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 60 }}>
      <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, color }}>{value}%</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function RankBadge({ rank }) {
  const colors = {
    1: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', text: '#fff' },
    2: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', text: '#fff' },
    3: { bg: 'linear-gradient(135deg, #c2855e, #a16207)', text: '#fff' },
  };
  const c = colors[rank] || { bg: 'var(--surface)', text: 'var(--text-muted)' };
  return (
    <div style={{
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: c.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Manrope',
      fontWeight: 800,
      fontSize: 14,
      color: c.text,
      flexShrink: 0
    }}>
      {rank}
    </div>
  );
}

export default function RecruiterPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const r = await fetch('http://localhost:8000/api/jobs');
      setJobs(await r.json());
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) { setPostError('Both fields are required.'); return; }
    setIsPosting(true); setPostError('');
    try {
      await fetch('http://localhost:8000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      setNewTitle(''); setNewDesc(''); setShowForm(false);
      await fetchJobs();
    } catch (e) { setPostError('Failed to create job.'); }
    finally { setIsPosting(false); }
  };

  const selectJob = async (job) => {
    setSelectedJob(job);
    try {
      const r = await fetch(`http://localhost:8000/api/jobs/${job.id}/applications`);
      setApplications(await r.json());
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{
        width: 280,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div className="sidebar-logo-icon" style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #2e0052, #4b0082)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18, color: '#fff' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div className="name" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 18 }}>Aira</div>
            <div className="sub" style={{ fontSize: 11, color: '#6b7280' }}>Recruiter Portal</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
          <Link to="/" className="nav-link" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 8,
            color: '#374151',
            textDecoration: 'none',
            fontSize: 14,
            transition: 'all 0.2s'
          }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>
          <a className="nav-link active" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#f3f4f6',
            color: '#2e0052',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600
          }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Job Postings
          </a>
        </nav>

        {/* Post New Job button */}
        <button className="btn btn-primary" style={{
          width: '100%',
          marginBottom: 20,
          padding: '10px 16px',
          background: '#2e0052',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }} onClick={() => setShowForm(!showForm)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job Posting
        </button>

        {/* Inline create form */}
        {showForm && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input-field"
              placeholder="Job Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{
                fontSize: 13,
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                outline: 'none'
              }}
            />
            <textarea
              className="input-field"
              placeholder="Job description…"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={4}
              style={{
                resize: 'vertical',
                fontSize: 13,
                lineHeight: 1.5,
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {postError && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{postError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{
                flex: 1,
                fontSize: 13,
                padding: '10px',
                background: '#2e0052',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }} onClick={handleCreate} disabled={isPosting}>
                {isPosting ? 'Posting…' : 'Create'}
              </button>
              <button className="btn btn-ghost" style={{
                fontSize: 13,
                padding: '10px 12px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                cursor: 'pointer'
              }} onClick={() => { setShowForm(false); setPostError(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Job list */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Active Listings ({jobs.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
          {jobs.length === 0 ? (
            <p style={{ fontSize: 13, color: '#6b7280', padding: '12px 0' }}>No jobs yet.</p>
          ) : jobs.map(job => (
            <div key={job.id} className={`job-card ${selectedJob?.id === job.id ? 'active' : ''}`} onClick={() => selectJob(job)} style={{
              padding: '12px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: selectedJob?.id === job.id ? '#f3f4f6' : 'transparent',
              border: selectedJob?.id === job.id ? '1px solid #e5e7eb' : '1px solid transparent'
            }}>
              <div className="title" style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, wordBreak: 'break-word' }}>{job.title}</div>
              <div className="desc" style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{job.description}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
          <Link to="/candidate" className="nav-link" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(6,182,212,.08)',
            border: '1px solid rgba(6,182,212,.2)',
            color: '#0891b2',
            textDecoration: 'none',
            fontSize: 14
          }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Candidate Portal
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content" style={{ flex: 1, padding: '32px 40px', overflowX: 'auto' }}>
        {!selectedJob ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1200 }}>
            <div className="fade-up">
              <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 'clamp(24px, 5vw, 34px)', margin: '0 0 8px', letterSpacing: '-1px', wordBreak: 'break-word' }}>Recruiter Dashboard</h1>
              <p style={{ color: '#6b7280', fontSize: 15, margin: 0 }}>Create job postings and review AI-graded applicants ranked by overall fit.</p>
            </div>

            {/* Stats Row */}
            <div className="fade-up-d1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { icon: 'work', label: 'Active Postings', value: jobs.length, color: '124,58,237' },
                { icon: 'group', label: 'Total Applicants', value: '—', color: '6,182,212' },
                { icon: 'speed', label: 'Avg Turnaround', value: '< 30s', color: '16,185,129' },
              ].map(({ icon, label, value, color }, i) => (
                <div key={i} className="card fade-up" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `rgba(${color},.12)`, border: `1px solid rgba(${color},.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="w-6 h-6" fill="none" stroke={`rgb(${color})`} viewBox="0 0 24 24" style={{ width: 22, height: 22 }}>
                      {icon === 'work' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                      {icon === 'group' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                      {icon === 'speed' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 28, color: `rgb(${color})` }}>{value}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="empty-state fade-up-d2" style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb'
            }}>
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="#6b7280" viewBox="0 0 24 24" style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#9ca3af' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>Select a job listing</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>to view the AI-ranked leaderboard of applicants</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: '100%', overflowX: 'auto' }}>

            {/* Job Header */}
            <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <button onClick={() => setSelectedJob(null)} className="btn btn-ghost" style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  marginBottom: 14,
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  All Jobs
                </button>
                <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 'clamp(24px, 5vw, 30px)', margin: '0 0 6px', letterSpacing: '-1px', wordBreak: 'break-word' }}>{selectedJob.title}</h1>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  {applications.length} applicant{applications.length !== 1 ? 's' : ''} · ranked by AI score
                </p>
              </div>
              <div style={{ background: 'rgba(6,182,212,.08)', border: '1px solid rgba(6,182,212,.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13 }}>
                <svg className="w-4 h-4" fill="none" stroke="#0891b2" viewBox="0 0 24 24" style={{ width: 15, height: 15, display: 'inline', verticalAlign: 'middle', marginRight: 6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ color: '#0891b2' }}>Scores auto-update as new applications arrive</span>
              </div>
            </div>

            {/* Leaderboard */}
            {applications.length === 0 ? (
              <div className="empty-state fade-up-d1" style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb'
              }}>
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="#6b7280" viewBox="0 0 24 24" style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#9ca3af' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>No applications yet</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Share the Candidate Portal link to start receiving applications.</p>
                <Link to="/candidate" className="btn btn-ghost" style={{
                  fontSize: 13,
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: '#374151',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Candidate Portal
                </Link>
              </div>
            ) : (
              <div className="fade-up-d1" style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowX: 'auto' }}>
                {/* Column headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '38px 1fr auto 100px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '0 20px 12px 20px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '.07em',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: 800
                }}>
                  <span>#</span>
                  <span>Candidate</span>
                  <div style={{ display: 'flex', gap: 32, justifySelf: 'end' }}>
                    <span style={{ minWidth: 60, textAlign: 'center' }}>Skill</span>
                    <span style={{ minWidth: 60, textAlign: 'center' }}>Semantic</span>
                    <span style={{ minWidth: 60, textAlign: 'center' }}>Integrity</span>
                  </div>
                  <span style={{ textAlign: 'center' }}>Final Score</span>
                </div>

                {applications.map((app, i) => (
                  <div key={app.id} className={`rank-row fade-up`} style={{
                    display: 'grid',
                    gridTemplateColumns: '38px 1fr auto 100px',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    minWidth: 800
                  }}>
                    <RankBadge rank={i + 1} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <img
                        alt={app.candidate_name}
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(app.candidate_name)}&background=3b0764&color=c4b5fd&size=80`}
                        style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, border: '1px solid #e5e7eb' }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.candidate_name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Applied via Aira Portal</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 32, alignItems: 'center', justifySelf: 'end' }}>
                      <StatPill label="Skill" value={app.skill_match} color="#a78bfa" />
                      <StatPill label="Semantic" value={app.semantic_similarity} color="#67e8f9" />
                      <StatPill label="Integrity" value={app.fraud_integrity} color="#6ee7b7" />
                    </div>

                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 28, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                        {app.final_score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}