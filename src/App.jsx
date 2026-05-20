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

function getColor(index) {
  return COLORS[index % COLORS.length];
}

export default function App() {
  const config = useConfig();
  const sigmaData = useElementData(config?.source);
  const containerRef = useRef(null);
  const [words, setWords] = useState([]);
  const [dims, setDims] = useState({ width: 800, height: 500 });
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ width: Math.floor(e.contentRect.width), height: Math.floor(e.contentRect.height) });
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

    const maxCount = Math.max(...counts.map(Number));
    const minCount = Math.min(...counts.map(Number));
    const range = maxCount - minCount || 1;
    const MIN_FONT = 11;
    const MAX_FONT = Math.min(Math.floor(dims.height / 4), 90);

    const sized = terms
      .map((text, i) => ({ text: String(text), rawCount: Number(counts[i]) || 1 }))
      .filter(w => w.text && w.text.trim())
      .map(w => ({ ...w, size: MIN_FONT + ((w.rawCount - minCount) / range) * (MAX_FONT - MIN_FONT) }));

    cloud()
      .size([dims.width, dims.height])
      .words(sized)
      .padding(6)
      .rotate(() => (Math.random() > 0.75 ? 90 : 0))
      .font('DM Sans, system-ui, sans-serif')
      .fontWeight(d => (d.size > MAX_FONT * 0.5 ? '700' : '500'))
      .fontSize(d => d.size)
      .on('end', placed => setWords(placed))
      .start();
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'transparent', position: 'relative' }}>
      <svg width={dims.width} height={dims.height} style={{ display: 'block' }}>
        <g transform={`translate(${dims.width / 2},${dims.height / 2})`}>
          {words.map((word, i) => (
            <text
              key={`${word.text}-${i}`}
              textAnchor="middle"
              transform={`translate(${word.x},${word.y}) rotate(${word.rotate})`}
              style={{
                fontSize: `${word.size}px`,
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: word.size > 45 ? 700 : 500,
                fill: getColor(i),
                opacity: 0.9,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => {
                e.target.style.opacity = 1;
                const rect = containerRef.current.getBoundingClientRect();
                const ex = e.clientX - rect.left;
                const ey = e.clientY - rect.top;
                setTooltip({ text: word.text, count: word.rawCount, x: ex, y: ey });
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
        </g>
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
