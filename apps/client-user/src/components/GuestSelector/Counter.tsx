import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

type CounterProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
  className?: string
}

export function Counter({ label, value, min, max, onChange, className }: CounterProps) {
  const canDec = value > min
  const canInc = value < max

  return (
    <div className={cn("flex items-center justify-between py-4", className)}>
      <div className="text-[16px] font-medium text-gray-900">{label}</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`减少${label}`}
          disabled={!canDec}
          onClick={() => onChange(value - 1)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
            canDec ? "border-gray-300 text-gray-600 active:bg-gray-50" : "border-gray-200 text-gray-300"
          )}
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="min-w-6 text-center text-[18px] font-semibold text-gray-900">{value}</div>
        <button
          type="button"
          aria-label={`增加${label}`}
          disabled={!canInc}
          onClick={() => onChange(value + 1)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
            canInc ? "border-blue-600 text-blue-600 active:bg-blue-50" : "border-gray-200 text-gray-300"
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

