'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MqttModal from '@/components/MqttModal';
import RealtimeCards from '@/components/RealtimeCards';
import ACControl from '@/components/ACControl';
import CostTracker from '@/components/CostTracker';
import EnergyChart from '@/components/EnergyChart';
import Scheduler from '@/components/Scheduler';
import AlertBanner from '@/components/AlertBanner';
import styles from './dashboard.module.css';

const TOPIC_PZEM    = 'sus/pzem';
const TOPIC_STATUS  = 'sus/status';
const TOPIC_COMMAND = 'sus/command';
const TOPIC_SCHEDULE = 'sus/schedule';

export default function DashboardPage() {
  const router = useRouter();
  const [showMqttModal, setShowMqttModal] = useState(true);
  const [mqttClient, setMqttClient]       = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [activeTab, setActiveTab]         = useState('monitor');

  const [pzem, setPzem] = useState({
    voltage: null, current: null, power: null,
    energy: null, frequency: null, pf: null,
    lastUpdate: null,
  });
  const [acStatus, setAcStatus]             = useState('unknown');
  const [dataHistory, setDataHistory]       = useState([]);
  const [electricityRate, setElectricityRate] = useState(1699.53);
  const [alerts, setAlerts]                 = useState([]);

  const historyRef             = useRef([]);
  const sessionEnergyStartRef  = useRef(null);
  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || 'SMART AC';

  /* ── MQTT connect ─────────────────────────────────────────── */
  const handleMqttConnected = useCallback((client) => {
    setMqttClient(client);
    setMqttConnected(true);
    setShowMqttModal(false);

    fetch('/api/mqtt-config')
      .then(r => r.json())
      .then(d => { if (d.rate) setElectricityRate(d.rate); })
      .catch(() => {});

    client.on('message', (topic, payload) => {
      const msg = payload.toString().trim();

      if (topic === TOPIC_PZEM) {
        const parts = msg.split(',').map(Number);
        if (parts.length >= 6) {
          const [v, c, p, e, f, pf] = parts;
          if (!isNaN(v) && v > 0) {
            const now = Date.now();
            const point = { time: now, power: p, energy: e };
            historyRef.current = [...historyRef.current.slice(-2879), point]; // 48h @ 1min
            setDataHistory([...historyRef.current]);
            if (sessionEnergyStartRef.current === null) sessionEnergyStartRef.current = e;
            setPzem({ voltage: v, current: c, power: p, energy: e, frequency: f, pf: parseFloat(pf.toFixed(2)), lastUpdate: new Date() });
            if (p > 10) setAcStatus('on');
          }
        }
      }

      if (topic === TOPIC_STATUS) {
        const s = msg.toLowerCase();
        if (s === 'on'  || s === '1' || s === 'true')  setAcStatus('on');
        if (s === 'off' || s === '0' || s === 'false') setAcStatus('off');
      }
    });

    client.on('close',     () => { setMqttConnected(false); setAcStatus('unknown'); });
    client.on('reconnect', () => setMqttConnected(false));
    client.on('connect',   () => setMqttConnected(true));
  }, []);

  /* ── Commands ─────────────────────────────────────────────── */
  const sendCommand = useCallback((cmd) => {
    if (!mqttClient || !mqttConnected) return;
    mqttClient.publish(TOPIC_COMMAND, cmd, { qos: 1 }, (err) => {
      if (!err) {
        if (cmd === 'on')  setAcStatus('on');
        if (cmd === 'off') setAcStatus('off');
      }
    });
  }, [mqttClient, mqttConnected]);

  // Push schedule JSON ke ESP32 via MQTT
  const syncSchedule = useCallback((schedules) => {
    if (!mqttClient || !mqttConnected) return false;
    const payload = JSON.stringify(schedules);
    mqttClient.publish(TOPIC_SCHEDULE, payload, { qos: 1, retain: true });
    return true;
  }, [mqttClient, mqttConnected]);

  const handleReconnect = () => {
    if (mqttClient) { mqttClient.end(true); setMqttClient(null); }
    setMqttConnected(false);
    setShowMqttModal(true);
  };

  const handleLogout = async () => {
    if (mqttClient) mqttClient.end(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const sessionEnergyUsed = pzem.energy !== null && sessionEnergyStartRef.current !== null
    ? Math.max(0, pzem.energy - sessionEnergyStartRef.current) : 0;

  const tabs = [
    { id: 'monitor',  label: 'Monitor',  icon: '⚡' },
    { id: 'control',  label: 'Kontrol',  icon: '🎮' },
    { id: 'cost',     label: 'Biaya',    icon: '💰' },
    { id: 'schedule', label: 'Jadwal',   icon: '🕐' },
    { id: 'history',  label: 'Riwayat',  icon: '📊' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <>
      {showMqttModal && <MqttModal onConnected={handleMqttConnected} />}

      <div className={styles.app}>

        {/* ── Desktop sidebar ────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.connStatus}>
            <div className={`${styles.connDot} ${mqttConnected ? styles.connOn : styles.connOff}`}/>
            <span className="text-xs text-secondary">
              {mqttConnected ? 'MQTT Terhubung' : 'Tidak terhubung'}
            </span>
            {!mqttConnected && (
              <button className={styles.reconnectBtn} onClick={handleReconnect}>Hubungkan</button>
            )}
          </div>

          <nav className={styles.nav}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.navIcon}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className={styles.sidebarSpacer}/>

          <div className={styles.acStatusCard}>
            <div className={styles.acStatusLabel}>Status AC</div>
            <div className={`${styles.acStatusValue} ${acStatus === 'on' ? styles.acOn : acStatus === 'off' ? styles.acOff : styles.acUnknown}`}>
              <div className={`${styles.acDot} ${acStatus === 'on' ? styles.acDotOn : ''}`}/>
              {acStatus === 'on' ? 'NYALA' : acStatus === 'off' ? 'MATI' : 'UNKNOWN'}
            </div>
            {pzem.power !== null && <div className={styles.acPower}>{pzem.power.toFixed(1)} W</div>}
          </div>

          <button className={styles.logoutBtn} onClick={handleLogout} id="logout-btn">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Keluar
          </button>
        </aside>

        {/* ── Main ───────────────────────────────────── */}
        <main className={styles.main}>

          {/* Mobile topbar */}
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <div>
                <h1 className={styles.appTitleMetallic}>{appTitle}</h1>
                <div className={styles.pageSubtitle}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeTabData?.icon} {activeTabData?.label}</span>
                  <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                  <span>
                    {pzem.lastUpdate
                      ? `${pzem.lastUpdate.toLocaleTimeString('id-ID')}`
                      : mqttConnected ? 'Menunggu data...' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.topbarRight}>
              <div className={`badge ${mqttConnected ? 'badge-success' : 'badge-danger'}`}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/>
                {mqttConnected ? 'Live' : 'Offline'}
              </div>
              <button className={styles.mobileMenuBtn} onClick={handleLogout} title="Logout">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </header>

          {alerts.map(a => (
            <AlertBanner key={a.id} alert={a} onClose={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}/>
          ))}

          <div className={styles.content}>
            {activeTab === 'monitor'  && <RealtimeCards pzem={pzem} acStatus={acStatus} rate={electricityRate}/>}
            {activeTab === 'control'  && <ACControl acStatus={acStatus} mqttConnected={mqttConnected} onCommand={sendCommand} pzem={pzem}/>}
            {activeTab === 'cost'     && <CostTracker pzem={pzem} rate={electricityRate} onRateChange={setElectricityRate} sessionEnergy={sessionEnergyUsed} history={dataHistory}/>}
            {activeTab === 'schedule' && <Scheduler mqttConnected={mqttConnected} onCommand={sendCommand} acStatus={acStatus} onSyncSchedule={syncSchedule}/>}
            {activeTab === 'history'  && <EnergyChart history={dataHistory} rate={electricityRate}/>}
          </div>

          {/* ── Mobile bottom nav ───────────────────── */}
          <nav className={styles.bottomNav}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`${styles.bottomNavItem} ${activeTab === tab.id ? styles.bottomNavActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.bottomNavIcon}>{tab.icon}</span>
                <span className={styles.bottomNavLabel}>{tab.label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>
    </>
  );
}
