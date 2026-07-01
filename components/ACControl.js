'use client';
import { useState } from 'react';
import styles from './ACControl.module.css';

export default function ACControl({ acStatus, mqttConnected, onCommand, pzem }) {
  const [cmdSent, setCmdSent] = useState(null);
  const [pending, setPending] = useState(false);

  const handleCmd = (cmd) => {
    if (!mqttConnected || pending) return;
    setPending(true);
    setCmdSent(cmd);
    onCommand(cmd);
    setTimeout(() => setPending(false), 2000);
  };

  const isOn = acStatus === 'on';
  const isOff = acStatus === 'off';

  return (
    <div className={styles.wrap}>
      {/* Main control */}
      <div className={styles.controlCenter}>
          {/* AC Unit visual */}
          <div className={`${styles.acUnit} ${isOn ? styles.acUnitOn : ''}`}>
            <div className={styles.acBrand}>
              <div className={`${styles.statusDot} ${isOn ? styles.dotOn : isOff ? styles.dotOff : ''}`} />
              AC {isOn ? 'MENYALA' : isOff ? 'MATI' : 'UNKNOWN'}
            </div>
            <div className={styles.acDisplay}>
              <span>{isOn ? '🌡️ ON' : '·'}</span>
              {pzem.power !== null && isOn && (
                <span className={styles.acWatt}>{pzem.power.toFixed(0)}W</span>
              )}
            </div>
            <div className={styles.acVents}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`${styles.acVent} ${isOn ? styles.acVentOn : ''}`}
                  style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>

        {/* Control Buttons */}
        <div className={styles.controls}>
          {!mqttConnected && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              MQTT tidak terhubung. Sambungkan broker terlebih dahulu.
            </div>
          )}

          <div className={styles.btnGroup}>
            <button
              id="ac-on-btn"
              className={`${styles.bigBtn} ${styles.btnOn} ${isOn ? styles.btnActive : ''}`}
              onClick={() => handleCmd('on')}
              disabled={!mqttConnected || pending || isOn}
            >
              <span className={styles.bigBtnIcon}>❄️</span>
              <span className={styles.bigBtnLabel}>Nyalakan AC</span>
              <span className={styles.bigBtnSub}>Kirim IR ON + Relay ON</span>
            </button>

            <button
              id="ac-off-btn"
              className={`${styles.bigBtn} ${styles.btnOff} ${isOff ? styles.btnActive : ''}`}
              onClick={() => handleCmd('off')}
              disabled={!mqttConnected || pending || isOff}
            >
              <span className={styles.bigBtnIcon}>⏹️</span>
              <span className={styles.bigBtnLabel}>Matikan AC</span>
              <span className={styles.bigBtnSub}>Kirim IR OFF + Relay OFF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live stats */}
      {pzem.power !== null && (
        <div className={styles.liveStats}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Tegangan</div>
            <div className={styles.statVal}>{pzem.voltage?.toFixed(1)} V</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Arus</div>
            <div className={styles.statVal}>{pzem.current?.toFixed(2)} A</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Daya</div>
            <div className={styles.statVal}>{pzem.power?.toFixed(1)} W</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <div className={styles.statLabel}>PF</div>
            <div className={styles.statVal}>{pzem.pf?.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Last command feedback */}
      {cmdSent && (
        <div className={`alert ${pending ? 'alert-info' : 'alert-success'} animate-fade-in`}>
          {pending ? (
            <><div className="spinner" />Mengirim perintah <strong>{cmdSent}</strong> ke ESP32...</>
          ) : (
            <><svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            Perintah <strong>{cmdSent}</strong> berhasil dikirim!</>
          )}
        </div>
      )}
    </div>
  );
}
