import type { components } from '../../utils/api/generated'

export type { components as GeneratedComponents } from '../../utils/api/generated'
export type PaginationResponse = components['schemas']['PaginationResponse']
export type RoomActionRequest = components['schemas']['RoomActionRequest']

export interface PaginationParams {
  page?: number
  pageNum?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageNum: number
}
