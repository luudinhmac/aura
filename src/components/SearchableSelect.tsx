import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi');

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value, options, onChange, placeholder = 'Chọn...', searchPlaceholder = 'Gõ để tìm...',
  emptyMessage = 'Không tìm thấy kết quả.', className = '', ariaLabel = 'Tìm và chọn', disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return options;
    return options.filter((option) => normalize(`${option.label} ${option.keywords || ''}`).includes(term));
  }, [options, query]);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const choose = (option: SearchableSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <div className="flex w-full items-center rounded-lg border border-slate-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20">
        <Search aria-hidden="true" className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          value={open ? query : selected?.label || ''}
          placeholder={open ? searchPlaceholder : placeholder}
          disabled={disabled}
          className="w-full min-w-0 rounded-lg bg-transparent px-2 py-2 text-xs font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed"
          onFocus={() => { if (!disabled) setOpen(true); }}
          onClick={() => { if (!disabled) setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, Math.max(0, filtered.length - 1))); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
            else if (event.key === 'Enter' && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]); }
            else if (event.key === 'Escape') { setOpen(false); setQuery(''); }
          }}
        />
        <ChevronDown aria-hidden="true" className={`mr-3 h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && !disabled && <div role="listbox" aria-label={ariaLabel} className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
        {filtered.length === 0 ? <p className="px-3 py-3 text-center text-xs text-slate-500">{emptyMessage}</p> : filtered.map((option, index) => <button
          type="button"
          role="option"
          aria-selected={option.value === value}
          key={option.value || '__empty'}
          className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs ${index === activeIndex ? 'bg-sky-50 text-sky-900' : 'text-slate-700 hover:bg-slate-50'} ${option.value === value ? 'font-bold' : ''}`}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
        ><span className="min-w-0 truncate">{option.label}</span>{option.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}</button>)}</div>}
    </div>
  );
};
