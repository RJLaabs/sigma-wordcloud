import { useEffect, useRef, useState, useCallback } from 'react';
import { client, useConfig, useElementData } from '@sigmacomputing/plugin';
import cloud from 'd3-cloud';

// Register editor panel config with Sigma
client.config.configureEditorPanel([
  { name: 'source', type: 'element' },
  {
    name: 'term',
    type: 'column',
    source: 'source',
    allowedTypes: ['text'],
    label: 'Term Column',
  },
  {
    name: 'count',
    type: 'column',
    source: 'source',
    allowedTypes: ['number', 'integer'],
    label: 'Count Column',
  },
]);

// Talroo-adjacent blue palette
const COLORS = [
  '#1A6FDB', '#0EA5E9', '#2DD4BF', '#3B82F6',
  '#0891B2', '#06B6D4', '#38BDF8', '#0284C7',
  '#60A5FA', '#22D3EE', '#1D4ED8', '#0E7490',
];

function getColor(index, size, maxSize) {
  // Larger words get the deeper blues
  const ratio = size / maxSize;
  if (ratio > 0.75) return '#1A6FDB';
  if (ratio > 0.5)  return '#0EA5E9';
  if (ratio > 0.25) return '#2DD4BF';
  return COLORS[index % COLORS.length];
}

export default function App() {
  const config = useConfig();
  const sigmaData = useElementData(config?.source);
  const containerRef = useRef(null);
  const [words, setWords] = useState([]);
  const [dims, setDims] = useState({ width: 800, height: 500 });

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({
          width: Math.floor(e.contentRect.width),
          height: Math.floor(e.contentRect.height),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build word cloud layout when data or size changes
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

    const wordData = terms
      .map((text, i) => ({
        text: String(text),
        rawCount: Number(counts[i]) || 1,
      }))
      .filter(w => w.text && w.text.trim());

    const sized = wordData.map(w => ({
      ...w,
      size: MIN_FONT + ((w.rawCount - minCount) / range) * (MAX_FONT - MIN_FONT),
    }));

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

  const isConfigured = config?.source && config?.term && config?.count;

  if (!isConfigured) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        fontFamily: 'system-ui, sans-serif',
        color: '#94a3b8',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span style={{ fontSize: '13px' }}>
          Select a data source, Term column, and Count column in the editor panel
        </span>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
      }}>
        Loading...
      </div>
    );
  }

  const maxSize = Math.max(...words.map(w => w.size));

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'transparent' }}
    >
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
                fontWeight: word.size > maxSize * 0.5 ? 700 : 500,
                fill: getColor(i, word.size, maxSize),
                opacity: 0.92,
                cursor: 'default',
                userSelect: 'none',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.target.style.opacity = 1)}
              onMouseLeave={e => (e.target.style.opacity = 0.92)}
            >
              {word.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
