import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { projectId, publicAnonKey } from '../../lib/supabase-info';
import { categoriesAPI, tasksAPI } from '../../lib/api';
import { getGoogleToken } from '../../lib/google-token';

interface Task {
  id: number | string;
  title: string;
  category: string;
  categoryName?: string;
  type: 'single' | 'routine' | 'event';
  completed: boolean;
  date: string;
  googleTaskId?: string;
  googleListId?: string;
  googleListName?: string;
  notes?: string;
  isGoogleTask?: boolean;
  createdAt?: string;
  orderIndex?: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface GoogleTaskList {
  id: string;
  title: string;
}

interface TasksCache {
  data: Task[];
  timestamp: number;
}

interface CategoriesCache {
  data: Category[];
  timestamp: number;
}

interface TasksContextType {
  tasks: Task[];
  categories: Category[];
  googleTaskLists: GoogleTaskList[];
  isLoading: boolean;
  isLoadingCategories: boolean;
  isLoadingTasks: boolean;
  isLoadingGoogleTasks: boolean;
  needsReauth: boolean;
  apiNotEnabled: boolean;
  currentDate: string; // 🔥 현재 선택된 날짜
  setCurrentDate: (date: string) => void; // 🔥 날짜 변경
  refreshTasks: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<Task | null>;
  updateTask: (id: number | string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: number | string) => Promise<void>;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  saveTaskOrder: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setNeedsReauth: (value: boolean) => void;
  setApiNotEnabled: (value: boolean) => void;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

const CACHE_TTL = 5 * 60 * 1000; // 5분

export function TasksProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, hasGoogleTasks } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [googleTaskLists, setGoogleTaskLists] = useState<GoogleTaskList[]>([]);
  
