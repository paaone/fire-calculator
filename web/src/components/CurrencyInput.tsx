import { useEffect, useMemo, useState } from 'react'

function formatCurrency(n: number | null): string {
  if (n === null || isNaN(n)) return ''
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function parseCurrency(input: string): number | null {
  // Remove everything except digits
  const digits = input.replace(/[^0-9]/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return isNaN(n) ? null : n
}

export default function CurrencyInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  const [text, setText] = useState<string>(formatCurrency(value ?? 0))

  useEffect(() => {
    setText(formatCurrency(value ?? 0))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const parsed = parseCurrency(raw)
    if (parsed === null) return
    onChange(parsed)
    setText(formatCurrency(parsed))
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // Select all for quick overwrite
    e.currentTarget.select()
  }

  return (
    <input
      className="input"
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
    />
  )}

