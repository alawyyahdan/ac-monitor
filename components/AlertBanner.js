'use client';
import styles from './AlertBanner.module.css';

export default function AlertBanner({ alert, onClose }) {
  const typeMap = {
    warning: { class: 'alert-warning', icon: '⚠️' },
    error: { class: 'alert-error', icon: '🚨' },
    success: { class: 'alert-success', icon: '✅' },
    info: { class: 'alert-info', icon: 'ℹ️' },
  };

  const t = typeMap[alert.type] || typeMap.info;

  return (
    <div className={`alert ${t.class} ${styles.banner} animate-fade-in`}>
      <span>{t.icon}</span>
      <span style={{ flex: 1 }}>{alert.message}</span>
      <button className={styles.close} onClick={onClose}>×</button>
    </div>
  );
}
