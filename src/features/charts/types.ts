import type { PaginationParams } from '../common/types'

export interface Chart { id: number, name: string, artist?: string, charter?: string, difficulty?: number, rating?: number, level?: string, type?: string, tags?: string[], cover_url?: string, file_url?: string, play_count?: number, updated_at?: string }
export interface ChartListParams extends PaginationParams { search?: string, type?: string, difficulty_min?: number, difficulty_max?: number, rating_min?: number, rating_max?: number, tags?: string[], order?: 'updated' | 'popular' | 'rating' | 'plays' }
export interface ChartRecord { id?: number, user_id?: number, username?: string, score: number, accuracy?: number, combo?: number, rank?: number, is_self?: boolean, updated_at?: string }
export interface ChartDetail extends Chart { records?: ChartRecord[], my_best?: ChartRecord | null, source: 'phira' | 'phira_plus' }
