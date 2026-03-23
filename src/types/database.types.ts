/**
 * Calendary - Supabase 데이터베이스 타입 정의
 * 
 * 이 파일은 Supabase CLI를 사용하여 자동 생성할 수 있습니다:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string
          language: 'ko' | 'en' | 'zh'
          theme: 'light' | 'dark' | 'system'
          google_calendar_connected: boolean
          google_refresh_token: string | null
          google_access_token: string | null
          google_token_expiry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: 'ko' | 'en' | 'zh'
          theme?: 'light' | 'dark' | 'system'
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          google_access_token?: string | null
          google_token_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: 'ko' | 'en' | 'zh'
          theme?: 'light' | 'dark' | 'system'
          google_calendar_connected?: boolean
          google_refresh_token?: string | null
          google_access_token?: string | null
          google_token_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string | null
          type: ('calendar' | 'task' | 'routine')[]
          is_default: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          icon?: string | null
          type?: ('calendar' | 'task' | 'routine')[]
          is_default?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          icon?: string | null
          type?: ('calendar' | 'task' | 'routine')[]
          is_default?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          start_time: string | null
          end_time: string | null
          is_all_day: boolean
          is_recurring: boolean
          rrule: string | null
          recurrence_freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval: number | null
          recurrence_byweekday: number[] | null
          recurrence_until: string | null
          recurrence_count: number | null
          recurrence_id: string | null
          is_exception: boolean
          exception_date: string | null
          google_event_id: string | null
          google_calendar_id: string | null
          synced_at: string | null
          location: string | null
          attendees: Json | null
          reminders: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          start_date: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          is_all_day?: boolean
          is_recurring?: boolean
          rrule?: string | null
          recurrence_freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval?: number | null
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          recurrence_count?: number | null
          recurrence_id?: string | null
          is_exception?: boolean
          exception_date?: string | null
          google_event_id?: string | null
          google_calendar_id?: string | null
          synced_at?: string | null
          location?: string | null
          attendees?: Json | null
          reminders?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          is_all_day?: boolean
          is_recurring?: boolean
          rrule?: string | null
          recurrence_freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval?: number | null
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          recurrence_count?: number | null
          recurrence_id?: string | null
          is_exception?: boolean
          exception_date?: string | null
          google_event_id?: string | null
          google_calendar_id?: string | null
          synced_at?: string | null
          location?: string | null
          attendees?: Json | null
          reminders?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          is_completed: boolean
          completed_at: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          due_time: string | null
          is_recurring: boolean
          rrule: string | null
          recurrence_freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval: number | null
          recurrence_byweekday: number[] | null
          recurrence_until: string | null
          recurrence_count: number | null
          parent_task_id: string | null
          tags: string[] | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          is_completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          due_time?: string | null
          is_recurring?: boolean
          rrule?: string | null
          recurrence_freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval?: number | null
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          recurrence_count?: number | null
          parent_task_id?: string | null
          tags?: string[] | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          is_completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          due_time?: string | null
          is_recurring?: boolean
          rrule?: string | null
          recurrence_freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
          recurrence_interval?: number | null
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          recurrence_count?: number | null
          parent_task_id?: string | null
          tags?: string[] | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      routines: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          routine_type: 'morning' | 'daily' | 'evening' | 'weekly' | 'custom'
          rrule: string
          recurrence_freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
          recurrence_interval: number
          recurrence_byweekday: number[] | null
          recurrence_until: string | null
          preferred_time: string | null
          estimated_duration: number | null
          checklist: Json | null
          is_active: boolean
          reminders: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          routine_type?: 'morning' | 'daily' | 'evening' | 'weekly' | 'custom'
          rrule: string
          recurrence_freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
          recurrence_interval?: number
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          preferred_time?: string | null
          estimated_duration?: number | null
          checklist?: Json | null
          is_active?: boolean
          reminders?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          routine_type?: 'morning' | 'daily' | 'evening' | 'weekly' | 'custom'
          rrule?: string
          recurrence_freq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
          recurrence_interval?: number
          recurrence_byweekday?: number[] | null
          recurrence_until?: string | null
          preferred_time?: string | null
          estimated_duration?: number | null
          checklist?: Json | null
          is_active?: boolean
          reminders?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      routine_completions: {
        Row: {
          id: string
          routine_id: string
          user_id: string
          completion_date: string
          completion_time: string | null
          checklist_state: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          user_id: string
          completion_date: string
          completion_time?: string | null
          checklist_state?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          routine_id?: string
          user_id?: string
          completion_date?: string
          completion_time?: string | null
          checklist_state?: Json | null
          notes?: string | null
          created_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          user_id: string
          date: string
          events_count: number
          events_completed: number
          events_duration_minutes: number
          tasks_count: number
          tasks_completed: number
          tasks_completion_rate: number | null
          routines_count: number
          routines_completed: number
          routines_completion_rate: number | null
          category_distribution: Json | null
          productivity_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          events_count?: number
          events_completed?: number
          events_duration_minutes?: number
          tasks_count?: number
          tasks_completed?: number
          tasks_completion_rate?: number | null
          routines_count?: number
          routines_completed?: number
          routines_completion_rate?: number | null
          category_distribution?: Json | null
          productivity_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          events_count?: number
          events_completed?: number
          events_duration_minutes?: number
          tasks_count?: number
          tasks_completed?: number
          tasks_completion_rate?: number | null
          routines_count?: number
          routines_completed?: number
          routines_completion_rate?: number | null
          category_distribution?: Json | null
          productivity_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      google_calendar_sync: {
        Row: {
          id: string
          user_id: string
          google_calendar_id: string
          calendar_name: string | null
          calendar_description: string | null
          is_primary: boolean
          sync_enabled: boolean
          sync_direction: 'import_only' | 'export_only' | 'bidirectional'
          last_sync_at: string | null
          last_sync_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          google_calendar_id: string
          calendar_name?: string | null
          calendar_description?: string | null
          is_primary?: boolean
          sync_enabled?: boolean
          sync_direction?: 'import_only' | 'export_only' | 'bidirectional'
          last_sync_at?: string | null
          last_sync_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          google_calendar_id?: string
          calendar_name?: string | null
          calendar_description?: string | null
          is_primary?: boolean
          sync_enabled?: boolean
          sync_direction?: 'import_only' | 'export_only' | 'bidirectional'
          last_sync_at?: string | null
          last_sync_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// 편의를 위한 타입 alias
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Routine = Database['public']['Tables']['routines']['Row']
export type RoutineCompletion = Database['public']['Tables']['routine_completions']['Row']
export type Analytics = Database['public']['Tables']['analytics']['Row']
export type GoogleCalendarSync = Database['public']['Tables']['google_calendar_sync']['Row']

// Insert 타입
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type RoutineInsert = Database['public']['Tables']['routines']['Insert']
export type RoutineCompletionInsert = Database['public']['Tables']['routine_completions']['Insert']
export type AnalyticsInsert = Database['public']['Tables']['analytics']['Insert']
export type GoogleCalendarSyncInsert = Database['public']['Tables']['google_calendar_sync']['Insert']

// Update 타입
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']
export type RoutineUpdate = Database['public']['Tables']['routines']['Update']
export type RoutineCompletionUpdate = Database['public']['Tables']['routine_completions']['Update']
export type AnalyticsUpdate = Database['public']['Tables']['analytics']['Update']
export type GoogleCalendarSyncUpdate = Database['public']['Tables']['google_calendar_sync']['Update']

// 반복 일정 관련 타입
export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  byweekday?: number[] // 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU
  until?: string // ISO date string
  count?: number
}

// Attendee 타입
export interface Attendee {
  email: string
  name?: string
  status?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
}

// Reminder 타입
export interface Reminder {
  minutes: number
  method: 'email' | 'notification' | 'popup'
}

// Checklist 아이템 타입
export interface ChecklistItem {
  id: string
  title: string
  is_completed: boolean
  order_index?: number
}

// 카테고리 분배 타입
export interface CategoryDistribution {
  [category_id: string]: number // minutes
}