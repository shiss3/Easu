import { useEffect, useRef, useState } from 'react'
import Check from 'lucide-react/dist/esm/icons/check'

export type SortOption = 'default' | 'rating' | 'price_low' | 'price_high'

interface SortSelectorProps {
  visible: boolean
  value: SortOption
  onChange: (value: SortOption) => void
  onClose: () => void
  topOffset: number
}

const SORT_OPTIONS: { key: SortOption; label: string; description?: string }[] = [
  { key: 'default', label: '默认排序' },
  { key: 'rating', label: '好评优先', description: '根据点评分、点评条数等综合排序' },
  { key: 'price_low', label: '低价优先' },
  { key: 'price_high', label: '高价优先' },
]

export default function SortSelector({
  visible,
  value,
  onChange,
  onClose,
  topOffset,
}: SortSelectorProps) {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(1)

  useEffect(() => {
    if (visible) {
      clearTimeout(timerRef.current)
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true))
      })
    } else {
      setShow(false)
      timerRef.current = setTimeout(() => setMounted(false), 300)
    }
    return () => clearTimeout(timerRef.current)
  }, [visible])

  if (!mounted) return null

  const handleSelect = (option: SortOption) => {
    onChange(option)
    onClose()
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[35]"
      style={{ top: topOffset }}
    >
      {/* 遮罩层：仅覆盖组件下方区域 */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 面板（裁剪容器 + 滑入动画） */}
      <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
        <div
          className={`bg-white shadow-lg transition-transform duration-300 ease-out ${
            show ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = value === option.key
            return (
              <div
                key={option.key}
                className="flex items-center justify-between px-4 py-4 border-b border-gray-100 last:border-b-0 active:bg-gray-50 cursor-pointer"
                onClick={() => handleSelect(option.key)}
              >
                <div>
                  <span
                    className={`text-base ${
                      isSelected ? 'text-blue-600 font-bold' : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Check size={20} className="text-blue-600 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
