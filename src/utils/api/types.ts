/**
 * Compatibility barrel for PPF product/domain types.
 *
 * New definitions live under `src/features/<domain>/types.ts`; frozen wire DTOs
 * remain generated from PPB OpenAPI in `generated.ts`. New feature code should
 * import its own domain module directly rather than growing this barrel.
 */
export * from '../../features/common/types'
export * from '../../features/common/errors'
export * from '../../features/public/types'
export * from '../../features/account/types'
export * from '../../features/rooms/types'
export * from '../../features/charts/types'
export * from '../../features/social/types'
export * from '../../features/replay/types'
export * from '../../features/notifications/types'
export * from '../../features/preferences/types'

import type { PublicMeta } from '../../features/public/types'

export function hasCapability(meta: PublicMeta, capability: string): boolean {
  return meta.capabilities.includes(capability)
}

export function hasPmpCapability(meta: PublicMeta, capability: string): boolean {
  return meta.pmp.capabilities.includes(capability)
}

export function roomsAvailable(meta: PublicMeta | null | undefined): boolean {
  return Boolean(meta?.capabilities.includes('rooms.v1'))
}
