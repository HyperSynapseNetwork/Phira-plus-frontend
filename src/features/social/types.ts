export interface UserStats { plays?: number; avg_accuracy?: number; best_score?: number; total_score?: number }
export interface UserProfile { phira_id: number; username: string; avatar?: string | null; bio?: string; background_url?: string | null; online_status?: 'online' | 'offline' | 'hidden'; profile_visibility?: 'public' | 'friends' | 'private'; rks?: number | null; stats?: UserStats; friends_count?: number; is_friend?: boolean; is_blocked?: boolean }
export interface Friend { phira_id: number; username: string; avatar?: string | null; online_status?: 'online' | 'offline' | 'hidden' }
export interface FriendRequest { id: string; from?: Friend; to?: Friend; status: 'pending' | 'accepted' | 'rejected' | 'blocked'; created_at: string }
