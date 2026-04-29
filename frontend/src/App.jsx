import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CandidatePage from './pages/CandidatePage';
import RecruiterPage from './pages/RecruiterPage';
import ThemeToggle from './components/ThemeToggle';

function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] transition-colors duration-200 flex flex-col font-['Inter']">
      
      {/* Navbar */}
      <nav className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-[var(--bg-card)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white font-['Manrope'] tracking-tight">Aira</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 fade-up">
        <h1 className="text-4xl md:text-5xl font-black text-center mb-4 font-['Manrope'] tracking-tight text-slate-900 dark:text-white max-w-[800px]">
          Talent Intelligence for the Modern Enterprise
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 text-center text-lg max-w-[600px] mb-12">
          An autonomous applicant tracking system that parses resumes and ranks talent with high-precision AI.
        </p>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-[720px] justify-center">
          
          <Link 
            to="/candidate" 
            className="group flex-1 flex flex-col items-start p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-sm"
          >
            <div className="w-12 h-12 mb-4 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Manrope'] mb-1">Candidate Portal</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Submit applications and view parsing diagnostics.</p>
          </Link>

          <Link 
            to="/recruiter" 
            className="group flex-1 flex flex-col items-start p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-sm"
          >
            <div className="w-12 h-12 mb-4 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Manrope'] mb-1">Recruiter Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage job postings and analyze candidate rankings.</p>
          </Link>

        </div>
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