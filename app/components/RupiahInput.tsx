'use client';

import { useState, useRef, useEffect } from 'react';

interface RupiahInputProps {
    value: number;
    onChange: (value: number) => void;
    onEnter?: () => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

/**
 * Format number with Indonesian thousand separator (dot)
 */
function formatWithDots(num: number): string {
    if (num === 0) return '';
    return num.toLocaleString('id-ID');
}

/**
 * Parse a formatted string back to a number
 */
function parseFromFormatted(str: string): number {
    const digits = str.replace(/\D/g, '');
    if (digits === '') return 0;
    return parseInt(digits, 10);
}

export default function RupiahInput({ value, onChange, onEnter, placeholder = '0', className = '', autoFocus = false }: RupiahInputProps) {
    const [displayValue, setDisplayValue] = useState(formatWithDots(value));
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync when external value changes (e.g. on open)
    useEffect(() => {
        setDisplayValue(formatWithDots(value));
    }, [value]);

    // Auto-focus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
            // Move cursor to end
            const len = inputRef.current.value.length;
            inputRef.current.setSelectionRange(len, len);
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const num = parseFromFormatted(raw);
        setDisplayValue(formatWithDots(num));
        onChange(num);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnter) {
            onEnter();
        }
    };

    return (
        <input
            ref={inputRef}
            className={className}
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        />
    );
}
