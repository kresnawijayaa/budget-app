export type ValidationResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: string };

export function ok<T>(value: T): ValidationResult<T> {
    return { ok: true, value };
}

export function invalid<T = never>(error: string): ValidationResult<T> {
    return { ok: false, error };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<ValidationResult<Record<string, unknown>>> {
    try {
        const body = await request.json();
        if (!isRecord(body)) return invalid('Request body must be a JSON object');
        return ok(body);
    } catch {
        return invalid('Invalid JSON body');
    }
}

export function parseInteger(value: unknown, field: string, options: {
    required?: boolean;
    min?: number;
    max?: number;
} = {}): ValidationResult<number | undefined> {
    if (value === undefined || value === null || value === '') {
        return options.required ? invalid(`${field} is required`) : ok(undefined);
    }

    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(numberValue)) {
        return invalid(`${field} must be an integer`);
    }
    if (options.min !== undefined && numberValue < options.min) {
        return invalid(`${field} must be at least ${options.min}`);
    }
    if (options.max !== undefined && numberValue > options.max) {
        return invalid(`${field} must be at most ${options.max}`);
    }

    return ok(numberValue);
}

export function parseBoolean(value: unknown, field: string): ValidationResult<boolean | undefined> {
    if (value === undefined) return ok(undefined);
    if (typeof value !== 'boolean') return invalid(`${field} must be a boolean`);
    return ok(value);
}

export function parseDateString(value: unknown, field: string, required = false): ValidationResult<string | undefined> {
    if (value === undefined || value === null || value === '') {
        return required ? invalid(`${field} is required`) : ok(undefined);
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return invalid(`${field} must use YYYY-MM-DD format`);
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const isValid =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

    return isValid ? ok(value) : invalid(`${field} is not a valid date`);
}

export function parseOptionalText(value: unknown, field: string, maxLength: number): ValidationResult<string | null | undefined> {
    if (value === undefined) return ok(undefined);
    if (value === null) return ok(null);
    if (typeof value !== 'string') return invalid(`${field} must be a string`);

    const trimmed = value.trim();
    if (trimmed.length > maxLength) return invalid(`${field} must be ${maxLength} characters or less`);
    return ok(trimmed === '' ? null : trimmed);
}

export function parseRequiredText(value: unknown, field: string, maxLength: number): ValidationResult<string> {
    if (typeof value !== 'string' || value.trim() === '') return invalid(`${field} is required`);

    const trimmed = value.trim();
    if (trimmed.length > maxLength) return invalid(`${field} must be ${maxLength} characters or less`);
    return ok(trimmed);
}

export function parseYearMonthParam(yearMonth: string): ValidationResult<{ year: number; month: number }> {
    const match = /^(\d{4})-(\d{1,2})$/.exec(yearMonth);
    if (!match) return invalid('Invalid yearMonth format. Use YYYY-MM');

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return invalid('year must be between 2000 and 2100');
    if (!Number.isInteger(month) || month < 1 || month > 12) return invalid('month must be between 1 and 12');

    return ok({ year, month });
}
