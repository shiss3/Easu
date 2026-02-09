import { ChevronRight, X } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Counter } from "./Counter"
import { formatChildAge, GUEST_LIMITS, type GuestSelection } from "./types"

type SelectionModalProps = {
  open: boolean
  value: GuestSelection
  onChange: (next: GuestSelection) => void
  onClose: () => void
  onConfirm: (selection: GuestSelection) => void
  onOpenAgeSelector: (childIndex: number) => void
  zIndexClassName?: string
}

function useLockBodyScroll(active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

export function SelectionModal({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
  onOpenAgeSelector,
  // 需要高于 MobileLayout 底部导航栏（z-50）
  zIndexClassName = "z-[100]",
}: SelectionModalProps) {
  useLockBodyScroll(open)
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    if (open) setSubmitted(false)
  }, [open])

  if (!open) return null

  const missingAgeIndexes = value.childAges
    .map((age, idx) => (age == null ? idx : -1))
    .filter((idx) => idx >= 0)

  const canConfirm = missingAgeIndexes.length === 0

  return (
    <Portal>
      <div className={cn("fixed inset-0", zIndexClassName)}>
        <button
          type="button"
          aria-label="关闭"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              type="button"
              aria-label="关闭"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-800 active:bg-gray-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-[18px] font-semibold text-gray-900">选择客房和入住人数</div>
            <div className="h-9 w-9" />
          </div>

          <div className="px-4">
            <div className="border-b border-gray-100">
              <Counter
                label="间数"
                value={value.rooms}
                min={GUEST_LIMITS.rooms.min}
                max={GUEST_LIMITS.rooms.max}
                onChange={(rooms) => onChange({ ...value, rooms })}
              />
            </div>
            <div className="border-b border-gray-100">
              <Counter
                label="成人数"
                value={value.adults}
                min={GUEST_LIMITS.adults.min}
                max={GUEST_LIMITS.adults.max}
                onChange={(adults) => onChange({ ...value, adults })}
              />
            </div>
            <div className="border-b border-gray-100">
              <Counter
                label="儿童数"
                value={value.children}
                min={GUEST_LIMITS.children.min}
                max={GUEST_LIMITS.children.max}
                onChange={(children) => {
                  if (children === value.children) return
                  if (children > value.children) {
                    const nextAges = [...value.childAges, null]
                    onChange({ ...value, children, childAges: nextAges })
                  } else {
                    const nextAges = value.childAges.slice(0, Math.max(0, children))
                    onChange({ ...value, children, childAges: nextAges })
                  }
                }}
              />
            </div>

            {value.children > 0 ? (
              <div className="pt-4">
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[13px] text-blue-700">
                  <div className="mt-[2px] h-4 w-4 shrink-0 rounded-full border border-blue-300 text-center text-[12px] leading-[14px]">
                    i
                  </div>
                  <div>入住人数较多时，试试增加间数</div>
                </div>

                <div className="rounded-2xl bg-[#FFF6D8] p-4">
                  <div className="text-[18px] font-semibold text-gray-900">儿童年龄</div>
                  <div className="mt-1 text-[13px] leading-5 text-gray-600">
                    请准确维护儿童年龄，以便我们为您查找最合适的房型及优惠
                  </div>

                  <div className="mt-4 space-y-3">
                    {Array.from({ length: value.children }, (_, i) => {
                      const age = value.childAges[i] ?? null
                      const invalid = submitted && age == null
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onOpenAgeSelector(i)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-sm ring-1 transition-colors",
                            invalid ? "ring-red-500" : "ring-gray-200 active:bg-gray-50"
                          )}
                        >
                          <div className="text-[16px] font-medium text-gray-900">{`儿童${i + 1}`}</div>
                          <div className="flex items-center gap-2">
                            <div className={cn("text-[15px]", age == null ? "text-gray-400" : "text-gray-900")}>
                              {formatChildAge(age)}
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setSubmitted(true)
                  if (!canConfirm) return
                  onConfirm(value)
                }}
              >
                完成
              </Button>
              {submitted && !canConfirm ? (
                <div className="mt-2 text-center text-xs text-red-600">请先选择所有儿童的年龄</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

