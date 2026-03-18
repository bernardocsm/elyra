import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useStore } from '../../store/workspace'
import { supabase } from '../../lib/supabase'

interface Props {
  itemId: string
}

export default function NoteEditor({ itemId }: Props) {
  const { items, updateItem } = useStore()
  const item = items.find((i) => i.id === itemId)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: (typeof item?.content === 'string' ? item.content : '') ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none text-text-dark-primary min-h-[400px]',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html === lastSaved.current) return

      // Optimistic update in store
      updateItem(itemId, { content: html, updated_at: new Date().toISOString() })

      // Debounced persist
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await supabase.from('items').update({ content: html }).eq('id', itemId)
        lastSaved.current = html
      }, 500)
    },
  })

  // Update editor content if item changes externally (realtime)
  useEffect(() => {
    if (!editor || !item) return
    const html = typeof item.content === 'string' ? item.content : ''
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html, false)
    }
  }, [item?.content])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  if (!item) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title */}
      <div className="px-8 pt-8 pb-2 shrink-0">
        <input
          type="text"
          value={item.name}
          onChange={(e) => {
            const name = e.target.value
            updateItem(itemId, { name })
            if (saveTimer.current) clearTimeout(saveTimer.current)
            saveTimer.current = setTimeout(() => {
              supabase.from('items').update({ name }).eq('id', itemId)
            }, 500)
          }}
          placeholder="Untitled"
          className="w-full text-2xl font-semibold text-text-dark-primary bg-transparent border-none outline-none placeholder:text-text-dark-secondary/40"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
