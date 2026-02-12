'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DayEntry, CycleSummary, Config,
  getCurrentCycleYearMonth, getPrevCycleYearMonth, getNextCycleYearMonth,
  getMonthName, dateToString, toDayEntry, calculateCycleSummary,
} from '@/lib/budget-utils';
import MonthSelector from './components/MonthSelector';
import SummaryCards from './components/SummaryCards';
import DailyLogList from './components/DailyLogList';
import AdditionalExpenses from './components/AdditionalExpenses';
import SavingsDisplay from './components/SavingsDisplay';
import RupiahInput from './components/RupiahInput';

interface CycleData {
  cycle: { id: number; year: number; month: number; start_date: string; end_date: string };
  entries: DayEntry[];
  summary: CycleSummary;
  config: Config;
}

export default function Dashboard() {
  const [currentYM, setCurrentYM] = useState(getCurrentCycleYearMonth());
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [savings, setSavings] = useState({ initial_savings: 0, filled_variance: 0, total_savings: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const initialScrollDone = useRef(false);

  // Max next month: 1 month ahead of current cycle
  const currentCycle = getCurrentCycleYearMonth();
  const maxYM = getNextCycleYearMonth(currentCycle.year, currentCycle.month);
  const canNext = !(currentYM.year === maxYM.year && currentYM.month === maxYM.month);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const todayStr = dateToString(new Date());

  const fetchCycle = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    initialScrollDone.current = false;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`);
      if (res.status === 404) {
        setNotFound(true);
        setCycleData(null);
      } else if (res.ok) {
        const data = await res.json();
        setCycleData(data);
      }
    } catch {
      showToast('Gagal ambil data', 'error');
    }
    setLoading(false);
  }, [currentYM.year, currentYM.month]);

  const fetchSavings = useCallback(async () => {
    try {
      const res = await fetch('/api/savings');
      if (res.ok) {
        const data = await res.json();
        setSavings(data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCycle();
    fetchSavings();
  }, [fetchCycle, fetchSavings]);

  // Auto-scroll to today only on first load (not on every state update)
  useEffect(() => {
    if (cycleData && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setTimeout(() => {
        const el = document.getElementById('today-card');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [cycleData]);

  const handleCreateCycle = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: currentYM.year, month: currentYM.month }),
      });
      if (res.ok || res.status === 409) {
        await fetchCycle();
        showToast(`${getMonthName(currentYM.month)} ${currentYM.year} dibuat!`);
      } else {
        showToast('Gagal membuat siklus', 'error');
      }
    } catch {
      showToast('Gagal membuat siklus', 'error');
    }
    setCreating(false);
  };

  // Optimistic update: update UI instantly, sync to server in background
  const handleUpdateLog = async (id: number, data: { actual_amount?: number | null; is_wfo?: boolean }) => {
    if (!cycleData) return;

    // Save previous state for rollback
    const prevData = cycleData;

    // Optimistically update entries
    const updatedEntries = cycleData.entries.map(entry => {
      if (entry.id !== id) return entry;
      const updated = { ...entry };
      if (data.actual_amount !== undefined) updated.actual_amount = data.actual_amount;
      if (data.is_wfo !== undefined) updated.is_wfo = data.is_wfo;
      // Recompute this entry with the config
      return toDayEntry(updated, cycleData.config);
    });

    // Recalculate summary locally
    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
    const newSummary = calculateCycleSummary(updatedEntries, startDate, endDate, cycleData.config);

    // Update state immediately (no reload!)
    setCycleData({
      ...cycleData,
      entries: updatedEntries,
      summary: newSummary,
    });

    // Update savings optimistically — compute filled variance diff
    const oldFilledVar = prevData.entries
      .filter(e => e.actual_amount !== null && e.variance !== null)
      .reduce((sum, e) => sum + (e.variance ?? 0), 0);
    const newFilledVar = updatedEntries
      .filter(e => e.actual_amount !== null && e.variance !== null)
      .reduce((sum, e) => sum + (e.variance ?? 0), 0);
    const varianceDiff = newFilledVar - oldFilledVar;
    const prevSavings = savings;
    setSavings(prev => ({
      ...prev,
      filled_variance: prev.filled_variance + varianceDiff,
      total_savings: prev.total_savings + varianceDiff,
    }));

    // Send to server in background
    try {
      const res = await fetch(`/api/daily-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        // Rollback on failure
        setCycleData(prevData);
        setSavings(prevSavings);
        showToast('Gagal update', 'error');
      }
    } catch {
      // Rollback on network error
      setCycleData(prevData);
      setSavings(prevSavings);
      showToast('Gagal update', 'error');
    }
  };

  const handleDeleteCycle = async () => {
    if (!cycleData) return;
    const confirmed = window.confirm(
      `Hapus siklus ${getMonthName(currentYM.month)} ${currentYM.year}?\nSemua data harian akan ikut terhapus.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCycleData(null);
        setNotFound(true);
        fetchSavings();
        showToast('Siklus dihapus');
      } else {
        showToast('Gagal menghapus', 'error');
      }
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  const goPrev = () => setCurrentYM(getPrevCycleYearMonth(currentYM.year, currentYM.month));
  const goNext = () => {
    if (canNext) setCurrentYM(getNextCycleYearMonth(currentYM.year, currentYM.month));
  };

  // Settings page
  if (showSettings) {
    return <SettingsPage onBack={() => { setShowSettings(false); fetchCycle(); fetchSavings(); }} />;
  }

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <span className="app-title">Budget Tracker</span>
          <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            ⚙️
          </button>
        </div>
        <MonthSelector
          year={currentYM.year}
          month={currentYM.month}
          onPrev={goPrev}
          onNext={goNext}
          canNext={canNext}
        />
      </header>

      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <div className="loading-text">Memuat data...</div>
          </div>
        ) : notFound ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">{getMonthName(currentYM.month)} {currentYM.year}</div>
            <div className="empty-desc">Siklus bulan ini belum dibuat. Buat sekarang?</div>
            <button
              className="btn btn-primary create-cycle-btn"
              onClick={handleCreateCycle}
              disabled={creating}
            >
              {creating ? 'Membuat...' : '+ Buat Siklus'}
            </button>
          </div>
        ) : cycleData ? (
          <>
            <SummaryCards summary={cycleData.summary} />

            <DailyLogList
              entries={cycleData.entries}
              todayDate={todayStr}
              onUpdate={handleUpdateLog}
            />

            <AdditionalExpenses summary={cycleData.summary} />
            <SavingsDisplay
              initialSavings={savings.initial_savings}
              filledVariance={savings.filled_variance}
              totalSavings={savings.total_savings}
            />

            <button
              className="btn btn-danger"
              onClick={handleDeleteCycle}
              style={{ width: '100%', marginTop: 8 }}
            >
              🗑️ Hapus Siklus Ini
            </button>
          </>
        ) : null}
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
}

/* ====== INLINE SETTINGS PAGE ====== */
function SettingsPage({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState({
    weekday_budget: 80000,
    weekend_budget: 70000,
    carbo_loading_budget: 115000,
    parking_per_day: 5000,
    gas_per_fill: 50000,
    gas_fill_interval_days: 3,
    initial_savings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('Pengaturan tersimpan!');
      } else {
        showToast('Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Gagal menyimpan', 'error');
    }
    setSaving(false);
  };

  const updateField = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div className="loading-text">Memuat pengaturan...</div>
      </div>
    );
  }

  const fields = [
    {
      group: 'Budget Harian', items: [
        { label: 'Weekday (Sen-Kam)', key: 'weekday_budget', rupiah: true },
        { label: 'Weekend (Sab-Min)', key: 'weekend_budget', rupiah: true },
        { label: 'Carbo Loading (Jum)', key: 'carbo_loading_budget', rupiah: true },
      ]
    },
    {
      group: 'Transportasi', items: [
        { label: 'Parkir per hari', key: 'parking_per_day', rupiah: true },
        { label: 'Bensin per isi', key: 'gas_per_fill', rupiah: true },
        { label: 'Interval isi (hari)', key: 'gas_fill_interval_days', rupiah: false },
      ]
    },
    {
      group: 'Tabungan', items: [
        { label: 'Saldo awal', key: 'initial_savings', rupiah: true },
      ]
    },
  ];

  return (
    <>
      <div className="settings-page">
        <div className="settings-header">
          <button className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <h1 className="settings-title">Pengaturan</h1>
        </div>

        {fields.map(group => (
          <div className="settings-group" key={group.group}>
            <div className="settings-group-title">{group.group}</div>
            {group.items.map(item => (
              <div className="settings-field" key={item.key}>
                <span className="settings-field-label">{item.label}</span>
                {item.rupiah ? (
                  <RupiahInput
                    className="settings-field-input"
                    value={config[item.key as keyof typeof config]}
                    onChange={v => setConfig(prev => ({ ...prev, [item.key]: v }))}
                  />
                ) : (
                  <input
                    className="settings-field-input"
                    type="number"
                    inputMode="numeric"
                    value={config[item.key as keyof typeof config]}
                    onChange={e => updateField(item.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="settings-save-bar">
          <button
            className="btn btn-primary settings-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
