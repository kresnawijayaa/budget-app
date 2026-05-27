'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const PIN_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [positions, setPositions] = useState<number[]>([]);
  const [digits, setDigits] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const requiredPositions = useMemo(() => new Set(positions), [positions]);
  const isComplete = positions.length > 0 && positions.every(position => /^\d$/.test(digits[position] || ''));

  const loadChallenge = useCallback(async () => {
    setError('');
    setDigits({});
    try {
      const res = await fetch('/api/auth/challenge', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.positions)) {
        setPositions(data.positions);
      } else {
        setError(data.error || 'Gagal membuat challenge');
      }
    } catch {
      setError('Tidak bisa menghubungi server');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadChallenge);
  }, [loadChallenge]);

  useEffect(() => {
    const firstPosition = positions[0];
    if (firstPosition !== undefined) {
      inputRefs.current[firstPosition]?.focus();
    }
  }, [positions]);

  const handleDigitChange = (position: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits(prev => ({ ...prev, [position]: digit }));

    if (digit) {
      const currentIndex = positions.indexOf(position);
      const nextPosition = positions[currentIndex + 1];
      if (nextPosition !== undefined) inputRefs.current[nextPosition]?.focus();
    }
  };

  const handleKeyDown = (position: number, key: string) => {
    if (key !== 'Backspace' || digits[position]) return;
    const currentIndex = positions.indexOf(position);
    const prevPosition = positions[currentIndex - 1];
    if (prevPosition !== undefined) inputRefs.current[prevPosition]?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digits }),
      });

      if (res.ok) {
        const params = new URLSearchParams(window.location.search);
        router.replace(params.get('next') || '/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.rotate ? 'PIN salah. Pola baru sudah dibuat.' : data?.error || 'Login gagal');
        setDigits({});
        if (Array.isArray(data?.positions)) {
          setPositions(data.positions);
        } else if (data?.rotate) {
          await loadChallenge();
        }
      }
    } catch {
      setError('Tidak bisa menghubungi server');
    }

    setLoading(false);
  };

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <div className="app-title">Budget Tracker</div>
          <h1 className="login-title">Masuk</h1>
          <p className="login-copy">Lengkapi dua posisi PIN yang diminta.</p>
        </div>

        <fieldset className="pin-fieldset" disabled={loading || positions.length === 0}>
          <legend className="sheet-label">PIN</legend>
          <div className="pin-grid">
            {Array.from({ length: PIN_LENGTH }, (_, position) => (
              requiredPositions.has(position) ? (
                <input
                  key={position}
                  ref={element => { inputRefs.current[position] = element; }}
                  className="pin-box editable"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[position] || ''}
                  onChange={event => handleDigitChange(position, event.target.value)}
                  onKeyDown={event => handleKeyDown(position, event.key)}
                  autoComplete="off"
                  aria-label={`Digit PIN posisi ${position + 1}`}
                />
              ) : (
                <div key={position} className="pin-box masked" aria-label={`Digit PIN posisi ${position + 1} disembunyikan`}>
                  •
                </div>
              )
            ))}
          </div>
        </fieldset>

        {error && <div className="login-error" role="alert">{error}</div>}

        <button className="btn btn-primary full-width" type="submit" disabled={loading || !isComplete}>
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}
