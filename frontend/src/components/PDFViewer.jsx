import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker URL using standard Vite method
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewer({ fileUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isDark, setIsDark] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    requestAnimationFrame(handleFitHeight);
  }

  const handleFitHeight = () => {
    if (containerRef.current) {
      const availableHeight = containerRef.current.clientHeight - 32; // viewer padding
      setPageHeight(Math.max(availableHeight, 240));
      setScale(1.0);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleFitHeight);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      handleFitHeight();
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#1E1E2E] rounded-xl overflow-hidden shadow-inner border border-slate-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b border-slate-800 text-white z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Page {pageNumber} / {numPages || '--'}
          </span>
          <button 
            onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
            disabled={pageNumber >= (numPages || 1)}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <button 
            onClick={handleFitHeight}
            className="px-2 py-1 text-[10px] font-black hover:bg-slate-800 rounded transition-colors text-slate-300"
          >
            {Math.round(scale * 100)}%
          </button>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div 
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#1E1E2E] flex justify-center p-4 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {fileUrl ? (
          <div className="h-fit">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading Document...</span>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-64 text-rose-500 gap-2">
                   <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   <span className="text-xs font-bold">Document Unavailable</span>
                </div>
              }
            >
            <Page 
                pageNumber={pageNumber} 
                height={pageHeight ? pageHeight * scale : undefined}
                className="shadow-2xl mb-4 transition-all duration-300"
                style={{ 
                  filter: isDark ? 'invert(0.9) hue-rotate(180deg) contrast(1.1)' : 'none' 
                }}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]">Select a candidate to view dossier</div>
          </div>
        )}
      </div>
    </div>
  );
}
