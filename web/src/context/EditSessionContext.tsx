import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// Lets whichever admin CMS section is mid-edit (currently: the product edit
// draft in AdminProducts) register itself so the top-level Content bar's
// Save/Undo/Reset buttons — and the live preview pane's target route — are
// wired to the thing actually being edited, instead of being decorative.
export interface EditSession {
  label: string
  isDirty: boolean
  canUndo: boolean
  save: () => void | Promise<void>
  undo: () => void
  reset: () => void
  previewPath: string
}

interface EditSessionContextValue {
  session: EditSession | null
  setSession: (session: EditSession | null) => void
}

const EditSessionContext = createContext<EditSessionContextValue | null>(null)

export function EditSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<EditSession | null>(null)
  const value = useMemo(() => ({ session, setSession }), [session])
  return <EditSessionContext.Provider value={value}>{children}</EditSessionContext.Provider>
}

export function useEditSession() {
  const ctx = useContext(EditSessionContext)
  if (!ctx) throw new Error('useEditSession must be used within an EditSessionProvider')
  return ctx
}
