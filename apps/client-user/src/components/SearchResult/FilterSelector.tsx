import { useCallback, useEffect, useRef, useState } from 'react'

interface FilterSelectorProps {
  visible: boolean
  value: string[]
  onChange: (tags: string[]) => void
  onClose: () => void
  topOffset: number
}

const HISTORY_KEY = 'historyHotelTags'
const MAX_HISTORY = 10

interface TagCategory {
  label: string
  tags: string[]
}

const TAG_CATEGORIES: TagCategory[] = [
  { label: '热门筛选', tags: ['钟点房', '家庭套房', '免费停车', '近地铁', '含早', '隔音极佳'] },
  { label: '商务基础', tags: ['免费WIFI', '含早', '免费停车', '24小时前台', '行李寄存', '近地铁'] },
  { label: '设施进阶', tags: ['健身房', '恒温游泳池', 'SPA', '会议室', '接机服务', '咖啡厅', '自助洗衣房', '智能客控', '机器人送物'] },
  { label: '情侣/度假', tags: ['情侣主题', '带浴缸', '全景落地窗', '海景/江景', '氛围感灯光', '隔音极佳', '私人影院'] },
  { label: '亲子/家庭', tags: ['儿童乐园', '家庭套房', '提供婴儿床', '亲子活动'] },
  { label: '电竞/特色', tags: ['高配电脑', '千兆光纤', '电竞椅', '宠物友好'] },
]

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeHistory(tags: string[]) {
  try {
    const prev = readHistory()
    const merged = Array.from(new Set([...tags, ...prev])).slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(merged))
  } catch { /* ignore */ }
}

export default function FilterSelector({
  visible,
  value,
  onChange,
  onClose,
  topOffset,
}: FilterSelectorProps) {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(1)

  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set())
  const [activeIdx, setActiveIdx] = useState(0)
  const [history, setHistory] = useState<string[]>([])

  const rightRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const isClickScrolling = useRef(false)

  const allCategories: TagCategory[] = history.length > 0
    ? [{ label: '历史记录', tags: history }, ...TAG_CATEGORIES]
    : TAG_CATEGORIES

  useEffect(() => {
    if (visible) {
      clearTimeout(timerRef.current)
      setTempSelected(new Set(value))
      setHistory(readHistory())
      setActiveIdx(0)
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true))
      })
    } else {
      setShow(false)
      timerRef.current = setTimeout(() => setMounted(false), 300)
    }
    return () => clearTimeout(timerRef.current)
  }, [visible, value])

  const toggleTag = useCallback((tag: string) => {
    setTempSelected(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const handleMenuClick = useCallback((idx: number) => {
    const el = sectionRefs.current[idx]
    if (!el || !rightRef.current) return
    isClickScrolling.current = true
    setActiveIdx(idx)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { isClickScrolling.current = false }, 400)
  }, [])

  const handleScroll = useCallback(() => {
    if (isClickScrolling.current) return
    const container = rightRef.current
    if (!container) return
    const scrollTop = container.scrollTop
    let current = 0
    for (let i = sectionRefs.current.length - 1; i >= 0; i--) {
      const el = sectionRefs.current[i]
      if (el && el.offsetTop <= scrollTop + 8) {
        current = i
        break
      }
    }
    setActiveIdx(current)
  }, [])

  const handleClear = useCallback(() => {
    setTempSelected(new Set())
  }, [])

  const handleConfirm = useCallback(() => {
    const tags = Array.from(tempSelected)
    if (tags.length > 0) writeHistory(tags)
    onChange(tags)
    onClose()
  }, [tempSelected, onChange, onClose])

  if (!mounted) return null

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-[35]"
      style={{ top: topOffset }}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          show ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
        <div
          className={`bg-white shadow-lg transition-transform duration-300 ease-out flex flex-col ${
            show ? 'translate-y-0' : '-translate-y-full'
          }`}
          style={{ maxHeight: `calc(100vh - ${topOffset}px - 60px)` }}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left menu */}
            <div className="w-1/4 bg-blue-50 overflow-y-auto shrink-0">
              {allCategories.map((cat, idx) => {
                const hasSelected = cat.tags.some(t => tempSelected.has(t))
                return (
                  <div
                    key={cat.label}
                    className={`relative px-3 py-3.5 text-xs cursor-pointer transition-colors ${
                      activeIdx === idx ? 'bg-white font-bold text-gray-900' : 'text-gray-600'
                    }`}
                    onClick={() => handleMenuClick(idx)}
                  >
                    {cat.label}
                    {hasSelected && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right content */}
            <div
              ref={rightRef}
              className="flex-1 overflow-y-auto px-3 py-2"
              onScroll={handleScroll}
            >
              {allCategories.map((cat, idx) => (
                <div
                  key={cat.label}
                  ref={(el) => { sectionRefs.current[idx] = el }}
                >
                  <div className="text-xs font-bold text-gray-700 mb-2 mt-2">{cat.label}</div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {cat.tags.map(tag => {
                      const selected = tempSelected.has(tag)
                      return (
                        <div
                          key={tag}
                          className={`text-center text-xs py-2 rounded-md cursor-pointer transition-colors ${
                            selected
                              ? 'bg-blue-50 text-blue-600 border border-blue-400 font-bold'
                              : 'bg-gray-100 text-gray-700 border border-transparent'
                          }`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center border-t border-gray-100 px-4 py-3 gap-3 shrink-0">
            <button
              type="button"
              className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 active:bg-gray-50"
              onClick={handleClear}
            >
              清空
            </button>
            <button
              type="button"
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white active:bg-blue-700"
              onClick={handleConfirm}
            >
              完成{tempSelected.size > 0 ? `(${tempSelected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
