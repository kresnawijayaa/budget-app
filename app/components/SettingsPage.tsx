'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppSettings, ConfigVersion, getCurrentCycleYearMonth, getMonthName } from '@/lib/budget-utils';
import RupiahInput from './RupiahInput';
import { useToast } from '../hooks/useToast';

interface SettingsPageProps {
  onBack: () => void;
}

const budgetFields = [
  { label: 'Weekday (Sen-Kam)', key: 'weekday_budget' as const },
  { label: 'Weekend (Sab-Min)', key: 'weekend_budget' as const },
  { label: 'Carbo Loading (Jum)', key: 'carbo_loading_budget' as const },
  { label: 'Parkir per hari', key: 'parking_per_day' as const },
  { label: 'Bensin per isi', key: 'gas_per_fill' as const },
  { label: 'Interval isi (hari)', key: 'gas_fill_interval_days' as const },
];

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const currentCycle = getCurrentCycleYearMonth();

function formatConfigPeriod(version: ConfigVersion): string {
  if (!version.year || !version.month) return 'Periode belum diisi';
  return `${getMonthName(version.month)} ${version.year}`;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVersion, setEditingVersion] = useState<ConfigVersion | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ initial_savings: 0, initial_cash: 0 });
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionYear, setNewVersionYear] = useState(currentCycle.year);
  const [newVersionMonth, setNewVersionMonth] = useState(currentCycle.month);
  const { toast, showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [versionsRes, settingsRes] = await Promise.all([
        fetch('/api/config-versions'),
        fetch('/api/config'),
      ]);
      if (versionsRes.ok) setVersions(await versionsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch {
      showToast('Gagal memuat pengaturan', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

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
        void fetchData();
      } else {
        showToast('Gagal menyimpan', 'error');
      }
    } catch {
      showToast('Gagal menyimpan', 'error');
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    try {
      const res = await fetch('/api/config-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVersionName, year: newVersionYear, month: newVersionMonth }),
      });
      if (res.ok) {
        showToast('Versi baru dibuat!');
        setNewVersionName('');
        void fetchData();
      } else {
        showToast('Gagal membuat versi', 'error');
      }
    } catch {
      showToast('Gagal membuat versi', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettings(await res.json());
        showToast('Saldo awal tersimpan');
      } else {
        showToast('Gagal menyimpan saldo awal', 'error');
      }
    } catch {
      showToast('Gagal menyimpan saldo awal', 'error');
    }
  };

  const handleDeleteVersion = async (id: number, name: string) => {
    if (!window.confirm(`Hapus "${name}"?`)) return;
    try {
      const res = await fetch(`/api/config-versions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Versi dihapus');
        void fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus', 'error');
      }
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div className="loading-text">Memuat pengaturan...</div>
      </div>
    );
  }

  return (
    <>
      <div className="settings-page">
        <div className="settings-header">
          <button className="back-btn" onClick={onBack} aria-label="Kembali">←</button>
          <h1 className="settings-title">Pengaturan</h1>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">Saldo Awal</div>
          <div className="settings-field">
            <label className="settings-field-label" htmlFor="initial-savings">Saldo rekening awal</label>
            <RupiahInput
              id="initial-savings"
              className="settings-field-input"
              value={settings.initial_savings}
              onChange={value => setSettings(prev => ({ ...prev, initial_savings: value ?? 0 }))}
            />
          </div>
          <div className="settings-field">
            <label className="settings-field-label" htmlFor="initial-cash">Saldo cash awal</label>
            <RupiahInput
              id="initial-cash"
              className="settings-field-input"
              value={settings.initial_cash}
              onChange={value => setSettings(prev => ({ ...prev, initial_cash: value ?? 0 }))}
            />
          </div>
          <button className="btn btn-primary full-width with-top-gap" onClick={handleSaveSettings}>
            Simpan Saldo Awal
          </button>
        </div>

        <div className="settings-group">
          <div className="settings-group-title">📋 Versi Config Budget</div>

          {versions.map(version => (
            <div className="version-card" key={version.id}>
              <div className="version-header">
                <div className="version-title-block">
                  <span className="version-name">{version.name}</span>
                  <span className="version-period">{formatConfigPeriod(version)}</span>
                </div>
                <div className="version-actions">
                  <button
                    className="version-action-btn"
                    onClick={() => setEditingVersion(editingVersion?.id === version.id ? null : { ...version })}
                    aria-label={editingVersion?.id === version.id ? 'Tutup edit versi' : `Edit ${version.name}`}
                  >
                    {editingVersion?.id === version.id ? '✕' : '✏️'}
                  </button>
                  {versions.length > 1 && (
                    <button
                      className="version-action-btn danger"
                      onClick={() => handleDeleteVersion(version.id, version.name)}
                      aria-label={`Hapus ${version.name}`}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {editingVersion?.id === version.id ? (
                <div className="version-edit-fields">
                  <div className="settings-field">
                    <label className="settings-field-label" htmlFor={`version-name-${version.id}`}>Nama</label>
                    <input
                      id={`version-name-${version.id}`}
                      className="settings-field-input"
                      type="text"
                      value={editingVersion.name}
                      onChange={e => setEditingVersion({ ...editingVersion, name: e.target.value })}
                    />
                  </div>
                  <div className="settings-field">
                    <label className="settings-field-label" htmlFor={`version-month-${version.id}`}>Bulan</label>
                    <select
                      id={`version-month-${version.id}`}
                      className="settings-field-input"
                      value={editingVersion.month ?? ''}
                      onChange={e => setEditingVersion({ ...editingVersion, month: parseInt(e.target.value, 10) || null })}
                    >
                      <option value="">Pilih bulan</option>
                      {months.map(month => (
                        <option key={month} value={month}>{getMonthName(month)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-field">
                    <label className="settings-field-label" htmlFor={`version-year-${version.id}`}>Tahun</label>
                    <input
                      id={`version-year-${version.id}`}
                      className="settings-field-input"
                      type="number"
                      inputMode="numeric"
                      min={2000}
                      max={2100}
                      value={editingVersion.year ?? ''}
                      onChange={e => setEditingVersion({ ...editingVersion, year: parseInt(e.target.value, 10) || null })}
                    />
                  </div>
                  {budgetFields.map(field => (
                    <div className="settings-field" key={field.key}>
                      <label className="settings-field-label" htmlFor={`${field.key}-${version.id}`}>{field.label}</label>
                      {field.key === 'gas_fill_interval_days' ? (
                        <input
                          id={`${field.key}-${version.id}`}
                          className="settings-field-input"
                          type="number"
                          inputMode="numeric"
                          value={editingVersion[field.key] as number}
                          onChange={e => setEditingVersion({ ...editingVersion, [field.key]: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <RupiahInput
                          id={`${field.key}-${version.id}`}
                          className="settings-field-input"
                          value={editingVersion[field.key] as number}
                          onChange={value => setEditingVersion({ ...editingVersion, [field.key]: value })}
                        />
                      )}
                    </div>
                  ))}
                  <button className="btn btn-primary full-width with-top-gap" onClick={() => handleSaveVersion(editingVersion)}>
                    Simpan {editingVersion.name}
                  </button>
                </div>
              ) : (
                <div className="version-summary">
                  {budgetFields.map(field => (
                    <div className="version-summary-row" key={field.key}>
                      <span>{field.label}</span>
                      <span>{field.key === 'gas_fill_interval_days' ? `${version[field.key]} hari` : `Rp${(version[field.key] as number).toLocaleString('id-ID')}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="new-version-bar">
            <input
              className="new-version-input"
              type="text"
              placeholder="Nama versi baru..."
              value={newVersionName}
              onChange={e => setNewVersionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateVersion()}
            />
            <select
              className="new-version-select"
              value={newVersionMonth}
              onChange={e => setNewVersionMonth(parseInt(e.target.value, 10))}
              aria-label="Bulan config baru"
            >
              {months.map(month => (
                <option key={month} value={month}>{getMonthName(month).slice(0, 3)}</option>
              ))}
            </select>
            <input
              className="new-version-select year"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={newVersionYear}
              onChange={e => setNewVersionYear(parseInt(e.target.value, 10) || currentCycle.year)}
              aria-label="Tahun config baru"
            />
            <button className="btn btn-primary" onClick={handleCreateVersion} disabled={!newVersionName.trim()}>
              + Buat
            </button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`} role="status">{toast.msg}</div>}
    </>
  );
}
