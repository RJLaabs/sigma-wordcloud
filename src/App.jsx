import { useEffect, useRef, useState } from 'react';
import { client, useConfig, useElementData } from '@sigmacomputing/plugin';
import cloud from 'd3-cloud';

client.config.configureEditorPanel([
  { name: 'source', type: 'element' },
  { name: 'term', type: 'column', source: 'source', allowedTypes: ['text'], label: 'Term Column' },
  { name: 'count', type: 'column', source: 'source', allowedTypes: ['number', 'integer'], label: 'Count Column' },
]);

const COLORS = [
  '#1A6FDB', '#0EA5E9', '#2DD4BF', '#3B82F6', '#0891B2',
  '#06B6D4', '#38BDF8', '#0284C7', '#60A5FA', '#22D3EE',
  '#1D4ED8', '#0E7490', '#F59E0B', '#10B981', '#8B5CF6',
  '#EC4899', '#EF4444', '#F97316', '#14B8A6', '#6366F1',
  '#A855F7', '#84CC16', '#FB923C', '#E879F9', '#34D399',
];

export default function App() {
  const config = useConfig();
  const sigmaData = useElementData(config?.source);
  const containerRef = useRef(null);
  const [words, setWords] = useState([]);
  const [viewBox, setViewBox] = useState('0 0 800 500');
  const [dims, setDims] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState(null);
  const lastFingerprintRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        const h = Math.floor(e.contentRect.height);
        if (w > 0 && h > 0) setDims({ width: w, height: h });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!sigmaData || !config?.term || !config?.count) return;

    const terms  = sigmaData[config.term]  || [];
    const counts = sigmaData[config.count] || [];
    if (terms.length === 0) return;

    const fingerprint = terms.join('|') + '::' + counts.join('|') + '::' + dims.width + 'x' + dims.height;
    if (fingerprint === lastFingerprintRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastFingerprintRef.current = fingerprint;

      const numCounts = counts.map(Number);
      const maxCount = Math.max(...numCounts);
      const minCount = Math.min(...numCounts);
      const range = maxCount - minCount || 1;

      const MIN_FONT = 12;
      const MAX_FONT = Math.min(Math.floor(dims.height / 3), 80);

      const sized = terms
        .map((text, i) => ({ text: String(text), rawCount: numCounts[i] || 1 }))
        .filter(w => w.text && w.text.trim())
        .sort((a, b) => b.rawCount - a.rawCount)
        .map(w => ({
          ...w,
          size: MIN_FONT + Math.sqrt((w.rawCount - minCount) / range) * (MAX_FONT - MIN_FONT),
        }));

      cloud()
        .size([dims.width, dims.height])
        .words(sized)
        .padding(5)
        .rotate(() => (Math.random() > 0.85 ? 90 : 0))
        .font('system-ui, sans-serif')
        .fontWeight(d => (d.size > MAX_FONT * 0.5 ? '700' : '500'))
        .fontSize(d => d.size)
        .on('end', placed => {
          if (placed.length === 0) return;

          // Calculate actual bounding box of placed words
          const pad = 16;
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          placed.forEach(w => {
            const hw = (w.width  || w.size * w.text.length * 0.6) / 2;
            const hh = (w.height || w.size) / 2;
            minX = Math.min(minX, w.x - hw);
            maxX = Math.max(maxX, w.x + hw);
            minY = Math.min(minY, w.y - hh);
            maxY = Math.max(maxY, w.y + hh);
          });

          // ViewBox centered on actual content with padding
          const vbX = minX - pad;
          const vbY = minY - pad;
          const vbW = (maxX - minX) + pad * 2;
          const vbH = (maxY - minY) + pad * 2;
          setViewBox(`${vbX} ${vbY} ${vbW} ${vbH}`);
          setWords(placed);
        })
        .start();
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [sigmaData, config, dims]);

  if (!config?.source || !config?.term || !config?.count) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontFamily: 'system-ui, sans-serif', fontSize: '13px' }}>
        Select a data source, Term column, and Count column in the editor panel
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontFamily: 'system-ui, sans-serif', fontSize: '13px' }}>
        Loading...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {words.map((word, i) => (
          <text
            key={`${word.text}-${i}`}
            textAnchor="middle"
            transform={`translate(${word.x},${word.y}) rotate(${word.rotate})`}
            style={{
              fontSize: `${word.size}px`,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: word.size > 40 ? 700 : 500,
              fill: COLORS[i % COLORS.length],
              opacity: 0.9,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              e.target.style.opacity = 1;
              const rect = containerRef.current.getBoundingClientRect();
              setTooltip({ text: word.text, count: word.rawCount, x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseMove={e => {
              const rect = containerRef.current.getBoundingClientRect();
              setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : t);
            }}
            onMouseLeave={e => {
              e.target.style.opacity = 0.9;
              setTooltip(null);
            }}
          >
            {word.text}
          </text>
        ))}
      </svg>

      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 36,
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#f1f5f9',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}>
          <span style={{ fontWeight: 600 }}>{tooltip.text}</span>
          <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{Number(tooltip.count).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
