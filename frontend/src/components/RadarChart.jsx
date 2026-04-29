import React, { useEffect, useState } from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from 'recharts';

export default function RadarChart({ breakdown, finalScore }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Use the actual metrics returned by our Professional Analysis Engine
  const radarData = [
    { axis: 'Skills', value: breakdown?.skill_match || 0 },
    { axis: 'Semantic', value: breakdown?.semantic_similarity || 0 },
    { axis: 'Integrity', value: breakdown?.fraud_integrity || 0 },
    { axis: 'Confidence', value: finalScore || 0 }
  ];

  const metrics = [
    { label: 'Technical Skills', value: breakdown?.skill_match || 0, color: '#4F46E5' },
    { label: 'Semantic Match', value: breakdown?.semantic_similarity || 0, color: '#10B981' },
    { label: 'Profile Integrity', value: breakdown?.fraud_integrity || 0, color: '#F59E0B' },
    { label: 'Overall Alignment', value: finalScore || 0, color: '#6366F1' }
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="w-full h-[240px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="axis" 
              tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B', fontWeight: 700 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={3}
              fill="#6366F1"
              fillOpacity={0.4}
              animationDuration={1000}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, idx) => (
          <div key={idx} className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-lg transition-all hover:border-indigo-200 dark:hover:border-indigo-900/30">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{m.label}</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{m.value}%</span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
