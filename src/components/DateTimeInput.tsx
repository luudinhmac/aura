import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { formatDateTimeInput, parseDateTimeVN } from '../utils/dateUtils.ts';

interface DateTimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string;
  onChange: (isoDateTime: string) => void;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({ value = '', onChange, onBlur, placeholder = 'DD/MM/YYYY HH:mm', className = '', disabled, ...props }) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => formatDateTimeInput(value));
  useEffect(() => setDraft(formatDateTimeInput(value)), [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
    let formatted = raw;
    if (raw.length > 2) formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    if (raw.length > 4) formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    if (raw.length > 8) formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)} ${raw.slice(8, 10)}`;
    if (raw.length > 10) formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)} ${raw.slice(8, 10)}:${raw.slice(10)}`;
    setDraft(formatted);
    const parsed = parseDateTimeVN(formatted);
    if (parsed || formatted === '') onChange(parsed);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (draft && !parseDateTimeVN(draft)) setDraft(formatDateTimeInput(value));
    onBlur?.(event);
  };

  const openPicker = () => {
    const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    picker?.showPicker?.();
    picker?.focus();
  };

  const nativeValue = value ? (() => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  })() : '';
  const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value);

  return <span className="relative block"><input {...props} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} value={draft} onChange={handleChange} onBlur={handleBlur} disabled={disabled} className={`${className} pr-10`} /><input ref={pickerRef} type="datetime-local" value={nativeValue} onChange={handlePickerChange} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-0 w-0 opacity-0" /><button type="button" onClick={openPicker} disabled={disabled} aria-label="Mở lịch và giờ" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"><CalendarClock className="h-4 w-4" /></button></span>;
};
