import { useCallback, useMemo } from "react"
import { useLocalStorage } from "./useLocalStorage"
import { LS_KEYS, LIMITS } from "../constants"

type ExercisePrefs = {
  favoriteIds: string[]
  recentIds: string[]
}

const defaultPrefs: ExercisePrefs = { favoriteIds: [], recentIds: [] }

export function useExercisePreferences() {
  // Hvis din useLocalStorage krever (key, initialValue) og returnerer [value, setValue]
  const [prefs, setPrefs] = useLocalStorage<ExercisePrefs>(
    LS_KEYS.exercisePrefs,
    defaultPrefs
  )

  const favoriteSet = useMemo(() => new Set(prefs?.favoriteIds ?? []), [prefs?.favoriteIds])
  const recentIds = prefs?.recentIds ?? []
  const favoriteIds = prefs?.favoriteIds ?? []

  const isFavorite = useCallback((id: string) => favoriteSet.has(id), [favoriteSet])

  const toggleFavorite = useCallback(
    (id: string) => {
      setPrefs(prev => {
        const safePrev = prev ?? defaultPrefs
        const exists = safePrev.favoriteIds.includes(id)
        const nextFavorites = exists
          ? safePrev.favoriteIds.filter(x => x !== id)
          : [id, ...safePrev.favoriteIds.filter(x => x !== id)]

        return { ...safePrev, favoriteIds: nextFavorites }
      })
    },
    [setPrefs]
  )

  const addRecent = useCallback(
    (id: string) => {
      setPrefs(prev => {
        const safePrev = prev ?? defaultPrefs
        const nextRecents = [id, ...safePrev.recentIds.filter(x => x !== id)].slice(
          0,
          LIMITS.recents
        )
        return { ...safePrev, recentIds: nextRecents }
      })
    },
    [setPrefs]
  )

  const clearRecents = useCallback(() => {
    setPrefs(prev => {
      const safePrev = prev ?? defaultPrefs
      return { ...safePrev, recentIds: [] }
    })
  }, [setPrefs])

  return {
    favoriteIds,
    recentIds,
    isFavorite,
    toggleFavorite,
    addRecent,
    clearRecents,
  }
}
