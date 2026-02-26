import { X } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils.ts"

import { AGE_OPTIONS, formatChildAge, type ChildAge } from "./types.ts"

type AgeSelectorModalProps = {
  open: boolean
  childIndex: number | null
  selectedAge: ChildAge | null
  onSelect: (age: ChildAge) => void
  onClose: () => void
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

export function AgeSelectorModal({
  open,
  childIndex,
  selectedAge,
  onSelect,
  onClose,
  // 需要高于主选择弹窗与底部导航栏
  zIndexClassName = "z-[110]",
}: AgeSelectorModalProps) {
  useLockBodyScroll(open)

  if (!open || childIndex == null) return null

  const title = `儿童${childIndex + 1}年龄`

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
            <div className="text-[18px] font-semibold text-gray-900">{title}</div>
            <div className="h-9 w-9" />
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              {AGE_OPTIONS.map((opt) => {
                const selected = opt.value === selectedAge
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSelect(opt.value)
                      onClose()
                    }}
                    className={cn(
                      "h-12 rounded-xl border text-[15px] font-medium transition-colors",
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-900 active:bg-gray-50"
                    )}
                    aria-pressed={selected}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 text-center text-xs text-gray-400">
              当前选择：{formatChildAge(selectedAge)}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

