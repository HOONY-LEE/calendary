/**
 * Supabase 데이터베이스 헬퍼 함수
 * 
 * CRUD 작업을 위한 유틸리티 함수들
 */

import { supabase } from './supabase'
import type {
  EventInsert,
  EventUpdate,
  TaskInsert,
  TaskUpdate,
  RoutineInsert,
  RoutineUpdate,
  CategoryInsert,
  CategoryUpdate,
} from '../types/database.types'

// ============================================================================
// EVENTS (일정)
// ============================================================================

/**
 * 사용자의 모든 이벤트 가져오기
 */
export const getEvents = async (userId: string, startDate?: string, endDate?: string) => {
  let query = supabase
    .from('events')
    .select('*, categories(*)')
    .eq('user_id', userId)
    .order('start_date', { ascending: true })

  if (startDate) {
    query = query.gte('start_date', startDate)
  }

  if (endDate) {
    query = query.lte('start_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }

  return data
}

/**
 * 이벤트 생성
 */
export const createEvent = async (event: EventInsert) => {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    throw error
  }

  return data
}

/**
 * 이벤트 업데이트
 */
export const updateEvent = async (id: string, updates: EventUpdate) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw error
  }

  return data
}

/**
 * 이벤트 삭제
 */
export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting event:', error)
    throw error
  }
}

/**
 * 반복 일정의 특정 인스턴스 수정 (예외 생성)
 */
export const createEventException = async (
  recurringEventId: string,
  exceptionDate: string,
  updates: Partial<EventInsert>
) => {
  // 원본 반복 일정 가져오기
  const { data: originalEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', recurringEventId)
    .single()

  if (fetchError) {
    console.error('Error fetching recurring event:', fetchError)
    throw fetchError
  }

  // 예외 이벤트 생성
  const exceptionEvent: EventInsert = {
    ...originalEvent,
    ...updates,
    id: undefined, // 새로운 ID 생성
    recurrence_id: recurringEventId,
    is_exception: true,
    exception_date: exceptionDate,
  }

  return createEvent(exceptionEvent)
}

// ============================================================================
// TASKS (작업)
// ============================================================================

/**
 * 사용자의 모든 작업 가져오기
 */
export const getTasks = async (userId: string, includeCompleted = true) => {
  let query = supabase
    .from('tasks')
    .select('*, categories(*)')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (!includeCompleted) {
    query = query.eq('is_completed', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tasks:', error)
    throw error
  }

  return data
}

/**
 * 작업 생성
 */
export const createTask = async (task: TaskInsert) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw error
  }

  return data
}

/**
 * 작업 업데이트
 */
export const updateTask = async (id: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    throw error
  }

  return data
}

/**
 * 작업 완료/미완료 토글
 */
export const toggleTaskCompletion = async (id: string, isCompleted: boolean) => {
  return updateTask(id, {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
  })
}

/**
 * 작업 삭제
 */
export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    throw error
  }
}

// ============================================================================
// ROUTINES (루틴)
// ============================================================================

/**
 * 사용자의 모든 루틴 가져오기
 */
export const getRoutines = async (userId: string, activeOnly = true) => {
  let query = supabase
    .from('routines')
    .select('*, categories(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching routines:', error)
    throw error
  }

  return data
}

/**
 * 루틴 생성
 */
export const createRoutine = async (routine: RoutineInsert) => {
  const { data, error } = await supabase
    .from('routines')
    .insert(routine)
    .select()
    .single()

  if (error) {
    console.error('Error creating routine:', error)
    throw error
  }

  return data
}

/**
 * 루틴 업데이트
 */
export const updateRoutine = async (id: string, updates: RoutineUpdate) => {
  const { data, error } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating routine:', error)
    throw error
  }

  return data
}

/**
 * 루틴 삭제
 */
export const deleteRoutine = async (id: string) => {
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting routine:', error)
    throw error
  }
}

/**
 * 루틴 완료 기록 추가
 */
export const completeRoutine = async (
  routineId: string,
  userId: string,
  date: string,
  checklistState?: any,
  notes?: string
) => {
  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      routine_id: routineId,
      user_id: userId,
      completion_date: date,
      completion_time: new Date().toTimeString().split(' ')[0],
      checklist_state: checklistState,
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error completing routine:', error)
    throw error
  }

  return data
}

/**
 * 루틴 완료 기록 가져오기
 */
export const getRoutineCompletions = async (
  routineId: string,
  startDate?: string,
  endDate?: string
) => {
  let query = supabase
    .from('routine_completions')
    .select('*')
    .eq('routine_id', routineId)
    .order('completion_date', { ascending: false })

  if (startDate) {
    query = query.gte('completion_date', startDate)
  }

  if (endDate) {
    query = query.lte('completion_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching routine completions:', error)
    throw error
  }

  return data
}

// ============================================================================
// CATEGORIES (카테고리)
// ============================================================================

/**
 * 사용자의 모든 카테고리 가져오기
 */
export const getCategories = async (userId: string, type?: string[]) => {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (type) {
    query = query.contains('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching categories:', error)
    throw error
  }

  return data
}

/**
 * 카테고리 생성
 */
export const createCategory = async (category: CategoryInsert) => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    throw error
  }

  return data
}

/**
 * 카테고리 업데이트
 */
export const updateCategory = async (id: string, updates: CategoryUpdate) => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    throw error
  }

  return data
}

/**
 * 카테고리 삭제
 */
export const deleteCategory = async (id: string) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}

// ============================================================================
// ANALYTICS (통계)
// ============================================================================

/**
 * 특정 기간의 analytics 데이터 가져오기
 */
export const getAnalytics = async (
  userId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching analytics:', error)
    throw error
  }

  return data
}

/**
 * 일별 analytics 데이터 생성/업데이트
 */
export const upsertAnalytics = async (
  userId: string,
  date: string,
  analyticsData: any
) => {
  const { data, error } = await supabase
    .from('analytics')
    .upsert(
      {
        user_id: userId,
        date,
        ...analyticsData,
      },
      {
        onConflict: 'user_id,date',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting analytics:', error)
    throw error
  }

  return data
}
