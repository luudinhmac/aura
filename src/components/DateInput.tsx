import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDateVN, parseDateVN } from '../utils/dateUtils.ts';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string;
  onChange: (isoDate: string) => void;
}

/** Locale-independent date input: displays DD/MM/YYYY and emits YYYY-MM-DD. */
export const DateInput: React.FC<DateInputProps> = ({ value = '', onChange, onBlur, placeholder = 'DD/MM/YYYY', className = '', disabled, ...props }) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => formatDateVN(value));

  useEffect(() => {
    setDraft(formatDateVN(value));
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length <= 2
      ? digits
      : digits.length <= 4
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDraft(formatted);
    const isoDate = parseDateVN(formatted);
    if (isoDate || formatted === '') onChange(isoDate);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (draft && !parseDateVN(draft)) setDraft(formatDateVN(value));
    onBlur?.(event);
  };

  const openPicker = () => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    picker?.showPicker?.();
    picker?.focus();
  };

  const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value);

  return (
    <span className="relative block">
      <input {...props} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} value={draft} onChange={handleChange} onBlur={handleBlur} disabled={disabled} className={`${className} pr-10`} />
      <input ref={pickerRef} type="date" value={value.slice(0, 10)} onChange={handlePickerChange} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-0 w-0 opacity-0" />
      <button type="button" onClick={openPicker} disabled={disabled} aria-label="Mở lịch" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"><CalendarDays className="h-4 w-4" /></button>
    </span>
  );
};
