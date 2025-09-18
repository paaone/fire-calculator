import { useEffect, useMemo, useState } from "react"

function parseCurrency(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "")
  if (!digits) return 0
  const n = Number(digits)
  return Number.isNaN(n) ? null : n
}

export default function CurrencyInput({ value, onChange, placeholder, currency = "USD" }: { value: number; onChange: (v: number) => void; placeholder?: string; currency?: string }) {
  const locale = currency === "INR" ? "en-IN" : undefined
  const formatter = useMemo(() => new Intl.NumberFormat(locale ?? undefined, { style: "currency", currency, maximumFractionDigits: 0 }), [currency, locale])

  const formatCurrency = (n: number | null) => {
    if (n === null || Number.isNaN(n)) return ""
    return formatter.format(n)
  }

  const [text, setText] = useState<string>(formatCurrency(value ?? 0))

  useEffect(() => {
    setText(formatCurrency(value ?? 0))
  }, [value, formatter])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const parsed = parseCurrency(raw)
    if (parsed === null) return
    onChange(parsed)
    setText(formatCurrency(parsed))
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
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
  )
}
