'use client';
import { useState, useEffect } from 'react';
import styles from './Scheduler.module.css';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function generateId() {
  return `sch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function defaultSchedule() {
  return {
    id: generateId(),
    label: 'Jadwal Baru',
    onTime: '18:00',
    offTime: '22:00',
    days: [0, 1, 2, 3, 4], // weekdays
    enabled: true,
  };
}

export default function Scheduler({ mqttConnected, onCommand, acStatus, onSyncSchedule }) {
  const [syncStatus, setSyncStatus] = useState(null); // null | 'ok' | 'fail'
  const [schedules, setSchedules] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sus_schedules');
        return stored ? JSON.parse(stored) : [defaultSchedule()];
      } catch { return [defaultSchedule()]; }
    }
    return [defaultSchedule()];
  });

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [nextEvent, setNextEvent] = useState(null);
  const [lastSync, setLastSync] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sus_last_sync') || null;
    }
    return null;
  });

  // Tick every second
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(timeStr);

      const dayIdx = (now.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      // Check schedules
      schedules.forEach(sch => {
        if (!sch.enabled || !sch.days.includes(dayIdx)) return;
        if (hhmm === sch.onTime && acStatus !== 'on') {
          onCommand('on');
        }
        if (hhmm === sch.offTime && acStatus !== 'off') {
          onCommand('off');
        }
      });

      // Compute next event
      computeNextEvent(now, schedules);
    };

    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [schedules, acStatus, onCommand]);

  const computeNextEvent = (now, scheds) => {
    const dayIdx = (now.getDay() + 6) % 7;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let best = null;
    let bestDelta = Infinity;

    scheds.forEach(sch => {
      if (!sch.enabled) return;
      sch.days.forEach(d => {
        ['onTime', 'offTime'].forEach(key => {
          const [h, m] = sch[key].split(':').map(Number);
          const mins = h * 60 + m;
          let daysDiff = (d - dayIdx + 7) % 7;
          let delta = daysDiff * 1440 + mins - nowMinutes;
          if (delta <= 0) delta += 7 * 1440;

          if (delta < bestDelta) {
            bestDelta = delta;
            best = {
              action: key === 'onTime' ? 'ON' : 'OFF',
              time: sch[key],
              day: DAYS[d],
              label: sch.label,
              deltaMin: delta,
            };
          }
        });
      });
    });

    setNextEvent(best);
  };

  // Persist
  useEffect(() => {
    localStorage.setItem('sus_schedules', JSON.stringify(schedules));
  }, [schedules]);

  const addSchedule = () => {
    const s = defaultSchedule();
    setSchedules(prev => [...prev, s]);
    setEditId(s.id);
    setEditForm({ ...s });
  };

  const deleteSchedule = (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (editId === id) { setEditId(null); setEditForm(null); }
  };

  const toggleSchedule = (id) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const startEdit = (sch) => {
    setEditId(sch.id);
    setEditForm({ ...sch });
  };

  const saveEdit = () => {
    setSchedules(prev => prev.map(s => s.id === editId ? { ...editForm } : s));
    setEditId(null);
    setEditForm(null);
  };

  const toggleDay = (dayIdx) => {
    setEditForm(f => ({
      ...f,
      days: f.days.includes(dayIdx) ? f.days.filter(d => d !== dayIdx) : [...f.days, dayIdx].sort(),
    }));
  };

  const fmtDeltaMin = (d) => {
    if (d < 60) return `${d} menit lagi`;
    const h = Math.floor(d / 60);
    const m = d % 60;
    return `${h}j ${m}m lagi`;
  };

  return (
    <div className={styles.wrap}>
      {/* Clock & next event */}
      <div className={styles.clockRow}>
        <div className={styles.clock}>
          <div className={styles.clockLabel}>Waktu Sekarang</div>
          <div className={styles.clockTime}>{currentTime || '...'}</div>
        </div>
        {nextEvent && (
          <div className={styles.nextEvent}>
            <div className={styles.nextLabel}>Event Berikutnya</div>
            <div className={styles.nextValue}>
              <span className={`badge ${nextEvent.action === 'ON' ? 'badge-success' : 'badge-danger'}`}>
                AC {nextEvent.action}
              </span>
              <strong>{nextEvent.time}</strong>
              <span className="text-secondary text-sm">— {nextEvent.day}</span>
            </div>
            <div className={styles.nextSub}>
              {nextEvent.label} · {fmtDeltaMin(nextEvent.deltaMin)}
            </div>
          </div>
        )}
      </div>
      <div className={styles.actionRow}>
        <button className="btn btn-primary" style={{ width: '100%', padding: '14px 0' }} onClick={addSchedule} id="add-schedule-btn">
          + Tambah Jadwal
        </button>
        <button
          className={`btn ${mqttConnected ? 'btn-success' : 'btn-ghost'}`}
          style={{ width: '100%', padding: '14px 0' }}
          onClick={() => {
            if (onSyncSchedule) {
              const ok = onSyncSchedule(schedules);
              if (ok) {
                const now = new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' });
                setLastSync(now);
                localStorage.setItem('sus_last_sync', now);
              }
              setSyncStatus(ok ? 'ok' : 'fail');
              setTimeout(() => setSyncStatus(null), 3000);
            }
          }}
          disabled={!mqttConnected}
          title="Kirim jadwal ke ESP32 via MQTT"
          id="sync-schedule-btn"
        >
          {syncStatus === 'ok' ? '✅ Tersync!' : syncStatus === 'fail' ? '❌ Gagal' : '📡 Sync ke ESP32'}
        </button>
      </div>

      {lastSync && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '8px' }}>
          Terakhir sync: {lastSync}
        </div>
      )}

      {!mqttConnected && (
        <div className="alert alert-warning">
          ⚠️ MQTT tidak terhubung. Jadwal akan terpantau tetapi perintah tidak akan terkirim saat offline.
        </div>
      )}

      {/* Schedule list */}
      <div className={styles.list}>
        {schedules.length === 0 && (
          <div className={styles.empty}>
            <div style={{ fontSize: 40 }}>🕐</div>
            <p>Belum ada jadwal. Klik "+ Tambah Jadwal" untuk memulai.</p>
          </div>
        )}

        {schedules.map(sch => (
          <div key={sch.id} className={`${styles.schCard} ${!sch.enabled ? styles.schDisabled : ''}`}>
            {editId === sch.id && editForm ? (
              /* Edit form */
              <div className={styles.editForm}>
                <div className={styles.editRow}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Nama Jadwal</label>
                    <input
                      type="text"
                      className="input"
                      value={editForm.label}
                      onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.editRow}>
                  <div className="input-group">
                    <label>Jam Nyala 🟢</label>
                    <input
                      type="time"
                      className="input"
                      value={editForm.onTime}
                      onChange={e => setEditForm(f => ({ ...f, onTime: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label>Jam Mati 🔴</label>
                    <input
                      type="time"
                      className="input"
                      value={editForm.offTime}
                      onChange={e => setEditForm(f => ({ ...f, offTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: 8 }}>Hari aktif</label>
                  <div className={styles.dayPills}>
                    {DAYS_SHORT.map((d, i) => (
                      <button
                        key={i}
                        className={`${styles.dayPill} ${editForm.days.includes(i) ? styles.dayPillOn : ''}`}
                        onClick={() => toggleDay(i)}
                        type="button"
                      >
                        {d}
                      </button>
                    ))}
                    <button className={`btn btn-ghost ${styles.presetPill}`} onClick={() => setEditForm(f => ({ ...f, days: [0,1,2,3,4] }))} type="button">Weekday</button>
                    <button className={`btn btn-ghost ${styles.presetPill}`} onClick={() => setEditForm(f => ({ ...f, days: [5,6] }))} type="button">Weekend</button>
                    <button className={`btn btn-ghost ${styles.presetPill}`} onClick={() => setEditForm(f => ({ ...f, days: [0,1,2,3,4,5,6] }))} type="button">Setiap Hari</button>
                  </div>
                </div>

                <div className={styles.editActions}>
                  <button className="btn btn-primary" onClick={saveEdit}>✅ Simpan</button>
                  <button className="btn btn-ghost" onClick={() => { setEditId(null); setEditForm(null); }}>Batal</button>
                  <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => deleteSchedule(sch.id)}>🗑️ Hapus</button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className={styles.schView}>
                <div className={styles.schMain}>
                  <div>
                    <div className={styles.schLabel}>{sch.label}</div>
                    <div className={styles.schTimes}>
                      <span className={styles.timeOn}>🟢 {sch.onTime}</span>
                      <span className={styles.timeArrow}>→</span>
                      <span className={styles.timeOff}>🔴 {sch.offTime}</span>
                    </div>
                    <div className={styles.schDays}>
                      {DAYS_SHORT.map((d, i) => (
                        <span key={i} className={`${styles.dayChip} ${sch.days.includes(i) ? styles.dayChipOn : ''}`}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.schActions}>
                  <label className="toggle-wrap">
                    <span className="toggle">
                      <input type="checkbox" checked={sch.enabled} onChange={() => toggleSchedule(sch.id)} />
                      <span className="toggle-slider" />
                    </span>
                  </label>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => startEdit(sch)}>
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Offline scheduling info */}
      <div className={styles.infoCard}>
        <div className={styles.infoTitle}>📡 Cara agar jadwal jalan tanpa browser</div>
        <div className={styles.infoSteps}>
          <div className={styles.infoStep}>
            <span className={styles.infoNum}>1</span>
            <div>
              <strong>Pastikan ESP32 kamu punya WiFi + MQTT + NTP</strong> di firmware (lihat contoh kode di bawah).
              ESP32 subscribe ke topic <code>sus/schedule</code>.
            </div>
          </div>
          <div className={styles.infoStep}>
            <span className={styles.infoNum}>2</span>
            <div>
              Klik <strong>"Sync ke ESP32"</strong> di atas — jadwal dikirim via MQTT sebagai JSON dan disimpan ke
              memori ESP32 (NVS/EEPROM). Koneksi web bisa ditutup setelah sync.
            </div>
          </div>
          <div className={styles.infoStep}>
            <span className={styles.infoNum}>3</span>
            <div>
              ESP32 cek waktu lewat <strong>NTP</strong> setiap menit dan eksekusi jadwal sendiri —
              tanpa perlu web terbuka.
            </div>
          </div>
        </div>
        <div className={styles.infoNote}>
          ⚠️ Tanpa sync ke ESP32, jadwal di web hanya jalan selama browser terbuka dan MQTT terhubung.
        </div>
      </div>
    </div>
  );
}
