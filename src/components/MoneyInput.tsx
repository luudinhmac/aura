import React, { useEffect, useState } from 'react';

function parseMoney(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function formatMoney(value: number): string {
  return Math.max(0, Number(value) || 0).toLocaleString('vi-VN');
}

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange?: (value: number) => void;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState(formatMoney(value));

  useEffect(() => {
    setDisplayValue(formatMoney(value));
  }, [value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={(event) => {
        const nextValue = parseMoney(event.target.value);
        setDisplayValue(event.target.value.replace(/[^\d.,\s]/g, ''));
        onChange?.(nextValue);
      }}
      onBlur={(event) => {
        setDisplayValue(formatMoney(parseMoney(event.target.value)));
        props.onBlur?.(event);
      }}
    />
  );
};
