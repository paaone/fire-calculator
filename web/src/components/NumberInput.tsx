import { useCallback, useEffect, useMemo, useState } from "react"
import type { InputHTMLAttributes } from "react"

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null | undefined
  onChange: (value: number) => void
  allowNegative?: boolean
  decimal?: boolean
}

function normalize(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  if (!Number.isFinite(value)) return ""
  return String(value)
}

function coerceToNumber(raw: string): number | null {
  if (!raw || raw === "-" || raw === "." || raw === "-.") return null
  const numeric = Number(raw)
  if (Number.isNaN(numeric)) return null
  return numeric
}

function digitsFromStep(stepValue: number | undefined): number {
  if (!stepValue || !Number.isFinite(stepValue)) return 0
  const text = stepValue.toString()
  const [, decimals = ""] = text.split(".")
  return decimals.length
}

export default function NumberInput({
  value,
  onChange,
  allowNegative = false,
  decimal = true,
  inputMode,
  min,
  max,
  step,
  className,
  ...rest
}: NumberInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState<string>(() => normalize(value))

  const minValue = useMemo(() => (min !== undefined && min !== null ? Number(min) : undefined), [min])
  const maxValue = useMemo(() => (max !== undefined && max !== null ? Number(max) : undefined), [max])
  const stepDigits = useMemo(() => digitsFromStep(typeof step === "number" ? step : step !== undefined ? Number(step) : undefined), [step])

  useEffect(() => {
    if (!focused) {
      setDraft(normalize(value))
    }
  }, [value, focused])

  const clamp = useCallback(
    (numeric: number): number => {
      let next = numeric
      if (minValue !== undefined && Number.isFinite(minValue) && next < minValue) {
        next = minValue
      }
      if (maxValue !== undefined && Number.isFinite(maxValue) && next > maxValue) {
        next = maxValue
      }
      if (stepDigits > 0) {
        next = Number(next.toFixed(stepDigits))
      }
      return next
    },
    [minValue, maxValue, stepDigits],
  )

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    const sanitized = allowNegative ? raw.replace(/[^0-9.\-]/g, "") : raw.replace(/[^0-9.]/g, "")
    if (sanitized !== raw) {
      setDraft(sanitized)
    } else {
      setDraft(raw)
    }

    const numeric = coerceToNumber(sanitized)
    if (numeric === null) return
    onChange(clamp(numeric))
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true)
    setDraft(normalize(value))
    requestAnimationFrame(() => event.target.select())
  }

  const handleBlur = () => {
    setFocused(false)
    const numeric = coerceToNumber(draft)
    if (numeric === null) {
      setDraft(normalize(value))
      return
    }
    const next = clamp(numeric)
    setDraft(normalize(next))
    onChange(next)
  }

  const computedInputMode = inputMode ?? (decimal ? "decimal" : "numeric")

  return (
    <input
      {...rest}
      className={className}
      type="text"
      value={draft}
      inputMode={computedInputMode}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
    />
  )
}
