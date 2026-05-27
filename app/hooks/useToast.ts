'use client';

import { useCallback, useRef, useState } from 'react';

export interface ToastState {
  msg: string;
  type: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ msg, type });
    timeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return { toast, showToast };
}
