'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DayEntry, CycleSummary, ConfigVersion, OtherExpense,
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
  cycle: { id: number; year: number; month: number; start_date: string; end_date: string; config_version_id: number | null };
  entries: DayEntry[];
  summary: CycleSummary;
  config: ConfigVersion;
}

export default function Dashboard() {
  const [currentYM, setCurrentYM] = useState(getCurrentCycleYearMonth());
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [savings, setSavings] = useState<{ balance_at_month_start: number; current_month_variance: number; current_balance: number } | null>(null);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const initialScrollDone = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentCycle = getCurrentCycleYearMonth();
  const maxYM = getNextCycleYearMonth(currentCycle.year, currentCycle.month);
  const canNext = !(currentYM.year === maxYM.year && currentYM.month === maxYM.month);

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const todayStr = dateToString(new Date());

  const fetchConfigVersions = useCallback(async () => {
    try {
      const res = await fetch('/api/config-versions');
      if (res.ok) setConfigVersions(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchCycle = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    initialScrollDone.current = false;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`);
      if (res.status === 404) {
        setNotFound(true);
        setCycleData(null);
        setOtherExpenses([]);
      } else if (res.ok) {
        const data = await res.json();
        setCycleData(data);
        setOtherExpenses(data.summary?.other_expenses ?? []);
      }
    } catch {
      showToast('Gagal ambil data', 'error');
    }
    setLoading(false);
  }, [currentYM.year, currentYM.month]);

  const fetchSavings = useCallback(async () => {
    setSavingsLoading(true);
    setSavings(null); // Clear stale data immediately
    try {
      const res = await fetch(`/api/savings?year=${currentYM.year}&month=${currentYM.month}`);
      if (res.ok) setSavings(await res.json());
    } catch { /* silent */ }
    setSavingsLoading(false);
  }, [currentYM.year, currentYM.month]);

  useEffect(() => {
    fetchCycle();
    fetchSavings();
    fetchConfigVersions();
  }, [fetchCycle, fetchSavings, fetchConfigVersions]);

  useEffect(() => {
    if (cycleData && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setTimeout(() => {
        const el = document.getElementById('today-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // Optimistic update
  const handleUpdateLog = async (id: number, data: { actual_amount?: number | null; is_wfo?: boolean; custom_label?: string | null; custom_budget?: number | null }) => {
    if (!cycleData) return;
    const prevData = cycleData;

    const updatedEntries = cycleData.entries.map(entry => {
      if (entry.id !== id) return entry;
      const updated = { ...entry };
      if (data.actual_amount !== undefined) updated.actual_amount = data.actual_amount;
      if (data.is_wfo !== undefined) updated.is_wfo = data.is_wfo;
      if (data.custom_label !== undefined) updated.custom_label = data.custom_label;
      if (data.custom_budget !== undefined) updated.custom_budget = data.custom_budget;
      return toDayEntry(updated, cycleData.config);
    });

    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
    const newSummary = calculateCycleSummary(updatedEntries, startDate, endDate, cycleData.config, cycleData.summary.other_expenses);

    setCycleData({ ...cycleData, entries: updatedEntries, summary: newSummary });

    // Update savings optimistically
    const oldFilledVar = prevData.entries.filter(e => e.actual_amount !== null && e.variance !== null).reduce((s, e) => s + (e.variance ?? 0), 0);
    const newFilledVar = updatedEntries.filter(e => e.actual_amount !== null && e.variance !== null).reduce((s, e) => s + (e.variance ?? 0), 0);
    const varianceDiff = newFilledVar - oldFilledVar;
    const prevSavings = savings;
    setSavings(prev => prev ? ({
      ...prev,
      current_month_variance: prev.current_month_variance + varianceDiff,
      current_balance: prev.current_balance + varianceDiff,
    }) : null);

    try {
      const res = await fetch(`/api/daily-logs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { setCycleData(prevData); setSavings(prevSavings); showToast('Gagal update', 'error'); }
    } catch { setCycleData(prevData); setSavings(prevSavings); showToast('Gagal update', 'error'); }
  };

  const handleUpdateOtherExpense = async (id: number | null, data: Partial<OtherExpense>) => {
    if (!cycleData) return;

    let updatedExpenses: OtherExpense[];
    let tempExp: OtherExpense | null = null;

    if (id === null) {
      // Add (Optimistic) — prepend with temp random ID
      tempExp = {
        id: Math.random(),
        cycle_id: cycleData.cycle.id,
        category: data.category as 'parking' | 'gas',
        amount: data.amount || 0,
        expense_date: data.expense_date || new Date().toISOString().split('T')[0],
        description: data.description || null,
      };
      updatedExpenses = [tempExp, ...otherExpenses];
    } else {
      // Edit (Optimistic)
      updatedExpenses = otherExpenses.map(e => e.id === id ? { ...e, ...data } : e);
    }

    const prevExpenses = otherExpenses;
    setOtherExpenses(updatedExpenses);

    // Recalculate summary based on new otherExpenses
    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
    const newSummary = calculateCycleSummary(cycleData.entries, startDate, endDate, cycleData.config, updatedExpenses);
    setCycleData(prev => prev ? { ...prev, summary: newSummary } : null);


    try {
      const url = id ? `/api/other-expenses/${id}` : '/api/other-expenses';
      const method = id ? 'PATCH' : 'POST';
      const body = id ? data : { ...data, cycle_id: cycleData.cycle.id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        setOtherExpenses(prevExpenses);
        // Rollback summary as well
        setCycleData(prev => prev ? { ...prev, summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses) } : null);
        showToast('Gagal simpan pengeluaran', 'error');
      } else if (!id && tempExp) {
        // Replace temp ID with real ID from server
        const savedExp = await res.json();
        const tempId = tempExp.id;
        setOtherExpenses(prev => {
          const finalExpenses = prev.map(e => e.id === tempId ? savedExp : e);
          // Update summary with the final expenses
          setCycleData(prevCycle => prevCycle ? { ...prevCycle, summary: calculateCycleSummary(prevCycle.entries, startDate, endDate, prevCycle.config, finalExpenses) } : null);
          return finalExpenses;
        });
      }
    } catch {
      setOtherExpenses(prevExpenses);
      // Rollback summary as well
      const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
      const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
      setCycleData(prev => prev ? { ...prev, summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses) } : null);
      showToast('Gagal simpan pengeluaran', 'error');
    }
  };

  const handleDeleteOtherExpense = async (id: number) => {
    if (!cycleData) return;
    const prevExpenses = otherExpenses;
    const updatedExpenses = prevExpenses.filter(e => e.id !== id);
    setOtherExpenses(updatedExpenses);

    // Recalculate summary based on new otherExpenses
    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
    const newSummary = calculateCycleSummary(cycleData.entries, startDate, endDate, cycleData.config, updatedExpenses);
    setCycleData(prev => prev ? { ...prev, summary: newSummary } : null);

    try {
      const res = await fetch(`/api/other-expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setOtherExpenses(prevExpenses);
        // Rollback summary as well
        setCycleData(prev => prev ? { ...prev, summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses) } : null);
        showToast('Gagal hapus pengeluaran', 'error');
      }
    } catch {
      setOtherExpenses(prevExpenses);
      // Rollback summary as well
      const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
      const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');
      setCycleData(prev => prev ? { ...prev, summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses) } : null);
      showToast('Gagal hapus pengeluaran', 'error');
    }
  };

  const handleDeleteCycle = async () => {
    if (!cycleData) return;
    if (!window.confirm(`Hapus siklus ${getMonthName(currentYM.month)} ${currentYM.year}?\nSemua data harian akan ikut terhapus.`)) return;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`, { method: 'DELETE' });
      if (res.ok) { setCycleData(null); setNotFound(true); fetchSavings(); showToast('Siklus dihapus'); }
      else showToast('Gagal menghapus', 'error');
    } catch { showToast('Gagal menghapus', 'error'); }
  };

  const handleChangeConfigVersion = async (versionId: number) => {
    if (!cycleData) return;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_version_id: versionId }),
      });
      if (res.ok) {
        await fetchCycle();
        await fetchSavings();
        showToast('Config version diubah');
      } else {
        showToast('Gagal mengubah config', 'error');
      }
    } catch { showToast('Gagal mengubah config', 'error'); }
  };

  const goPrev = () => { if (!loading) setCurrentYM(getPrevCycleYearMonth(currentYM.year, currentYM.month)); };
  const goNext = () => { if (canNext && !loading) setCurrentYM(getNextCycleYearMonth(currentYM.year, currentYM.month)); };

  if (!mounted) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  if (showSettings) {
    return <SettingsPage onBack={() => { setShowSettings(false); fetchCycle(); fetchSavings(); fetchConfigVersions(); }} />;
  }

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <span className="app-title">Budget Tracker</span>
          <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
        </div>
        <MonthSelector year={currentYM.year} month={currentYM.month} onPrev={goPrev} onNext={goNext} canNext={canNext} disabled={loading} />
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
            <button className="btn btn-primary create-cycle-btn" onClick={handleCreateCycle} disabled={creating}>
              {creating ? 'Membuat...' : '+ Buat Siklus'}
            </button>
          </div>
        ) : cycleData ? (
          <>
            {/* Config version selector */}
            {configVersions.length > 1 && (
              <div className="config-version-bar">
                <span className="config-version-label">📋 Config:</span>
                <select
                  className="config-version-select"
                  value={cycleData.config.id}
                  onChange={e => handleChangeConfigVersion(parseInt(e.target.value))}
                >
                  {configVersions.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}

            <SummaryCards summary={cycleData.summary} />
            <DailyLogList entries={cycleData.entries} todayDate={todayStr} onUpdate={handleUpdateLog} />
            <SavingsDisplay
              balanceAtMonthStart={savings?.balance_at_month_start ?? 0}
              cycleBudget={cycleData.summary.budget_sum}
              cycleActual={cycleData.summary.actual_sum}
              isLoading={savingsLoading}
            />

            <AdditionalExpenses
              summary={cycleData.summary}
              expenses={otherExpenses}
              cycleId={cycleData.cycle.id}
              onUpdateExpense={handleUpdateOtherExpense}
              onDeleteExpense={handleDeleteOtherExpense}
            />

            <button className="btn btn-danger" onClick={handleDeleteCycle} style={{ width: '100%', marginTop: 8 }}>
              🗑️ Hapus Siklus Ini
            </button>
          </>
        ) : null}
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

/* ====== INLINE SETTINGS PAGE ====== */
function SettingsPage({ onBack }: { onBack: () => void }) {
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [editingVersion, setEditingVersion] = useState<ConfigVersion | null>(null);
  const [newVersionName, setNewVersionName] = useState('');

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchData = async () => {
    try {
      const versionsRes = await fetch('/api/config-versions');
      if (versionsRes.ok) {
        setVersions(await versionsRes.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveVersion = async (version: ConfigVersion) => {
    try {
      const res = await fetch(`/api/config-versions/${version.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(version),
      });
      if (res.ok) {
        showToast(`${version.name} tersimpan!`);
        setEditingVersion(null);
        fetchData();
      } else showToast('Gagal menyimpan', 'error');
    } catch { showToast('Gagal menyimpan', 'error'); }
  };

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    try {
      const res = await fetch('/api/config-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVersionName }),
      });
      if (res.ok) {
        showToast('Versi baru dibuat!');
        setNewVersionName('');
        fetchData();
      } else showToast('Gagal membuat versi', 'error');
    } catch { showToast('Gagal membuat versi', 'error'); }
  };

  const handleDeleteVersion = async (id: number, name: string) => {
    if (!window.confirm(`Hapus "${name}"?`)) return;
    try {
      const res = await fetch(`/api/config-versions/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Versi dihapus'); fetchData(); }
      else {
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus', 'error');
      }
    } catch { showToast('Gagal menghapus', 'error'); }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div className="loading-text">Memuat pengaturan...</div>
      </div>
    );
  }

  const budgetFields = [
    { label: 'Weekday (Sen-Kam)', key: 'weekday_budget' as const },
    { label: 'Weekend (Sab-Min)', key: 'weekend_budget' as const },
    { label: 'Carbo Loading (Jum)', key: 'carbo_loading_budget' as const },
    { label: 'Parkir per hari', key: 'parking_per_day' as const },
    { label: 'Bensin per isi', key: 'gas_per_fill' as const },
    { label: 'Interval isi (hari)', key: 'gas_fill_interval_days' as const },
  ];

  return (
    <>
      <div className="settings-page">
        <div className="settings-header">
          <button className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <h1 className="settings-title">Pengaturan</h1>
        </div>

        {/* Config Versions */}
        <div className="settings-group">
          <div className="settings-group-title">📋 Versi Config Budget</div>

          {versions.map(version => (
            <div className="version-card" key={version.id}>
              <div className="version-header">
                <span className="version-name">{version.name}</span>
                <div className="version-actions">
                  <button className="version-action-btn" onClick={() => setEditingVersion(editingVersion?.id === version.id ? null : { ...version })}>
                    {editingVersion?.id === version.id ? '✕' : '✏️'}
                  </button>
                  {versions.length > 1 && (
                    <button className="version-action-btn danger" onClick={() => handleDeleteVersion(version.id, version.name)}>🗑️</button>
                  )}
                </div>
              </div>

              {editingVersion?.id === version.id ? (
                <div className="version-edit-fields">
                  <div className="settings-field">
                    <span className="settings-field-label">Nama</span>
                    <input
                      className="settings-field-input"
                      type="text"
                      value={editingVersion.name}
                      onChange={e => setEditingVersion({ ...editingVersion, name: e.target.value })}
                    />
                  </div>
                  {budgetFields.map(f => (
                    <div className="settings-field" key={f.key}>
                      <span className="settings-field-label">{f.label}</span>
                      {f.key === 'gas_fill_interval_days' ? (
                        <input
                          className="settings-field-input"
                          type="number"
                          inputMode="numeric"
                          value={editingVersion[f.key] as number}
                          onChange={e => setEditingVersion({ ...editingVersion, [f.key]: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <RupiahInput
                          className="settings-field-input"
                          value={editingVersion[f.key] as number}
                          onChange={v => setEditingVersion({ ...editingVersion, [f.key]: v })}
                        />
                      )}
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={() => handleSaveVersion(editingVersion)} style={{ width: '100%', marginTop: 8 }}>
                    Simpan {editingVersion.name}
                  </button>
                </div>
              ) : (
                <div className="version-summary">
                  {budgetFields.map(f => (
                    <div className="version-summary-row" key={f.key}>
                      <span>{f.label}</span>
                      <span>{f.key === 'gas_fill_interval_days' ? `${version[f.key]} hari` : `Rp${(version[f.key] as number).toLocaleString('id-ID')}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Create new version */}
          <div className="new-version-bar">
            <input
              className="new-version-input"
              type="text"
              placeholder="Nama versi baru..."
              value={newVersionName}
              onChange={e => setNewVersionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateVersion()}
            />
            <button className="btn btn-primary" onClick={handleCreateVersion} disabled={!newVersionName.trim()}>
              + Buat
            </button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
