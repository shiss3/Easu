import * as React from 'react'
import { createPortal } from 'react-dom'
import X from 'lucide-react/dist/esm/icons/x'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

type PriceStarSelectorProps = {
  visible: boolean
  onClose: () => void
  onConfirm: (minPrice: string, maxPrice: string, stars: string[]) => void
}

type PriceRange = {
  label: string
  min: string
  max: string
}

type StarOption = {
  id: string
  title: string
  subtitle: string
}

const PRICE_RANGES: PriceRange[] = [
  { label: '¥100以下', min: '', max: '100' },
  { label: '¥100-¥150', min: '100', max: '150' },
  { label: '¥150-¥200', min: '150', max: '200' },
  { label: '¥200-¥250', min: '200', max: '250' },
  { label: '¥250-¥300', min: '250', max: '300' },
  { label: '¥300-¥350', min: '300', max: '350' },
  { label: '¥350-¥400', min: '350', max: '400' },
  { label: '¥400以上', min: '400', max: '' },
]

const STAR_OPTIONS: StarOption[] = [
  { id: '2', title: '2钻/星及以下', subtitle: '经济' },
  { id: '3', title: '3钻/星', subtitle: '舒适' },
  { id: '4', title: '4钻/星', subtitle: '高档' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function useLockBodyScroll(active: boolean) {
  React.useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
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

/** 判断当前输入值是否正好匹配某个快捷价格区间 */
function findMatchingRange(minPrice: string, maxPrice: string): number {
  return PRICE_RANGES.findIndex((r) => r.min === minPrice && r.max === maxPrice)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PriceStarSelector({ visible, onClose, onConfirm }: PriceStarSelectorProps) {
  useLockBodyScroll(visible)

  const [minPrice, setMinPrice] = React.useState('')
  const [maxPrice, setMaxPrice] = React.useState('')
  const [activeRangeIndex, setActiveRangeIndex] = React.useState<number>(-1)
  const [selectedStars, setSelectedStars] = React.useState<string[]>([])

  // 每次打开时重置
  React.useEffect(() => {
    if (visible) {
      setMinPrice('')
      setMaxPrice('')
      setActiveRangeIndex(-1)
      setSelectedStars([])
    }
  }, [visible])

  /* ---- 价格快捷选项点击 ---- */
  const handleRangeClick = (range: PriceRange, index: number) => {
    // Toggle：如果点击已高亮的，则取消
    if (activeRangeIndex === index) {
      setMinPrice('')
      setMaxPrice('')
      setActiveRangeIndex(-1)
      return
    }
    setMinPrice(range.min)
    setMaxPrice(range.max)
    setActiveRangeIndex(index)
  }

  /* ---- 手动输入时同步高亮 ---- */
  const handleMinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '')
    setMinPrice(cleaned)
    setActiveRangeIndex(findMatchingRange(cleaned, maxPrice))
  }

  const handleMaxChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '')
    setMaxPrice(cleaned)
    setActiveRangeIndex(findMatchingRange(minPrice, cleaned))
  }

  /* ---- 星级多选 ---- */
  const toggleStar = (id: string) => {
    setSelectedStars((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  /* ---- 清空 ---- */
  const handleClear = () => {
    setMinPrice('')
    setMaxPrice('')
    setActiveRangeIndex(-1)
    setSelectedStars([])
  }

  /* ---- 完成 ---- */
  const handleConfirm = () => {
    onConfirm(minPrice, maxPrice, selectedStars)
    onClose()
  }

  if (!visible) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[100]">
        {/* 遮罩 */}
        <button
          type="button"
          aria-label="关闭"
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        {/* 底部弹出面板 */}
        <div className="absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl">
          {/* ===== 头部 ===== */}
          <div className="flex items-center justify-between px-4 py-4 shrink-0">
            <button
              type="button"
              aria-label="关闭"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-800 active:bg-gray-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-lg font-bold text-gray-900">选择价格/星级</div>
            {/* 占位，保持标题居中 */}
            <div className="h-9 w-9" />
          </div>

          {/* ===== 可滚动内容 ===== */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* --- 价格部分 --- */}
            <h3 className="text-base font-bold text-gray-900 mb-3">价格</h3>

            {/* 自定义价格输入框 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-1 text-[10px] text-gray-400">
                    最低
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minPrice ? `¥${minPrice}` : ''}
                    placeholder="¥0"
                    onChange={(e) => handleMinChange(e.target.value.replace('¥', ''))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 pb-1.5 pt-5 text-sm text-gray-900 outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <span className="text-gray-300">——</span>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-1 text-[10px] text-gray-400 text">
                    最高
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxPrice ? `¥${maxPrice}` : ''}
                    placeholder="¥400以上"
                    onChange={(e) => handleMaxChange(e.target.value.replace('¥', ''))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 pb-1.5 pt-5 text-sm text-gray-900 outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* 价格快捷选项 Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {PRICE_RANGES.map((range, idx) => {
                const isActive = activeRangeIndex === idx
                return (
                  <button
                    key={range.label}
                    type="button"
                    onClick={() => handleRangeClick(range, idx)}
                    className={cn(
                      'rounded-lg py-2.5 text-sm font-medium transition-colors border',
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-transparent bg-gray-100/70 text-gray-700 active:bg-gray-200',
                    )}
                  >
                    {range.label}
                  </button>
                )
              })}
            </div>

            {/* --- 星级/钻级部分 --- */}
            <h3 className="text-base font-bold text-gray-900 mb-3">星级/钻级</h3>

            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {STAR_OPTIONS.map((opt) => {
                const isActive = selectedStars.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleStar(opt.id)}
                    className={cn(
                      'flex flex-col items-center rounded-lg py-3 transition-colors border',
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-transparent bg-gray-100/70 text-gray-700 active:bg-gray-200',
                    )}
                  >
                    <span className="text-sm font-medium">{opt.title}</span>
                    <span
                      className={cn(
                        'mt-0.5 text-xs',
                        isActive ? 'text-blue-400' : 'text-gray-400',
                      )}
                    >
                      {opt.subtitle}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed px-1 mb-2">
              酒店未参加星级评定但设施服务达到相应水平，采用钻级分类，仅供参考
            </p>
          </div>

          {/* ===== 底部操作栏 ===== */}
          <div className="flex gap-3 border-t border-gray-100 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shrink-0">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-base font-medium text-gray-700 active:bg-gray-50"
            >
              清空
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-blue-600 py-3 text-base font-medium text-white active:bg-blue-700"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
