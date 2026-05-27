'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConfigVersion,
  OtherExpense,
  calculateCycleSummary,
  dateToString,
  getCurrentCycleYearMonth,
  getMonthName,
  getNextCycleYearMonth,
  getPrevCycleYearMonth,
  toDayEntry,
} from '@/lib/budget-utils';
import { CycleData, LogUpdate, SavingsSnapshot } from '@/lib/app-types';

export function useCycleData(showToast: (msg: string, type?: string) => void) {
  const [currentYM, setCurrentYM] = useState(getCurrentCycleYearMonth());
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [savings, setSavings] = useState<SavingsSnapshot | null>(null);
  const [savingsLoading, setSavingsLoading] = useState(true);
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const initialScrollDone = useRef(false);

  const currentCycle = getCurrentCycleYearMonth();
  const maxYM = getNextCycleYearMonth(currentCycle.year, currentCycle.month);
  const canNext = !(currentYM.year === maxYM.year && currentYM.month === maxYM.month);
  const todayStr = dateToString(new Date());

  const fetchCycle = useCallback(async () => {
    setLoading(true);
    setSavingsLoading(true);
    setNotFound(false);
    initialScrollDone.current = false;

    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`);
      if (res.status === 404) {
        setNotFound(true);
        setCycleData(null);
        setOtherExpenses([]);
        setConfigVersions([]);
        setSavings(null);
      } else if (res.ok) {
        const data = await res.json();
        setCycleData(data);
        setOtherExpenses(data.summary?.other_expenses ?? []);
        setConfigVersions(data.configVersions ?? []);
        setSavings(data.savings ?? null);
      } else {
        showToast('Gagal ambil data', 'error');
      }
    } catch {
      showToast('Gagal ambil data', 'error');
    }

    setSavingsLoading(false);
    setLoading(false);
  }, [currentYM.year, currentYM.month, showToast]);

  const fetchSavings = useCallback(async () => {
    setSavingsLoading(true);
    setSavings(null);
    try {
      const res = await fetch(`/api/savings?year=${currentYM.year}&month=${currentYM.month}`);
      if (res.ok) setSavings(await res.json());
    } catch {
      // Savings is already present in the cycle payload; keep this refresh best-effort.
    }
    setSavingsLoading(false);
  }, [currentYM.year, currentYM.month]);

  useEffect(() => {
    void Promise.resolve().then(fetchCycle);
  }, [fetchCycle]);

  useEffect(() => {
    if (cycleData && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setTimeout(() => {
        const el = document.getElementById('today-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [cycleData]);

  const handleCreateCycle = useCallback(async () => {
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
  }, [currentYM.month, currentYM.year, fetchCycle, showToast]);

  const handleUpdateLog = useCallback(async (id: number, data: LogUpdate) => {
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

    const oldFilledVar = prevData.entries
      .filter(e => e.actual_amount !== null && e.variance !== null)
      .reduce((sum, entry) => sum + (entry.variance ?? 0), 0);
    const newFilledVar = updatedEntries
      .filter(e => e.actual_amount !== null && e.variance !== null)
      .reduce((sum, entry) => sum + (entry.variance ?? 0), 0);
    const varianceDiff = newFilledVar - oldFilledVar;
    const prevSavings = savings;

    setSavings(prev => prev ? ({
      ...prev,
      current_month_variance: prev.current_month_variance + varianceDiff,
      current_balance: prev.current_balance + varianceDiff,
    }) : null);

    try {
      const res = await fetch(`/api/daily-logs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        setCycleData(prevData);
        setSavings(prevSavings);
        showToast('Gagal update', 'error');
      }
    } catch {
      setCycleData(prevData);
      setSavings(prevSavings);
      showToast('Gagal update', 'error');
    }
  }, [cycleData, savings, showToast]);

  const handleUpdateOtherExpense = useCallback(async (id: number | null, data: Partial<OtherExpense>) => {
    if (!cycleData) return;

    let updatedExpenses: OtherExpense[];
    let tempExp: OtherExpense | null = null;

    if (id === null) {
      tempExp = {
        id: -Date.now(),
        cycle_id: cycleData.cycle.id,
        category: data.category as 'parking' | 'gas',
        amount: data.amount || 0,
        expense_date: data.expense_date || dateToString(new Date()),
        description: data.description || null,
      };
      updatedExpenses = [tempExp, ...otherExpenses];
    } else {
      updatedExpenses = otherExpenses.map(expense => expense.id === id ? { ...expense, ...data } : expense);
    }

    const prevExpenses = otherExpenses;
    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');

    setOtherExpenses(updatedExpenses);
    setCycleData(prev => prev ? {
      ...prev,
      summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, updatedExpenses),
    } : null);

    try {
      const url = id ? `/api/other-expenses/${id}` : '/api/other-expenses';
      const method = id ? 'PATCH' : 'POST';
      const body = id ? data : { ...data, cycle_id: cycleData.cycle.id };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setOtherExpenses(prevExpenses);
        setCycleData(prev => prev ? {
          ...prev,
          summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses),
        } : null);
        showToast('Gagal simpan pengeluaran', 'error');
      } else if (!id && tempExp) {
        const savedExp = await res.json();
        const tempId = tempExp.id;
        setOtherExpenses(prev => {
          const finalExpenses = prev.map(expense => expense.id === tempId ? savedExp : expense);
          setCycleData(prevCycle => prevCycle ? {
            ...prevCycle,
            summary: calculateCycleSummary(prevCycle.entries, startDate, endDate, prevCycle.config, finalExpenses),
          } : null);
          return finalExpenses;
        });
      }
    } catch {
      setOtherExpenses(prevExpenses);
      setCycleData(prev => prev ? {
        ...prev,
        summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses),
      } : null);
      showToast('Gagal simpan pengeluaran', 'error');
    }
  }, [cycleData, otherExpenses, showToast]);

  const handleDeleteOtherExpense = useCallback(async (id: number) => {
    if (!cycleData) return;
    const prevExpenses = otherExpenses;
    const updatedExpenses = prevExpenses.filter(expense => expense.id !== id);
    const startDate = new Date(cycleData.cycle.start_date + 'T00:00:00');
    const endDate = new Date(cycleData.cycle.end_date + 'T00:00:00');

    setOtherExpenses(updatedExpenses);
    setCycleData(prev => prev ? {
      ...prev,
      summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, updatedExpenses),
    } : null);

    try {
      const res = await fetch(`/api/other-expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setOtherExpenses(prevExpenses);
        setCycleData(prev => prev ? {
          ...prev,
          summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses),
        } : null);
        showToast('Gagal hapus pengeluaran', 'error');
      }
    } catch {
      setOtherExpenses(prevExpenses);
      setCycleData(prev => prev ? {
        ...prev,
        summary: calculateCycleSummary(prev.entries, startDate, endDate, prev.config, prevExpenses),
      } : null);
      showToast('Gagal hapus pengeluaran', 'error');
    }
  }, [cycleData, otherExpenses, showToast]);

  const handleDeleteCycle = useCallback(async () => {
    if (!cycleData) return;
    if (!window.confirm(`Hapus siklus ${getMonthName(currentYM.month)} ${currentYM.year}?\nSemua data harian akan ikut terhapus.`)) return;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`, { method: 'DELETE' });
      if (res.ok) {
        setCycleData(null);
        setNotFound(true);
        void fetchSavings();
        showToast('Siklus dihapus');
      } else {
        showToast('Gagal menghapus', 'error');
      }
    } catch {
      showToast('Gagal menghapus', 'error');
    }
  }, [currentYM.month, currentYM.year, cycleData, fetchSavings, showToast]);

  const handleChangeConfigVersion = useCallback(async (versionId: number) => {
    if (!cycleData) return;
    try {
      const res = await fetch(`/api/cycles/${currentYM.year}-${currentYM.month}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_version_id: versionId }),
      });
      if (res.ok) {
        await fetchCycle();
        showToast('Config version diubah');
      } else {
        showToast('Gagal mengubah config', 'error');
      }
    } catch {
      showToast('Gagal mengubah config', 'error');
    }
  }, [currentYM.month, currentYM.year, cycleData, fetchCycle, showToast]);

  const goPrev = useCallback(() => {
    if (!loading) setCurrentYM(getPrevCycleYearMonth(currentYM.year, currentYM.month));
  }, [currentYM.month, currentYM.year, loading]);

  const goNext = useCallback(() => {
    if (canNext && !loading) setCurrentYM(getNextCycleYearMonth(currentYM.year, currentYM.month));
  }, [canNext, currentYM.month, currentYM.year, loading]);

  const goToMonth = useCallback((year: number, month: number) => {
    if (!loading) setCurrentYM({ year, month });
  }, [loading]);

  return {
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
    fetchCycle,
    handleCreateCycle,
    handleUpdateLog,
    handleUpdateOtherExpense,
    handleDeleteOtherExpense,
    handleDeleteCycle,
    handleChangeConfigVersion,
    goPrev,
    goNext,
    goToMonth,
  };
}
