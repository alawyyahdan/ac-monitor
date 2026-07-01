'use client';
import styles from './RealtimeCards.module.css';

function MetricCard({ label, value, unit, icon, color, subtext }) {
  const isNull = value === null || value === undefined || isNaN(value);
  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.cardTop}>
        <div className={styles.cardIcon} style={{ background: `${color}22`, color }}>
          {icon}
        </div>
        <span className={styles.cardLabel}>{label}</span>
      </div>
      <div className={styles.cardValue}>
        {isNull ? (
          <span className={styles.noData}>—</span>
        ) : (
          <>
            <span className={styles.num}>{value}</span>
            <span className={styles.unit}>{unit}</span>
          </>
        )}
      </div>
      {subtext && <div className={styles.cardSub}>{subtext}</div>}
      <div className={styles.cardGlow} />
    </div>
  );
}

export default function RealtimeCards({ pzem, acStatus, rate }) {
  const { voltage, current, power, energy, frequency, pf, lastUpdate } = pzem;

  // Cost today estimate (rough: if power constant)
  const costPerHour = power ? (power / 1000) * rate : 0;
  const todayEstimate = costPerHour * 8; // assume 8h/day

  const fmtRp = (val) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(val);

  const metrics = [
    {
      label: 'Tegangan',
      value: voltage !== null ? voltage.toFixed(1) : null,
      unit: 'V',
      icon: '⚡',
      color: '#f59e0b',
      subtext: voltage ? (voltage < 200 ? '⚠️ Rendah' : voltage > 240 ? '⚠️ Tinggi' : '✅ Normal') : null,
    },
    {
      label: 'Arus',
      value: current !== null ? current.toFixed(2) : null,
      unit: 'A',
      icon: '〰️',
      color: '#06b6d4',
    },
    {
      label: 'Daya',
      value: power !== null ? power.toFixed(1) : null,
      unit: 'W',
      icon: '💡',
      color: '#8b5cf6',
      subtext: power !== null ? (power > 10 ? 'AC Menyala' : 'AC Mati / Standby') : null,
    },
    {
      label: 'Energi',
      value: energy !== null ? energy.toFixed(3) : null,
      unit: 'kWh',
      icon: '🔋',
      color: '#10b981',
      subtext: energy !== null ? `≈ ${fmtRp(energy * rate)}` : null,
    },
    {
      label: 'Frekuensi',
      value: frequency !== null ? frequency.toFixed(1) : null,
      unit: 'Hz',
      icon: '📡',
      color: '#3b82f6',
      subtext: frequency ? (Math.abs(frequency - 50) < 1 ? '✅ Stabil' : '⚠️ Tidak stabil') : null,
    },
    {
      label: 'Power Factor',
      value: pf !== null ? pf.toFixed(2) : null,
      unit: '',
      icon: '📐',
      color: '#f97316',
      subtext: pf ? (pf >= 0.85 ? '✅ Baik' : '⚠️ Buruk') : null,
    },
  ];

  return (
    <div className={styles.wrap}>
      {/* Status banner */}
      <div className={`${styles.statusBanner} ${
        acStatus === 'on' ? styles.bannerOn :
        acStatus === 'off' ? styles.bannerOff : styles.bannerUnknown
      }`}>
        <div className={styles.statusDot} />
        <div>
          <div className={styles.statusTitle}>
            AC {acStatus === 'on' ? 'MENYALA 🌡️' : acStatus === 'off' ? 'MATI' : 'STATUS TIDAK DIKETAHUI'}
          </div>
          {lastUpdate && (
            <div className={styles.statusSub}>
              Data terakhir: {lastUpdate.toLocaleTimeString('id-ID')}
            </div>
          )}
        </div>
        {power !== null && power > 10 && (
          <div className={styles.powerBadge}>{power.toFixed(0)} W · {fmtRp(costPerHour)}/jam</div>
        )}
      </div>

      {/* Grid metrics */}
      <div className={styles.grid}>
        {metrics.map(m => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Summary row */}
      {energy !== null && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Biaya Session Ini</div>
            <div className={styles.summaryValue} style={{ color: '#10b981' }}>
              {fmtRp(energy * rate)}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Estimasi Biaya/Jam</div>
            <div className={styles.summaryValue} style={{ color: '#f59e0b' }}>
              {power !== null ? fmtRp(costPerHour) : '—'}
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Tarif Listrik</div>
            <div className={styles.summaryValue} style={{ color: '#06b6d4' }}>
              {fmtRp(rate)}/kWh
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
