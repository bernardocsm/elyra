import { useRef } from 'react'
import SilkSwatch from './SilkSwatch'
import { SILK_COLORS, SOLID_COLORS, GRADIENT_COLORS } from '../../lib/noise'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/workspace'

interface CurrentCover {
  type: string
  value: string
}

interface Props {
  current: CurrentCover
  onSelect: (type: string, value: string) => void
  onRemove: () => void
}

export default function CoverPicker({ current, onSelect, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { workspace } = useStore()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !workspace) return

    const ext = file.name.split('.').pop()
    const path = `covers/${workspace.id}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('workspace-covers')
      .upload(path, file, { upsert: true })

    if (data && !error) {
      const { data: urlData } = supabase.storage
        .from('workspace-covers')
        .getPublicUrl(path)
      onSelect('image', urlData.publicUrl)
    }
  }

  return (
    <div
      className="absolute top-12 left-3 z-[301] w-72 rounded-xl bg-background-main border border-divider shadow-xl p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Silk section */}
      <div>
        <p className="text-[11px] font-semibold text-text-dark-secondary mb-2 uppercase tracking-wider">Silk</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SILK_COLORS.map((c) => (
            <SilkSwatch
              key={c.label}
              color={c}
              active={current.type === 'silk' && current.value === c.label}
              onClick={() => onSelect('silk', c.label)}
            />
          ))}
        </div>
      </div>

      {/* Solid section */}
      <div>
        <p className="text-[11px] font-semibold text-text-dark-secondary mb-2 uppercase tracking-wider">Solid</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SOLID_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onSelect('solid', color)}
              title={color}
              className="h-10 rounded-lg transition-all hover:scale-105"
              style={{
                background: color,
                outline: current.type === 'solid' && current.value === color
                  ? '2px solid #09321F'
                  : '2px solid transparent',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Gradients section */}
      <div>
        <p className="text-[11px] font-semibold text-text-dark-secondary mb-2 uppercase tracking-wider">Gradients</p>
        <div className="grid grid-cols-5 gap-1.5">
          {GRADIENT_COLORS.map((grad) => (
            <button
              key={grad}
              onClick={() => onSelect('gradient', grad)}
              className="h-10 rounded-lg transition-all hover:scale-105"
              style={{
                background: grad,
                outline: current.type === 'gradient' && current.value === grad
                  ? '2px solid #09321F'
                  : '2px solid transparent',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-divider pt-2 space-y-0.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-dark-secondary hover:bg-neutral-dark-5 rounded-lg transition-colors text-left"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
          Upload image
        </button>
        <button
          onClick={onRemove}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent-raspberry hover:bg-neutral-dark-5 rounded-lg transition-colors text-left"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Remove cover
        </button>
      </div>
    </div>
  )
}
