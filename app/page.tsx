'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMonthName } from '@/lib/budget-utils';
import AdditionalExpenses from './components/AdditionalExpenses';
import DailyLogList from './components/DailyLogList';
import MonthSelector from './components/MonthSelector';
import SavingsDisplay from './components/SavingsDisplay';
import SettingsPage from './components/SettingsPage';
import SummaryCards from './components/SummaryCards';
import { useCycleData } from './hooks/useCycleData';
import { useToast } from './hooks/useToast';

export default function Dashboard() {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const { toast, showToast } = useToast();
  const dashboard = useCycleData(showToast);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  if (showSettings) {
    return <SettingsPage onBack={() => { setShowSettings(false); void dashboard.fetchCycle(); }} />;
  }

  const {
    currentYM,
    cycleData,
    otherExpenses,
    savings,
    savingsLoading,
    configVersions,
    loading,
    notFound,
    creating,
    canNext,
    todayStr,
    handleCreateCycle,
    handleUpdateLog,
    handleUpdateOtherExpense,
    handleDeleteOtherExpense,
    handleDeleteCycle,
    handleChangeConfigVersion,
    goPrev,
    goNext,
    goToMonth,
  } = dashboard;

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <span className="app-title">Budget Tracker</span>
          <div className="header-actions">
            <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
            <button className="settings-btn" onClick={handleLogout} aria-label="Logout">⏻</button>
          </div>
        </div>
        <MonthSelector year={currentYM.year} month={currentYM.month} onPrev={goPrev} onNext={goNext} onChange={goToMonth} canNext={canNext} disabled={loading} />
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
            {configVersions.length > 1 && (
              <div className="config-version-bar">
                <label className="config-version-label" htmlFor="config-version">📋 Config:</label>
                <select
                  id="config-version"
                  className="config-version-select"
                  value={cycleData.config.id}
                  onChange={event => handleChangeConfigVersion(parseInt(event.target.value))}
                >
                  {configVersions.map(version => (
                    <option key={version.id} value={version.id}>{version.name}</option>
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
              operationalCash={cycleData.operationalCash ?? null}
              cycleId={cycleData.cycle.id}
              onUpdateExpense={handleUpdateOtherExpense}
              onDeleteExpense={handleDeleteOtherExpense}
            />

            <button className="btn btn-danger full-width with-top-gap" onClick={handleDeleteCycle}>
              🗑️ Hapus Siklus Ini
            </button>
          </>
        ) : null}
      </main>

      {toast && <div className={`toast ${toast.type}`} role="status">{toast.msg}</div>}
    </>
  );
}
