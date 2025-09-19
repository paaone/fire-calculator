import { useEffect, useMemo, useState } from "react"
import type { InputHTMLAttributes } from "react"

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  value: number
  onChange: (v: number) => void
  currency?: string
}

function sanitizeNumeric(input: string): string {
  return input.replace(/[^0-9.]/g, "")
}

export default function CurrencyInput({ value, onChange, placeholder, currency = "USD", className, ...rest }: CurrencyInputProps) {
  const locale = currency === "INR" ? "en-IN" : undefined
  const formatter = useMemo(() => new Intl.NumberFormat(locale ?? undefined, { style: "currency", currency, maximumFractionDigits: 0 }), [currency, locale])

  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => formatter.format(value ?? 0))

  useEffect(() => {
    if (!focused) {
      setText(formatter.format(value ?? 0))
    }
  }, [value, formatter, focused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    const cleaned = sanitizeNumeric(raw)
    if (!cleaned) {
      onChange(0)
      return
    }
    const numeric = Number(cleaned)
    if (!Number.isNaN(numeric)) {
      onChange(numeric)
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true)
    const base = Number.isFinite(value) && value !== 0 ? String(value) : ""
    setText(base)
    requestAnimationFrame(() => e.currentTarget.select())
  }

  function handleBlur() {
    setFocused(false)
    setText(formatter.format(value ?? 0))
  }

  return (
    <input
      {...rest}
      className={["input", className].filter(Boolean).join(" ")}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  )
}
