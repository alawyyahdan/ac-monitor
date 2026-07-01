'use client';
import { useState, useEffect } from 'react';
import styles from './MqttModal.module.css';

const TOPIC_PZEM = 'sus/pzem';
const TOPIC_STATUS = 'sus/status';
const TOPIC_COMMAND = 'sus/command';
const STORAGE_KEY = 'sus_mqtt_config';

async function doConnect(config, onConnected, setStep, setError, setConnecting) {
  setConnecting(true);
  setError('');
  setStep('connecting');

  try {
    const mqtt = (await import('mqtt')).default;

    const protocol = config.useSSL ? 'wss' : 'ws';
    // Kalau port dikosongkan, jangan tambahkan port ke URL sama sekali
    const brokerUrl = config.port
      ? `${protocol}://${config.host}:${config.port}/mqtt`
      : `${protocol}://${config.host}/mqtt`;

    const client = mqtt.connect(brokerUrl, {
      username: config.username || undefined,
      password: config.password || undefined,
      clientId: `sus_web_${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      clean: true,
    });

    const timeout = setTimeout(() => {
      client.end(true);
      setError('Koneksi timeout — periksa host dan pastikan broker aktif');
      setStep('config');
      setConnecting(false);
    }, 12000);

    client.on('connect', () => {
      clearTimeout(timeout);
      client.subscribe([TOPIC_PZEM, TOPIC_STATUS], { qos: 0 });
      // Simpan config ke localStorage agar auto-connect berikutnya
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setStep('done');
      setConnecting(false);
      setTimeout(() => onConnected(client, config), 600);
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      client.end(true);
      setError(`Koneksi gagal: ${err.message}`);
      setStep('config');
      setConnecting(false);
    });

  } catch (err) {
    setError(`Error: ${err.message}`);
    setStep('config');
    setConnecting(false);
  }
}

export default function MqttConnectModal({ onConnected }) {
  const [config, setConfig] = useState({
    host: '',
    port: '',        // kosong = pakai default otomatis
    username: '',
    password: '',
    useSSL: false,
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('loading'); // loading | autoconnect | config | connecting | done

  useEffect(() => {
    // 1. Cek apakah ada config tersimpan di localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        setConfig(savedConfig);
        // Auto-connect langsung tanpa tampilkan form
        setStep('autoconnect');
        doConnect(savedConfig, onConnected, setStep, setError, setConnecting);
        return;
      } catch { /* ignore, fallthrough ke fetch config */ }
    }

    // 2. Tidak ada saved config, fetch dari server
    fetch('/api/mqtt-config')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError('Sesi habis, silakan login ulang');
          setStep('config');
          return;
        }
        const serverConfig = {
          host: data.host,
          port: data.port || '',
          username: data.username,
          password: data.password,
          useSSL: data.useSSL,
        };
        setConfig(serverConfig);
        setStep('config');
      })
      .catch(() => {
        setError('Gagal mengambil konfigurasi server');
        setStep('config');
      });
  }, []);

  const handleConnect = () => {
    if (!config.host) {
      setError('Host MQTT tidak boleh kosong');
      return;
    }
    doConnect(config, onConnected, setStep, setError, setConnecting);
  };

  const handleForget = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep('config');
    setError('');
  };

  const portPlaceholder = config.useSSL ? '8884 (default WSS)' : '8083 (default WS)';

  return (
    <div className="modal-overlay">
      <div className="modal-box animate-scale-in" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
            </svg>
          </div>
          <div>
            <h2 className={styles.title}>Hubungkan ke MQTT Broker</h2>
            <p className={styles.subtitle}>Diperlukan untuk menerima data real-time dari ESP32</p>
          </div>
        </div>

        <div className="divider" />

        {/* Auto-connecting (ada saved config) */}
        {(step === 'loading' || step === 'autoconnect') && (
          <div className={styles.connectingState}>
            <div className={styles.waveWrap}>
              <div className={styles.wave} />
              <div className={styles.wave} style={{ animationDelay: '0.3s' }} />
              <div className={styles.wave} style={{ animationDelay: '0.6s' }} />
              <div className={styles.waveCenter}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
              </div>
            </div>
            <p className={styles.connectingText}>
              {step === 'autoconnect' ? 'Auto-connecting...' : 'Mengambil konfigurasi...'}
            </p>
            {config.host && (
              <p className="text-muted text-sm">{config.host}</p>
            )}
            {step === 'autoconnect' && (
              <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={handleForget}>
                Ubah konfigurasi
              </button>
            )}
          </div>
        )}

        {/* Manual connecting */}
        {step === 'connecting' && (
          <div className={styles.connectingState}>
            <div className={styles.waveWrap}>
              <div className={styles.wave} />
              <div className={styles.wave} style={{ animationDelay: '0.3s' }} />
              <div className={styles.wave} style={{ animationDelay: '0.6s' }} />
              <div className={styles.waveCenter}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
                </svg>
              </div>
            </div>
            <p className={styles.connectingText}>Menghubungkan ke broker...</p>
            <p className="text-muted text-sm">{config.host}{config.port ? `:${config.port}` : ''}</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className={styles.doneState}>
            <div className={styles.checkCircle}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className={styles.connectingText} style={{ color: 'var(--accent-green)' }}>Terhubung!</p>
            <p className="text-muted text-sm">Membuka dashboard...</p>
          </div>
        )}

        {/* Config form */}
        {step === 'config' && (
          <div className={styles.form}>
            {error && (
              <div className="alert alert-error">
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            {/* Host saja (full width), port opsional di bawah */}
            <div className="input-group">
              <label htmlFor="mqtt-host">Host / IP Broker <span className={styles.required}>*</span></label>
              <input
                id="mqtt-host"
                type="text"
                className="input"
                placeholder="broker.example.com"
                value={config.host}
                onChange={e => setConfig(c => ({ ...c, host: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Port opsional */}
            <div className="input-group">
              <label htmlFor="mqtt-port">
                Port <span className={styles.optional}>(opsional)</span>
              </label>
              <input
                id="mqtt-port"
                type="number"
                className="input"
                placeholder={portPlaceholder}
                value={config.port}
                onChange={e => setConfig(c => ({ ...c, port: e.target.value ? parseInt(e.target.value) : '' }))}
              />
            </div>

            <div className={styles.row}>
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="mqtt-user">Username <span className={styles.optional}>(opsional)</span></label>
                <input
                  id="mqtt-user"
                  type="text"
                  className="input"
                  placeholder="mqtt_user"
                  value={config.username}
                  onChange={e => setConfig(c => ({ ...c, username: e.target.value }))}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label htmlFor="mqtt-pass">Password <span className={styles.optional}>(opsional)</span></label>
                <input
                  id="mqtt-pass"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={config.password}
                  onChange={e => setConfig(c => ({ ...c, password: e.target.value }))}
                />
              </div>
            </div>

            <label className="toggle-wrap">
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={config.useSSL}
                  onChange={e => setConfig(c => ({ ...c, useSSL: e.target.checked }))}
                />
                <span className="toggle-slider" />
              </span>
              <span className="text-sm text-secondary">Gunakan SSL/TLS (WSS)</span>
            </label>

            <div className={styles.topicsInfo}>
              <p className="text-xs text-muted" style={{ marginBottom: 6 }}>Topics yang digunakan:</p>
              <div className={styles.topicList}>
                <span className={styles.topic}>{TOPIC_PZEM}</span>
                <span className={styles.topic}>{TOPIC_STATUS}</span>
                <span className={styles.topic}>{TOPIC_COMMAND} (publish)</span>
              </div>
            </div>

            <button
              id="mqtt-connect-btn"
              className="btn btn-primary btn-lg w-full"
              onClick={handleConnect}
              disabled={connecting || !config.host}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
              </svg>
              Hubungkan ke Broker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
