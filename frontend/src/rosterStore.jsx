// Shared roster + snapshot state, persisted in localStorage so CSV imports
// and follower snapshots survive reloads and are shared across pages.
import { useLocalStorage } from '@mantine/hooks'
import { createContext, useContext, useMemo } from 'react'
import { seedRoster } from './talentMatchData'

const RosterContext = createContext(null)

export function RosterProvider({ children }) {
  const [storedRoster, setStoredRoster] = useLocalStorage({
    key: 'cm-roster-v1',
    defaultValue: null,
  })
  const [snapshots, setSnapshots] = useLocalStorage({
    key: 'tm-follower-snapshots-v1',
    defaultValue: [],
  })

  const value = useMemo(() => {
    const roster = Array.isArray(storedRoster) && storedRoster.length ? storedRoster : seedRoster()
    return {
      roster,
      isCustom: Array.isArray(storedRoster) && storedRoster.length > 0,
      setRoster: setStoredRoster,
      resetRoster: () => setStoredRoster(null),
      snapshots: Array.isArray(snapshots) ? snapshots : [],
      setSnapshots,
    }
  }, [storedRoster, snapshots, setStoredRoster, setSnapshots])

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
}

export function useRoster() {
  const ctx = useContext(RosterContext)
  if (!ctx) throw new Error('useRoster must be used inside RosterProvider')
  return ctx
}
