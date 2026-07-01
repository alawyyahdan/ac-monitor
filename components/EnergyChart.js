'use client';
import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import styles from './EnergyChart.module.css';

const fmtRp = (v) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(v || 0);

const TIME_RANGES = [
  { label: '30 Menit', value: 30 * 60 * 1000 },
  { label: '1 Jam',    value: 60 * 60 * 1000 },
  { label: '6 Jam',    value: 6  * 60 * 60 * 1000 },
  { label: '24 Jam',   value: 24 * 60 * 60 * 1000 },
  { label: '7 Hari',   value: 7  * 24 * 60 * 60 * 1000 },
  { label: '30 Hari',  value: 30 * 24 * 60 * 60 * 1000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTime}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={styles.tooltipRow}>
          <div className={styles.tooltipDot} style={{ background: p.color }}/>
          <span>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value} {p.name === 'Daya' ? 'W' : 'kWh'}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function EnergyChart({ history, rate }) {
  const [rangeIdx, setRangeIdx] = useState(2); // default 6 jam

  const now = Date.now();
  const windowMs = TIME_RANGES[rangeIdx].value;

  // Filter by selected time range
  const filtered = useMemo(() => {
    const cutoff = now - windowMs;
    return history.filter(p => p.time >= cutoff);
  }, [history, rangeIdx]);

  // Format time label based on range
  const fmtTime = (ts) => {
    if (windowMs <= 60 * 60 * 1000)     return format(new Date(ts), 'HH:mm:ss');
    if (windowMs <= 24 * 60 * 60 * 1000) return format(new Date(ts), 'HH:mm');
    return format(new Date(ts), 'dd/MM HH:mm');
  };

  const chartData = useMemo(() => filtered.map(p => ({
    time: fmtTime(p.time),
    power: p.power,
    energy: p.energy,
    cost: p.energy * rate,
  })), [filtered, rate]);

  // Aggregate by hour for bar chart
  const hourlyData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const key = windowMs <= 2 * 60 * 60 * 1000
        ? format(new Date(p.time), 'HH:mm')
        : format(new Date(p.time), windowMs > 24 * 60 * 60 * 1000 ? 'dd/MM' : 'HH:00');
      if (!map[key]) map[key] = { label: key, maxPower: 0, count: 0 };
      map[key].maxPower = Math.max(map[key].maxPower, p.power);
      map[key].count++;
    });
    return Object.values(map);
  }, [filtered, windowMs]);

  const totalEnergy = filtered.length > 1
    ? Math.max(0, filtered[filtered.length - 1].energy - filtered[0].energy) : 0;
  const totalCost   = totalEnergy * rate;
  const avgPower    = filtered.length > 0 ? filtered.reduce((s, p) => s + p.power, 0) / filtered.length : 0;
  const maxPower    = filtered.length > 0 ? Math.max(...filtered.map(p => p.power)) : 0;
  const onTimePct   = filtered.length > 0 ? (filtered.filter(p => p.power > 10).length / filtered.length) * 100 : 0;

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <div style={{ fontSize: 44 }}>📊</div>
        <h3>Belum ada data historis</h3>
        <p>Data terekam otomatis saat menerima data PZEM via MQTT.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Time range filter */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Rentang waktu:</span>
        <div className={styles.filterBtns}>
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.value}
              className={`${styles.filterBtn} ${rangeIdx === i ? styles.filterBtnActive : ''}`}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noData}>
          <div style={{ fontSize: 32 }}>🔍</div>
          <p>Tidak ada data dalam rentang <strong>{TIME_RANGES[rangeIdx].label}</strong> terakhir.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { label: 'Energi', value: `${totalEnergy.toFixed(4)} kWh`, color: 'var(--accent-green)' },
              { label: 'Biaya',  value: fmtRp(totalCost),                color: 'var(--accent-yellow)' },
              { label: 'Avg Daya', value: `${avgPower.toFixed(1)} W`,    color: 'var(--accent-cyan)' },
              { label: 'Peak',   value: `${maxPower.toFixed(1)} W`,      color: 'var(--accent-purple)' },
              { label: 'AC ON',  value: `${onTimePct.toFixed(0)}%`,      color: 'var(--accent-orange)' },
            ].map(s => (
              <div key={s.label} className={styles.stat}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Power area chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>⚡ Daya Real-Time</h3>
              <span className={styles.chartSub}>{chartData.length} titik data · {TIME_RANGES[rangeIdx].label}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}W`} width={44}/>
                <Tooltip content={<CustomTooltip />}/>
                <Area type="monotone" dataKey="power" name="Daya" stroke="#06b6d4" strokeWidth={2} fill="url(#powerGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          {hourlyData.length > 1 && (
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <h3 className={styles.chartTitle}>💰 Peak Daya per Periode</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}W`} width={44}/>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                    itemStyle={{ color: '#f1f5f9' }}
                    formatter={v => [`${v.toFixed(1)} W`, 'Peak Daya']}
                  />
                  <Bar dataKey="maxPower" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Peak Daya"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>📋 Data Terakhir</h3>
              <span className={styles.chartSub}>10 entry terbaru</span>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Daya (W)</th>
                    <th>Energi (kWh)</th>
                    <th>Biaya Kumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(-10).reverse().map((row, i) => (
                    <tr key={i}>
                      <td>{row.time}</td>
                      <td style={{ color: row.power > 10 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {row.power.toFixed(1)}
                      </td>
                      <td>{row.energy.toFixed(4)}</td>
                      <td>{fmtRp(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
