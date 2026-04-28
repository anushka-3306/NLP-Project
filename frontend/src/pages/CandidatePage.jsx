import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CandidatePage() {
  // Form State
  const [file, setFile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [previousApplications, setPreviousApplications] = useState([]);

  // UI State
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchJobs();
    fetchPreviousApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/jobs");
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchPreviousApplications = async () => {
    // In a real app, you'd fetch applications for the current user
    // For demo, we'll fetch recent applications from localStorage or a user-specific endpoint
    try {
      // Try to get from localStorage first (for demo purposes)
      const storedApps = localStorage.getItem('candidate_applications');
      if (storedApps) {
        setPreviousApplications(JSON.parse(storedApps));
      }

      // Optionally fetch from API if you have user authentication
      // const response = await fetch("http://localhost:8000/api/candidate/applications");
      // const data = await response.json();
      // setPreviousApplications(data);
    } catch (error) {
      console.error("Error fetching previous applications:", error);
    }
  };

  const saveApplication = (applicationData) => {
    // Save to localStorage for demo purposes
    const storedApps = localStorage.getItem('candidate_applications');
    const existingApps = storedApps ? JSON.parse(storedApps) : [];
    const newApp = {
      id: Date.now(),
      job_title: applicationData.job_title,
      job_id: applicationData.job_id,
      candidate_name: applicationData.candidate_name,
      final_score: applicationData.final_score,
      applied_at: new Date().toISOString(),
      status: 'submitted'
    };
    const updatedApps = [newApp, ...existingApps].slice(0, 10); // Keep last 10
    localStorage.setItem('candidate_applications', JSON.stringify(updatedApps));
    setPreviousApplications(updatedApps);
  };

  // Handlers for Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // API Submit
  const handleAnalyze = async () => {
    if (!file || !selectedJob) {
      setError("Please provide a resume file and select a job opening.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_title", selectedJob.title);
    formData.append("job_description", selectedJob.description);
    formData.append("job_id", selectedJob.id);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      // Save the application to previous applications
      saveApplication({
        job_title: selectedJob.title,
        job_id: selectedJob.id,
        candidate_name: data.candidate_name,
        final_score: data.final_score
      });

    } catch (err) {
      setError(err.message || "Failed to connect to the analysis engine.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex antialiased bg-[#f8f9fa]">

      {/* Sidebar */}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <div className="name" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 18, color: '#111827' }}>Aira</div>
            <div className="sub" style={{ fontSize: 11, color: '#6b7280' }}>Candidate Portal</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Apply for Jobs
          </a>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Home
          </Link>
        </nav>

        {/* Previous Applications Section */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Recent Applications</span>
            <span style={{ fontSize: 10, background: '#f3f4f6', padding: '2px 6px', borderRadius: 10 }}>
              {previousApplications.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {previousApplications.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px 12px',
                background: '#f9fafb',
                borderRadius: 8,
                fontSize: 12,
                color: '#6b7280'
              }}>
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 32, height: 32, margin: '0 auto 8px', color: '#9ca3af' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p style={{ margin: 0 }}>No applications yet</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Your submitted applications will appear here</p>
              </div>
            ) : (
              previousApplications.map((app, index) => (
                <div
                  key={app.id}
                  style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const job = jobs.find(j => j.id === app.job_id);
                    if (job) setSelectedJob(job);
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, wordBreak: 'break-word', color: '#111827' }}>
                    {app.job_title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: app.final_score >= 70 ? '#10b981' : app.final_score >= 40 ? '#f59e0b' : '#ef4444'
                    }}>
                      Score: {app.final_score}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${app.final_score}%`,
                      height: '100%',
                      background: app.final_score >= 70 ? '#10b981' : app.final_score >= 40 ? '#f59e0b' : '#ef4444',
                      borderRadius: 2
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
          <Link to="/recruiter" className="nav-link" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(46,0,82,.08)',
            border: '1px solid rgba(46,0,82,.2)',
            color: '#2e0052',
            textDecoration: 'none',
            fontSize: 14
          }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Recruiter Portal
          </Link>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 mx-auto w-full flex flex-col gap-8 md:gap-12 bg-[#f8f9fa]" style={{ overflowX: 'auto' }}>

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-['Manrope'] text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#191c1d] tracking-tight mb-2">Candidate Application Portal</h1>
            <p className="font-['Inter'] text-[#4c4451] text-base md:text-lg">Select an open position and upload your resume to be parsed by Aira ATS.</p>
          </div>
        </header>

        {/* Form Section */}
        <section className="bg-[#f3f4f5] rounded-xl p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-10">

          {/* Left: File Upload */}
          <div className="flex-1">
            <label className="block font-['Manrope'] font-bold text-[#191c1d] mb-4">Candidate Document</label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[280px] ${isDragging ? "border-[#2e0052] bg-[#f0dbff]/30" : "border-[#cec3d3] bg-white hover:bg-[#e7e8e9]"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.docx,.doc"
              />
              <div className="w-16 h-16 bg-[#f0dbff] rounded-full flex items-center justify-center mb-6 text-[#2e0052]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="font-['Manrope'] font-bold text-lg mb-2 break-all max-w-full text-gray-900">
                {file ? file.name : "Drag & Drop Resume"}
              </h3>
              <p className="text-[#4c4451] text-sm mb-6">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Supports PDF, DOCX (Max 10MB)"}
              </p>
              <button className="px-6 py-2 bg-[#e5e2e1] text-[#1c1b1b] rounded-md font-medium text-sm hover:bg-[#e1e3e4] transition-colors">
                {file ? "Change File" : "Browse Files"}
              </button>
            </div>
          </div>

          {/* Right: Inputs */}
          <div className="flex-1 flex flex-col gap-6 md:gap-8">
            <div>
              <label className="block font-['Manrope'] font-bold text-[#191c1d] mb-2">Select Target Job *</label>
              <select
                value={selectedJob ? selectedJob.id : ''}
                onChange={(e) => {
                  const job = jobs.find(j => j.id === parseInt(e.target.value));
                  setSelectedJob(job);
                }}
                className="w-full bg-[#e1e3e4] border-b-2 border-transparent focus:border-[#2e0052] px-4 py-4 rounded-t-md outline-none font-['Inter'] text-base md:text-lg text-[#191c1d] transition-colors appearance-none"
              >
                <option value="" disabled>-- Select a Job Listing --</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex flex-col min-h-[200px]">
              <label className="block font-['Manrope'] font-bold text-[#191c1d] mb-2">Job Description</label>
              <div className="w-full flex-1 bg-[#f8f9fa] border border-[#e1e3e4] p-4 rounded-md font-['Inter'] text-base text-[#4c4451] min-h-[150px] max-h-[300px] overflow-y-auto break-words whitespace-pre-wrap">
                {selectedJob ? selectedJob.description : <span className="opacity-50">Select a job to view its description.</span>}
              </div>
            </div>

            {error && (
              <div className="text-[#ba1a1a] text-sm font-medium p-3 bg-red-50 rounded-md">{error}</div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full py-4 bg-[#2e0052] text-white rounded-md font-['Manrope'] font-bold text-lg hover:opacity-90 transition-opacity mt-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #2e0052, #4b0082)" }}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              {isLoading ? "Submitting Application & Parsing..." : "Submit Application"}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {result && (
          <section className="flex flex-col gap-8 md:gap-12">
            {/* Results Header / Candidate Identity */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-xl relative overflow-hidden shadow-[0_8px_30px_rgb(46,0,82,0.04)]">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#ddb7ff] rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              <div className="flex items-center gap-6 z-10 flex-wrap">
                <img
                  alt="Candidate Photo"
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#f8f9fa]"
                  src={`https://ui-avatars.com/api/?name=${result.candidate_name}&background=e7e8e9&color=2e0052&size=128`}
                />
                <div>
                  <h2 className="font-['Manrope'] text-2xl md:text-3xl font-extrabold text-[#191c1d] break-words">{result.candidate_name}</h2>
                  <p className="font-['Inter'] text-[#4c4451] text-base mt-1">Applying for <span className="font-semibold text-[#2e0052]">{selectedJob?.title}</span></p>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    <span className="px-2.5 py-1 bg-[#e1e3e4] text-[#4c4451] text-xs rounded-sm font-medium">Just Analyzed</span>
                    <span className="px-2.5 py-1 bg-[#e1e3e4] text-[#4c4451] text-xs rounded-sm font-medium break-all max-w-[200px]">{file?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 z-10 bg-[#f8f9fa]/50 backdrop-blur-md px-4 md:px-6 py-4 rounded-xl border border-[#e7e8e9]">
                <div className="text-right">
                  <div className="font-['Manrope'] text-xs md:text-sm font-bold text-[#4c4451] uppercase tracking-wider">Overall AI Match</div>
                  <div className="font-['Manrope'] text-3xl md:text-4xl font-extrabold text-[#2e0052]">{result.final_score}%</div>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-[#e7e8e9] flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-[#e7e8e9]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.8"></path>
                    <path className="text-[#2e0052]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${result.final_score}, 100`} strokeWidth="3.8"></path>
                  </svg>
                  <svg className="w-6 h-6 text-[#2e0052] relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Bento Grid: Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.02)] flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#191c1d] flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2e0052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Skill Match
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-[#2e0052]">{result.breakdown.skill_match}%</span>
                </div>
                <div className="w-full bg-[#edeeef] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2e0052] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown.skill_match}%` }}></div>
                </div>
                <p className="text-sm text-[#4c4451] font-['Inter']">Alignment with core technical requirements based on job graph.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.02)] flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#191c1d] flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2e0052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    Semantic Fit
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-[#2e0052]">{result.breakdown.semantic_similarity}%</span>
                </div>
                <div className="w-full bg-[#edeeef] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2e0052] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown.semantic_similarity}%` }}></div>
                </div>
                <p className="text-sm text-[#4c4451] font-['Inter']">Contextual match between experience described and job responsibilities.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.02)] flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#191c1d] flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2e0052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Integrity Score
                  </h3>
                  <span className="font-['Manrope'] font-extrabold text-xl text-[#2e0052]">{result.breakdown.fraud_integrity}%</span>
                </div>
                <div className="w-full bg-[#edeeef] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2e0052] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${result.breakdown.fraud_integrity}%` }}></div>
                </div>
                <p className="text-sm text-[#4c4451] font-['Inter']">Confidence based on timeline continuity and anomaly detection.</p>
              </div>
            </div>

            {/* Best Job Match Card */}
            {result.job_prediction && (
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.04)] flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden border border-[#f0e6ff]">
                {/* Decorative orb */}
                <div style={{
                  position: 'absolute', right: 0, top: 0,
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                  pointerEvents: 'none'
                }} />

                {/* Icon */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: 'linear-gradient(135deg, #2e0052, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(46,0,82,0.2)'
                }}>
                  <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 z-10">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                    AI Career Match · TF-IDF + Logistic Regression
                  </div>
                  {result.job_prediction.low_confidence ? (
                    <div>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 22, color: '#374151' }}>
                        Low Confidence Prediction
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        The model could not confidently classify this resume into a known category (confidence: {(result.job_prediction.confidence * 100).toFixed(1)}%).
                        This may indicate a highly specialised or mixed-domain profile.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 26, color: '#2e0052' }}>
                        {result.job_prediction.predicted_category}
                      </div>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        Based on your resume content, our classifier recommends roles in{' '}
                        <strong style={{ color: '#4b0082' }}>{result.job_prediction.predicted_category}</strong>.
                        Confidence: <strong>{(result.job_prediction.confidence * 100).toFixed(1)}%</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confidence Badge */}
                {!result.job_prediction.low_confidence && (
                  <div style={{ textAlign: 'center', flexShrink: 0, zIndex: 10 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      border: '4px solid #f0e6ff',
                      background: 'linear-gradient(135deg, rgba(46,0,82,0.05), rgba(124,58,237,0.08))',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <div style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 16, color: '#2e0052', lineHeight: 1 }}>
                        {(result.job_prediction.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>
                        match
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Analysis Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

              {/* Left Column: Skills Detail */}
              <div className="flex flex-col gap-6 md:gap-8 bg-[#f3f4f5] p-6 md:p-8 rounded-xl">
                <h3 className="font-['Manrope'] font-bold text-xl md:text-2xl text-[#191c1d]">Skill Extraction</h3>

                <div>
                  <h4 className="text-sm font-semibold text-[#4c4451] uppercase tracking-wider mb-4">Matched Core Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details.matched_skills?.length > 0 ? (
                      result.details.matched_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white text-[#191c1d] text-sm font-medium rounded-sm border border-[#cec3d3]/30 flex items-center gap-1.5 break-words max-w-full">
                          <svg className="w-4 h-4 text-[#2e0052] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#4c4451]">No core skills matched.</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[#4c4451] uppercase tracking-wider mb-4">Missing or Weak Signals</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.details.missing_skills?.length > 0 ? (
                      result.details.missing_skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1.5 bg-[#edeeef] text-[#4c4451]/80 text-sm font-medium rounded-sm flex items-center gap-1.5 break-words max-w-full">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#4c4451]">No significant gaps identified.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Insights & Fraud */}
              <div className="flex flex-col gap-6 md:gap-8">

                {/* AI Recommendations */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.02)] relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2e0052] rounded-l-xl"></div>
                  <h3 className="font-['Manrope'] font-bold text-xl text-[#191c1d] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2e0052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Recommendations
                  </h3>
                  <ul className="flex flex-col gap-4">
                    {result.recommendations?.length > 0 ? (
                      result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-[#2e0052] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div className="text-sm text-[#191c1d] leading-relaxed">
                            <p className="font-semibold">{rec.skill}</p>
                            <ul className="list-disc ml-5 mt-1 space-y-1">
                              <ul className="list-disc ml-5 mt-1 space-y-1">
                                {rec.resources?.map(([title, link], idx) => (
                                  <li key={idx} className="break-words">
                                    <a
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-purple-600 hover:underline"
                                    >
                                      {title}

                                      {/* 🔗 Small external link icon */}
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-3 h-3 opacity-70"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                                      </svg>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </ul>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-[#4c4451]">No recommendations available</li>
                    )}
                  </ul>
                </div>

                {/* Fraud Report Mini */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-[0_4px_20px_rgb(46,0,82,0.02)] border border-[#edeeef]">
                  <h3 className="font-['Manrope'] font-bold text-xl text-[#191c1d] mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#2e0052]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Integrity Checks
                  </h3>
                  <div className="flex flex-col gap-4">
                    {/* 🔥 Verdict */}
                    <div className="flex justify-between items-center py-2 border-b border-[#edeeef]">
                      <span className="text-sm font-medium text-[#4c4451]">
                        Overall Risk Verdict
                      </span>

                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase
      ${result.details.fraud_report?.verdict === "High Risk"
                            ? "bg-red-100 text-red-800"
                            : result.details.fraud_report?.verdict === "Suspicious"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                      >
                        {result.details.fraud_report?.verdict}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#edeeef] flex-wrap gap-2">
                      <span className="text-sm font-medium text-[#4c4451]">Timeline Continuity</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details.fraud_report?.timeline_valid === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.details.fraud_report?.timeline_valid === false ? 'Flagged' : 'Clear'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#edeeef] flex-wrap gap-2">
                      <span className="text-sm font-medium text-[#4c4451]">Keyword Stuffing Detected</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details.fraud_report?.keyword_stuffing ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.details.fraud_report?.keyword_stuffing ? 'Detected' : 'Negative'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 flex-wrap gap-2">
                      <span className="text-sm font-medium text-[#4c4451]">Hidden Text Analysis</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-sm uppercase ${result.details.fraud_report?.hidden_text ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {result.details.fraud_report?.hidden_text ? 'Found' : 'Clean'}
                      </span>
                    </div>
                    {/* 🔥 Dynamic Fraud Flags */}
                    {result.details.fraud_report?.flags?.length > 0 && (
                      <div className="mt-4 border-t border-[#edeeef] pt-4">
                        <h4 className="text-sm font-semibold text-[#4c4451] mb-3">
                          Detected Issues
                        </h4>

                        <div className="flex flex-col">
                          {result.details.fraud_report.flags.map((flag, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center py-2 border-b border-[#edeeef] last:border-none"
                            >
                              <span className="text-sm text-[#4c4451] pr-4">
                                {flag}
                              </span>

                              <span className="px-2 py-0.5 text-xs font-bold rounded-sm bg-red-100 text-red-800 whitespace-nowrap">
                                FLAGGED
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}