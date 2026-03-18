import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/workspace'
import type { Workspace, Item } from '../types'

async function ensureWorkspace(userId: string) {
  const store = useStore.getState()

  // Fetch or create workspace
  let { data: ws, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !ws) {
    const { data: newWs } = await supabase
      .from('workspaces')
      .insert({ user_id: userId })
      .select()
      .single()
    ws = newWs
  }

  if (!ws) return

  store.setWorkspace(ws as Workspace)

  // Load all items for workspace
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('workspace_id', ws.id)
    .order('position', { ascending: true })

  store.setItems((items as Item[]) ?? [])

  // Load recents
  const { data: recents } = await supabase
    .from('recents')
    .select('item_id')
    .eq('user_id', userId)
    .order('accessed_at', { ascending: false })
    .limit(10)

  store.setRecentIds(recents?.map((r) => r.item_id) ?? [])
}

export function useAuth() {
  const { setUser, setWorkspace, setItems, setRecentIds } = useStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ensureWorkspace(u.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          await ensureWorkspace(u.id)
        } else {
          setWorkspace(null)
          setItems([])
          setRecentIds([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])
}