  const [tasksCache, setTasksCache] = useState<TasksCache | null>(null);
  const [categoriesCache, setCategoriesCache] = useState<CategoriesCache | null>(null);
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingGoogleTasks, setIsLoadingGoogleTasks] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [apiNotEnabled, setApiNotEnabled] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false); // 🔥 초기화 완료 플래그
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]); // 🔥 현재 선택된 날짜

  const isLoading = isLoadingCategories || isLoadingTasks || isLoadingGoogleTasks;

  // 🔥 카테고리 로드 (캐시 포함)
  const loadCategories = async (forceRefresh = false): Promise<Category[]> => {
    if (!session || authLoading) {
      console.log('[TasksContext] Skipping category load - no session');
      return [];
    }

    // 🔥 추가 디버깅: access_token 확인
    if (!session.access_token) {
      console.error('[TasksContext] ❌ CRITICAL: session.access_token is missing!');
      console.error('[TasksContext] Session details:', {
        hasSession: !!session,
        hasUser: !!session.user,
        email: session.user?.email,
        hasAccessToken: !!session.access_token,
        hasProviderToken: !!getGoogleToken(session),
      });
      return [];
    }

    console.log('[TasksContext] ✅ Access token validated (length:', session.access_token.length, ')');

    // 캐시 확인
    if (!forceRefresh && categoriesCache) {
      const age = Date.now() - categoriesCache.timestamp;
      if (age < CACHE_TTL) {
        console.log(`[TasksContext] 📦 Using cached categories (age: ${Math.round(age / 1000)}s)`);
        setCategories(categoriesCache.data);
        return categoriesCache.data;
      } else {
        console.log('[TasksContext] Cache expired, fetching fresh data...');
      }
    }

    setIsLoadingCategories(true);

    try {
      // 🔥 categoriesAPI 사용
      const dbCategories = await categoriesAPI.getAll(session.access_token);
      
      const cats = dbCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      }));
      
      console.log('[TasksContext] ✅ Loaded', cats.length, 'categories');
      
      // 캐시 저장
      setCategoriesCache({ data: cats, timestamp: Date.now() });
      setCategories(cats);
      return cats;
    } catch (error) {
      console.error('[TasksContext] Failed to load categories:', error);
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // 🔥 로컬 Tasks 로드 (캐시 포함)
  const loadLocalTasks = async (forceRefresh = false): Promise<Task[]> => {
    if (!session || authLoading) {
      console.log('[TasksContext] Skipping tasks load - no session');
      return [];
    }

    // 캐시 확인
    if (!forceRefresh && tasksCache) {
      const age = Date.now() - tasksCache.timestamp;
      if (age < CACHE_TTL) {
        console.log(`[TasksContext] 📦 Using cached tasks (age: ${Math.round(age / 1000)}s)`);
        const localTasks = tasksCache.data.filter(t => !t.isGoogleTask);
        return localTasks;
      } else {
        console.log('[TasksContext] Cache expired, fetching fresh data...');
      }
    }

    setIsLoadingTasks(true);

    try {
      // 🔥 tasksAPI 사용
      const dbTasks = await tasksAPI.getAll(session.access_token);
      
      const localTasks = dbTasks.map((t) => {
        const cat = categories.find((c) => c.id === t.category_id);

        return {
          id: t.id,
          title: t.title,
          category: cat?.name || '기타',
          type: t.task_type,
          completed: t.is_completed,
          date: t.due_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          notes: t.notes,
          isGoogleTask: false,
          createdAt: t.created_at,
          orderIndex: t.order_index ?? 0,
        };
      })
      // order_index 기준 정렬 (같으면 생성시간 순)
      .sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) {
          return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
        }
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
      
      console.log('[TasksContext] ✅ Loaded', localTasks.length, 'tasks');
      return localTasks;
    } catch (error) {
      console.error('[TasksContext] Failed to load tasks:', error);
      return [];
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // 🔥 구글 Tasks 로드
  const loadGoogleTasks = async (): Promise<Task[]> => {
    if (!hasGoogleTasks) {
      console.log('[TasksContext] ⚠️ Google Tasks 권한 없음 - 스킵');
      return [];
    }

    if (!session || authLoading) {
      console.log('[TasksContext] No active session');
      return [];
    }

    if (!getGoogleToken(session)) {
      console.log('[TasksContext] No Google provider token');
      return [];
    }

    setIsLoadingGoogleTasks(true);
    setNeedsReauth(false);
    setApiNotEnabled(false);

    try {
      console.log('[TasksContext] 📡 Fetching Google Tasks from server...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-tasks/tasks`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'X-User-JWT': session.access_token,
            'X-Google-Access-Token': getGoogleToken(session),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to fetch Google Tasks: ${response.status}`;
        try {
          const errorData = await response.json();
          console.warn('[TasksContext] Google Tasks API error:', errorData.error?.substring(0, 200));
          
          if (errorData.error?.includes('API has not been used') ||
              errorData.error?.includes('SERVICE_DISABLED') ||
              errorData.error?.includes('accessNotConfigured') ||
              errorData.error?.includes('API not enabled')) {
            console.warn('[TasksContext] Google Tasks API not enabled');
            setApiNotEnabled(true);
            return [];
          }
          
          if (response.status === 403 || 
              errorData.error?.includes('insufficient authentication scopes') ||
              errorData.error?.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
              (errorData.error?.includes('PERMISSION_DENIED') && !errorData.error?.includes('SERVICE_DISABLED'))) {
            console.warn('[TasksContext] Insufficient Google Tasks scopes');
            setNeedsReauth(true);
            return [];
          }
          
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패
        }
        
        console.warn('[TasksContext] Google Tasks unavailable:', errorMessage.substring(0, 100));
        return [];
      }

      const data = await response.json();
      console.log('[TasksContext] ✅ Google Tasks loaded:', data.tasks?.length || 0);
      console.log('[TasksContext] Found task lists:', data.lists?.length || 0);

      if (data.lists) {
        setGoogleTaskLists(data.lists);
      }

      if (data.tasks && data.tasks.length > 0) {
        const googleTasks = data.tasks.map((googleTask: any) => ({
          id: `google-${googleTask.id}`,
          title: googleTask.title || 'Untitled',
          category: googleTask.taskListTitle || 'Google Tasks',
          categoryName: googleTask.taskListTitle || 'Google Tasks',
          type: 'single' as const,
          completed: googleTask.status === 'completed',
          date: googleTask.due || new Date().toISOString().split('T')[0],
          googleTaskId: googleTask.id,
          googleListId: googleTask.taskListId,
          googleListName: googleTask.taskListTitle,
          notes: googleTask.notes,
          isGoogleTask: true,
        }));

        // 🔥 완료된 태스크 디버깅
        const completedCount = googleTasks.filter(t => t.completed).length;
        console.log('[TasksContext] Converted Google Tasks:', googleTasks.length, '(', completedCount, 'completed)');
        
        // 🔥 첫 몇 개의 태스크 상태 로깅
        if (googleTasks.length > 0) {
          console.log('[TasksContext] Sample tasks:', googleTasks.slice(0, 3).map(t => ({
            title: t.title,
            completed: t.completed,
            rawStatus: data.tasks.find((gt: any) => gt.id === t.googleTaskId)?.status
          })));
        }
        
        return googleTasks;
      }
      
      return [];
    } catch (error) {
      console.warn('[TasksContext] Google Tasks feature unavailable:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    } finally {
      setIsLoadingGoogleTasks(false);
    }
  };

  // 🔥 전체 새로고침
  const refreshAll = async () => {
    console.log('[TasksContext] 🔄 Refreshing all data...');
    
    // 🔥 카테고리를 먼저 로드하고 categories state가 업데이트되길 기다림
    const cats = await loadCategories(true);
    
    // 🔥 categories가 로드된 후에 tasks 로드 (category 매핑을 위해)
    const [localTasks, googleTasks] = await Promise.all([
      loadLocalTasks(true),
      hasGoogleTasks ? loadGoogleTasks() : Promise.resolve([])
    ]);
    
    const allTasks = [...localTasks, ...googleTasks];
    setTasks(allTasks);
    
    // 캐시 업데이트
    setTasksCache({ data: allTasks, timestamp: Date.now() });
    
    console.log('[TasksContext] ✅ Refresh complete -', allTasks.length, 'total tasks,', cats.length, 'categories');
  };

  const refreshTasks = async () => {
    const [localTasks, googleTasks] = await Promise.all([
      loadLocalTasks(true),
      hasGoogleTasks ? loadGoogleTasks() : Promise.resolve([])
    ]);
    
    const allTasks = [...localTasks, ...googleTasks];
    setTasks(allTasks);
    setTasksCache({ data: allTasks, timestamp: Date.now() });
  };

  const refreshCategories = async () => {
    await loadCategories(true);
  };

  // Task CRUD
  const addTask = async (task: Omit<Task, 'id'>): Promise<Task | null> => {
    if (!session) return null;

    try {
      console.log('[TasksContext] Creating task:', task.title);
      
      // 🔥 tasksAPI 사용
      const dbTask = await tasksAPI.create(
        {
          title: task.title,
          notes: task.notes || '',
          is_completed: task.completed,
          due_date: task.date,
          task_type: task.type,
          category_id: categories.find(c => c.name === task.category)?.id,
          user_id: session.user?.id, // 🔥 user_id 명시적으로 전달
        },
        session.access_token
      );

      const newTask: Task = {
        id: dbTask.id,
        title: dbTask.title,
        category: task.category,
        type: dbTask.task_type,
        completed: dbTask.is_completed,
        date: dbTask.due_date?.split('T')[0] || task.date,
        notes: dbTask.notes,
        isGoogleTask: false,
      };

      setTasks(prev => [...prev, newTask]);
      setTasksCache({ data: [...tasks, newTask], timestamp: Date.now() });
      
      console.log('[TasksContext] ✅ Task created successfully:', newTask.id);
      return newTask;
    } catch (error) {
      console.error('[TasksContext] Failed to create task:', error);
      return null;
    }
  };

  const updateTask = async (id: number | string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !session) return;

    // 낙관적 업데이트
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    try {
      if (task.isGoogleTask && task.googleTaskId && task.googleListId) {
        const accessToken = getGoogleToken(session);
        if (!accessToken) {
          console.error('[TasksContext] No provider token for Google Task update');
          return;
        }

        console.log('[TasksContext] Updating Google Task:', task.googleTaskId);
        console.log('[TasksContext] Updates:', updates);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-tasks/tasks/${task.googleListId}/${task.googleTaskId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-JWT': session.access_token,
              'X-Google-Access-Token': accessToken,
            },
            body: JSON.stringify({
              title: updates.title !== undefined ? updates.title : undefined,
              notes: updates.notes !== undefined ? updates.notes : undefined,
              status: updates.completed !== undefined ? (updates.completed ? 'completed' : 'needsAction') : undefined,
              due: updates.date !== undefined ? updates.date : undefined,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[TasksContext] Google Task update failed:', response.status, errorText);
          // 롤백
          setTasks(prev => prev.map(t => t.id === id ? task : t));
          return;
        }

        const result = await response.json();
        console.log('[TasksContext] ✅ Google Task updated successfully:', result);
      } else {
        // 🔥 로컬 태스크는 tasksAPI 사용
        await tasksAPI.update(
          id as string,
          {
            title: updates.title,
            is_completed: updates.completed,
            notes: updates.notes,
            due_date: updates.date,
          },
          session.access_token
        );
        console.log('[TasksContext] ✅ Local task updated successfully');
      }

      // 캐시 무효화
      setTasksCache(null);
    } catch (error) {
      console.error('[TasksContext] Error updating task:', error);
      // 롤백
      setTasks(prev => prev.map(t => t.id === id ? task : t));
    }
  };

  const deleteTask = async (id: number | string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !session) return;

    // 낙관적 업데이트
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      if (task.isGoogleTask && task.googleTaskId && task.googleListId) {
        const accessToken = getGoogleToken(session);
        if (!accessToken) return;

        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-tasks/tasks/${task.googleListId}/${task.googleTaskId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-User-JWT': session.access_token,
              'X-Google-Access-Token': accessToken,
            },
          },
        );
      } else {
        // 🔥 로컬 태스크는 tasksAPI 사용
        await tasksAPI.delete(id as string, session.access_token);
        console.log('[TasksContext] ✅ Local task deleted successfully');
      }

      // 캐시 무효화
      setTasksCache(null);
    } catch (error) {
      console.error('[TasksContext] Error deleting task:', error);
      // 롤백
      setTasks(prev => [...prev, task]);
    }
  };

  // Task 순서 변경 (UI 즉시 업데이트 - optimistic)
  const moveTask = (dragIndex: number, hoverIndex: number) => {
    setTasks(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  };

  // Task 순서 서버 저장
  const saveTaskOrder = async () => {
    if (!session) return;

    // 현재 날짜의 로컬 태스크만 순서 저장
    const localTasks = tasks.filter(t => !t.isGoogleTask);
    const taskOrders = localTasks.map((t, i) => ({
      id: t.id as string,
      order_index: i,
    }));

    try {
      await tasksAPI.reorder(taskOrders, session.access_token);
      console.log('[TasksContext] ✅ Task order saved');
      // 캐시 무효화
      setTasksCache(null);
    } catch (error) {
      console.error('[TasksContext] Failed to save task order:', error);
    }
  };

  // Category CRUD (간단한 구현)
  const addCategory = async (category: Omit<Category, 'id'>): Promise<Category | null> => {
    // TODO: API 구현
    const newCat: Category = { ...category, id: String(Date.now()) };
    setCategories(prev => [...prev, newCat]);
    setCategoriesCache(null);
    return newCat;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setCategoriesCache(null);
  };

  const deleteCategory = async (id: string) => {
    if (id === '1') return; // 기타 카테고리는 삭제 불가
    setCategories(prev => prev.filter(c => c.id !== id));
    setCategoriesCache(null);
  };

  // 🔥 초기 로드 (한 번만) - 세션이 준비되고 access_token이 있을 때만
  useEffect(() => {
    // 이미 초기화되었으면 스킵
    if (hasInitialized) {
      console.log('[TasksContext] ✅ Already initialized, skipping...');
      return;
    }
    
    // Auth 로딩 중이면 대기
    if (authLoading) {
      console.log('[TasksContext] ⏳ Waiting for auth to complete...');
      return;
    }
    
    // 세션이 없으면 초기화 완료 처리
    if (!session) {
      console.log('[TasksContext] ⚠️ No session - skipping load');
      setHasInitialized(true);
      return;
    }
    
    // access_token이 없으면 초기화 완료 처리  
    if (!session.access_token) {
      console.log('[TasksContext] ⚠️ Session exists but no access_token - skipping load');
      setHasInitialized(true);
      return;
    }
    
    // 모든 조건 충족 - 데이터 로드
    console.log('[TasksContext] 🚀 Initial load with valid session...');
    console.log('[TasksContext] Session details:', {
      hasSession: !!session,
      hasAccessToken: !!session.access_token,
      email: session.user?.email,
    });
    
    refreshAll().then(() => {
      setHasInitialized(true);
      console.log('[TasksContext] ✅ Initialization complete');
    });
  }, [authLoading, session, hasInitialized]); // 🔥 session 전체를 의존성으로 추가

  // 🔥 트리거 방식으로 변경: DB 트리거가 자동으로 카테고리 생성
  // categories-created 이벤트 리스너 제거 (더 이상 발송하지 않음)

  return (
    <TasksContext.Provider
      value={{
        tasks,
        categories,
        googleTaskLists,
        isLoading,
        isLoadingCategories,
        isLoadingTasks,
        isLoadingGoogleTasks,
        needsReauth,
        apiNotEnabled,
        currentDate,
        setCurrentDate,
        refreshTasks,
        refreshCategories,
        refreshAll,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        saveTaskOrder,
        addCategory,
        updateCategory,
        deleteCategory,
        setNeedsReauth,
        setApiNotEnabled,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}