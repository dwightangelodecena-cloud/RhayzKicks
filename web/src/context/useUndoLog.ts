import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditSession } from './EditSessionContext'

// Shared by every CMS tab that saves each change instantly (no draft/Save
// step) but still wants working Undo/Reset: call `record(label, undo)`
// right after a successful write, passing a function that reverses it.
// Undo pops and replays the most recent entry; Reset replays all of them,
// most-recent-first, back to when the tab/session was opened. Nothing here
// is ever "unsaved" — Save stays disabled since every action already
// persisted to Supabase the instant it happened.
interface UndoEntry {
  label: string
  undo: () => Promise<void>
}

interface UseUndoLogOptions {
  sessionLabel: string
  previewPath: string
  onAfterUndo: () => void | Promise<void>
  // Set while a specific item is open for editing, so the preview jumps
  // there the moment editing starts — not only after the first save/undo
  // (which is what `sessionLabel`/`previewPath` alone would otherwise wait
  // for, since a session normally only exists once the undo stack is non-empty).
  active?: { label: string; previewPath: string } | null
}

export function useUndoLog({ sessionLabel, previewPath, onAfterUndo, active }: UseUndoLogOptions) {
  const [stack, setStack] = useState<UndoEntry[]>([])
  const { setSession } = useEditSession()
  const stackRef = useRef(stack)
  stackRef.current = stack

  const record = useCallback((label: string, undo: () => Promise<void>) => {
    setStack((s) => [...s, { label, undo }])
  }, [])

  const undoOne = useCallback(async () => {
    const current = stackRef.current
    const entry = current[current.length - 1]
    if (!entry) return
    await entry.undo()
    setStack((s) => {
      const idx = s.lastIndexOf(entry)
      if (idx === -1) return s
      return [...s.slice(0, idx), ...s.slice(idx + 1)]
    })
    await onAfterUndo()
  }, [onAfterUndo])

  const undoAll = useCallback(async () => {
    const entries = [...stackRef.current].reverse()
    for (const entry of entries) {
      await entry.undo()
    }
    setStack([])
    await onAfterUndo()
  }, [onAfterUndo])

  useEffect(() => {
    if (active) {
      setSession({
        label: active.label,
        isDirty: false,
        canUndo: stack.length > 0,
        save: () => {},
        undo: undoOne,
        reset: undoAll,
        previewPath: active.previewPath,
      })
      return () => setSession(null)
    }
    if (stack.length === 0) {
      setSession(null)
      return
    }
    setSession({
      label: `${sessionLabel} — ${stack.length} change${stack.length === 1 ? '' : 's'}`,
      isDirty: false,
      canUndo: true,
      save: () => {},
      undo: undoOne,
      reset: undoAll,
      previewPath,
    })
    return () => setSession(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stack.length, sessionLabel, previewPath, undoOne, undoAll, active?.label, active?.previewPath])

  return { record }
}
