import * as React from "react"

import { cn } from "@/lib/utils.ts"
import { useSearchStore, type SearchFilters } from "@/store/searchStore.ts"

import { AgeSelectorModal } from "./AgeSelectorModal.tsx"
import { SelectionModal } from "./SelectionModal.tsx"
import {
  DEFAULT_GUEST_SELECTION,
  GUEST_SELECTION_STORAGE_KEY,
  normalizeGuestSelection,
  type ChildAge,
  type GuestSelection,
} from "./types.ts"

export type GuestSelectorProps = {
  className?: string
  triggerClassName?: string
  onConfirm?: (selection: GuestSelection) => void
  onPriceStarClick?: () => void
}

function summarize(selection: GuestSelection) {
  return `${selection.rooms}间房 ${selection.adults}成人 ${selection.children}儿童`
}

const STAR_LABEL_MAP: Record<string, string> = {
  '2': '2钻/星及以下',
  '3': '3钻/星',
  '4': '4钻/星',
}

function formatFilterLabel(filters: SearchFilters): string | null {
  const parts: string[] = []

  const hasMin = filters.minPrice != null
  const hasMax = filters.maxPrice != null
  if (hasMin && hasMax) {
    parts.push(`¥${filters.minPrice}-¥${filters.maxPrice}`)
  } else if (hasMin) {
    parts.push(`¥${filters.minPrice}以上`)
  } else if (hasMax) {
    parts.push(`¥${filters.maxPrice}以下`)
  }

  if (filters.stars?.length) {
    const labels = filters.stars.map((s) => STAR_LABEL_MAP[s] ?? `${s}星`).join(' ')
    parts.push(labels)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

function readFromStorage(): GuestSelection {
  if (typeof window === "undefined") return DEFAULT_GUEST_SELECTION
  try {
    const raw = window.localStorage.getItem(GUEST_SELECTION_STORAGE_KEY)
    if (!raw) return DEFAULT_GUEST_SELECTION
    return normalizeGuestSelection(JSON.parse(raw))
  } catch {
    return DEFAULT_GUEST_SELECTION
  }
}

function writeToStorage(selection: GuestSelection) {
  try {
    window.localStorage.setItem(GUEST_SELECTION_STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // ignore
  }
}

export default function GuestSelector({ className, triggerClassName, onConfirm, onPriceStarClick }: GuestSelectorProps) {
  const filters = useSearchStore((state) => state.filters)
  const filterLabel = React.useMemo(() => formatFilterLabel(filters), [filters])

  const [confirmed, setConfirmed] = React.useState<GuestSelection>(() => readFromStorage())
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<GuestSelection>(() => readFromStorage())
  const [ageModalOpen, setAgeModalOpen] = React.useState(false)
  const [activeChildIndex, setActiveChildIndex] = React.useState<number | null>(null)

  React.useEffect(() => {
    // 首次挂载时再同步一次（避免某些场景下 localStorage 变化）
    const value = readFromStorage()
    setConfirmed(value)
    setDraft(value)
  }, [])

  const openModal = () => {
    setDraft(confirmed)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setAgeModalOpen(false)
    setActiveChildIndex(null)
  }

  const openAgeModal = (childIndex: number) => {
    setActiveChildIndex(childIndex)
    setAgeModalOpen(true)
  }

  const closeAgeModal = () => {
    setAgeModalOpen(false)
    setActiveChildIndex(null)
  }

  const setChildAge = (childIndex: number, age: ChildAge) => {
    const next = normalizeGuestSelection({
      ...draft,
      childAges: draft.childAges.map((v, idx) => (idx === childIndex ? age : v)),
    })
    setDraft(next)
  }

  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "flex w-full items-center text-left text-lg",
          "active:opacity-80",
          triggerClassName
        )}
      >
        <div className="text-gray-900">
          {summarize(confirmed)} <span className="ml-2 text-sm text-gray-300">▼</span>
        </div>
        <div className="mx-3 h-5 w-px bg-gray-200 shrink-0" />
        <div
          className={cn(
            "text-sm shrink-0 truncate max-w-[40%]",
            filterLabel ? "text-gray-900" : "text-gray-400",
            "active:text-blue-500"
          )}
          onClick={(e) => {
            if (onPriceStarClick) {
              e.stopPropagation()
              onPriceStarClick()
            }
          }}
        >
          {filterLabel ?? '价格/星级'}
        </div>
      </button>

      <SelectionModal
        open={open}
        value={draft}
        onChange={(next) => setDraft(normalizeGuestSelection(next))}
        onClose={closeModal}
        onOpenAgeSelector={openAgeModal}
        onConfirm={(selection) => {
          const normalized = normalizeGuestSelection(selection)
          setConfirmed(normalized)
          setDraft(normalized)
          writeToStorage(normalized)
          onConfirm?.(normalized)
          closeModal()
        }}
      />

      <AgeSelectorModal
        open={ageModalOpen}
        childIndex={activeChildIndex}
        selectedAge={activeChildIndex == null ? null : (draft.childAges[activeChildIndex] as ChildAge | null)}
        onSelect={(age) => {
          if (activeChildIndex == null) return
          setChildAge(activeChildIndex, age)
        }}
        onClose={closeAgeModal}
      />
    </div>
  )
}

export { type GuestSelection }

