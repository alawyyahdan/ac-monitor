'use client';
import { useState, useEffect } from 'react';
import { format, startOfDay, eachHourOfInterval, isToday, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import styles from './CostTracker.module.css';

const fmtRp = (val) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(val || 0);

export default function CostTracker({ pzem, rate, onRateChange, sessionEnergy, history }) {
  const [budget, setBudget] = useState(150000);
  const [editRate, setEditRate] = useState(false);
  const [rateInput, setRateInput] = useState(rate);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget);

  useEffect(() => { setRateInput(rate); }, [rate]);

  const totalEnergy = pzem.energy || 0;
  const totalCost = totalEnergy * rate;
  const sessionCost = sessionEnergy * rate;
  const power = pzem.power || 0;
  const costPerHour = (power / 1000) * rate;
  const costPerDay = costPerHour * 8;
  const costPerMonth = costPerDay * 30;

  const budgetUsedPct = Math.min(100, (totalCost / budget) * 100);
  const budgetLeft = Math.max(0, budget - totalCost);
  const isBudgetWarning = budgetUsedPct > 80;
  const isBudgetCritical = budgetUsedPct > 95;

  const handleRateSave = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) onRateChange(val);
    setEditRate(false);
  };

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) setBudget(val);
    setEditBudget(false);
  };

  return (
    <div className={styles.wrap}>
      {/* Budget warning */}
      {isBudgetCritical && (
        <div className="alert alert-error animate-fade-in">
          🚨 Budget hampir habis! Sudah terpakai {budgetUsedPct.toFixed(0)}% dari anggaran bulanan.
        </div>
      )}
      {isBudgetWarning && !isBudgetCritical && (
        <div className="alert alert-warning animate-fade-in">
          ⚠️ Penggunaan mencapai {budgetUsedPct.toFixed(0)}% budget bulanan.
        </div>
      )}

      <div className={styles.grid}>
        {/* Session cost */}
        <div className={`${styles.bigCard} ${styles.cyan}`}>
          <div className={styles.bigCardIcon}>⚡</div>
          <div className={styles.bigCardLabel}>Biaya Session Ini</div>
          <div className={styles.bigCardValue}>{fmtRp(sessionCost)}</div>
          <div className={styles.bigCardSub}>{sessionEnergy.toFixed(4)} kWh terpakai</div>
        </div>

        <div className={`${styles.bigCard} ${styles.green}`}>
          <div className={styles.bigCardIcon}>💡</div>
          <div className={styles.bigCardLabel}>Biaya/Jam Saat Ini</div>
          <div className={styles.bigCardValue}>{fmtRp(costPerHour)}</div>
          <div className={styles.bigCardSub}>{power.toFixed(1)} W konsumsi sekarang</div>
        </div>

        <div className={`${styles.bigCard} ${styles.yellow}`}>
          <div className={styles.bigCardIcon}>📅</div>
          <div className={styles.bigCardLabel}>Estimasi/Hari</div>
          <div className={styles.bigCardValue}>{fmtRp(costPerDay)}</div>
          <div className={styles.bigCardSub}>Asumsi 8 jam/hari</div>
        </div>

        <div className={`${styles.bigCard} ${styles.purple}`}>
          <div className={styles.bigCardIcon}>📆</div>
          <div className={styles.bigCardLabel}>Estimasi/Bulan</div>
          <div className={styles.bigCardValue}>{fmtRp(costPerMonth)}</div>
          <div className={styles.bigCardSub}>Asumsi 30 hari</div>
        </div>
      </div>

      {/* Budget tracker */}
      <div className={styles.budgetCard}>
        <div className={styles.budgetHeader}>
          <div>
            <h3 className={styles.sectionTitle}>💼 Budget Bulanan</h3>
            <p className="text-sm text-secondary">Tracking pengeluaran listrik AC</p>
          </div>
          {!editBudget ? (
            <button className="btn btn-ghost" onClick={() => setEditBudget(true)} style={{ fontSize: 12 }}>
              ✏️ Edit Budget
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                className="input"
                style={{ width: 140 }}
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleBudgetSave} style={{ padding: '8px 16px' }}>Simpan</button>
            </div>
          )}
        </div>

        <div className={styles.budgetBar}>
          <div
            className={`${styles.budgetFill} ${isBudgetCritical ? styles.fillRed : isBudgetWarning ? styles.fillYellow : styles.fillGreen}`}
            style={{ width: `${budgetUsedPct}%` }}
          />
        </div>

        <div className={styles.budgetLabels}>
          <span className="text-sm text-secondary">
            Terpakai: <strong style={{ color: isBudgetCritical ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {fmtRp(totalCost)}
            </strong>
          </span>
          <span className="text-sm text-secondary">
            {budgetUsedPct.toFixed(1)}%
          </span>
          <span className="text-sm text-secondary">
            Sisa: <strong style={{ color: 'var(--accent-green)' }}>{fmtRp(budgetLeft)}</strong>
          </span>
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 8 }}>
          Budget: {fmtRp(budget)}/bulan
        </div>
      </div>

      {/* Rate settings */}
      <div className={styles.rateCard}>
        <div className={styles.rateHeader}>
          <div>
            <h3 className={styles.sectionTitle}>⚙️ Tarif Listrik PLN</h3>
            <p className="text-sm text-secondary">Digunakan untuk kalkulasi biaya</p>
          </div>
          {!editRate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={styles.rateValue}>{fmtRp(rate)}/kWh</span>
              <button className="btn btn-ghost" onClick={() => setEditRate(true)} style={{ fontSize: 12 }}>
                ✏️ Ubah
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="text-secondary text-sm">Rp</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: 120 }}
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                />
                <span className="text-secondary text-sm">/kWh</span>
              </div>
              <button className="btn btn-primary" onClick={handleRateSave} style={{ padding: '8px 16px' }}>Simpan</button>
              <button className="btn btn-ghost" onClick={() => setEditRate(false)} style={{ padding: '8px 16px' }}>Batal</button>
            </div>
          )}
        </div>

        <div className={styles.ratePresets}>
          <span className="text-xs text-muted">Preset golongan PLN:</span>
          {[
            { label: 'R1 900VA', val: 1352 },
            { label: 'R1 1300VA', val: 1444.7 },
            { label: 'R1 2200VA', val: 1699.53 },
            { label: 'R2 3500VA', val: 1699.53 },
          ].map(p => (
            <button key={p.label} className={`btn btn-ghost ${styles.presetBtn}`}
              onClick={() => { onRateChange(p.val); }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
