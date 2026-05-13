import React, { useMemo } from 'react';

export function FormattedNumberInput({ value, onChange, placeholder, className, required, name }: { value: string, onChange: (val: string) => void, placeholder?: string, className?: string, required?: boolean, name?: string }) {
  const displayValue = useMemo(() => {
    if (!value) return '';
    const numeric = String(value).replace(/\D/g, '');
    return new Intl.NumberFormat('id-ID').format(Number(numeric));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange(rawValue);
  };

  return (
    <>
      <input 
        type="text"
        placeholder={placeholder}
        className={className}
        required={required}
        value={displayValue}
        onChange={handleChange}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
