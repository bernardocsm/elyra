import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/workspace'
import type { Workspace, Item } from '../types'

async function ensureWorkspace(userId: string) {
  const store = useStore.getState()

  try {
    // Fetch or create workspace
    let { data: ws, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !ws) {
      const { data: newWs, error: insertError } = await supabase
        .from('workspaces')
        .insert({ user_id: userId })
        .select()
        .single()
      if (insertError) throw insertError
      ws = newWs
    }

    if (!ws) throw new Error('Could not fetch or create workspace')

    store.setWorkspace(ws as Workspace)

    // Load all items for workspace (include deleted so trash view works)
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
  } catch (err) {
    console.error('[ensureWorkspace] failed:', err)
    // Still mark workspace as null so App.tsx doesn't spin forever
    // The user will see the login page again
    store.setUser(null)
  }
}

export function useAuth() {
  const { setUser, setWorkspace, setItems, setRecentIds } = useStore()

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on mount — handles both
    // the first load and subsequent sign-in / sign-out events.
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
