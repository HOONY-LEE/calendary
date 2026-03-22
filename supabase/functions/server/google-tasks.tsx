// Google Tasks API Integration for Calendary
// 구글 Tasks API 통합 (구글 캘린더와 유사한 구조)

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string; // RFC 3339 timestamp
  completed?: string;
  parent?: string; // 하위 작업인 경우 부모 작업 ID
  position?: string;
  links?: Array<{
    type: string;
    description: string;
    link: string;
  }>;
}

interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

interface TasksResult {
  items: GoogleTask[];
  taskLists: GoogleTaskList[];
}

/**
 * 구글 Tasks 목록 및 작업들을 가져옴
 */
export async function getGoogleTasks(
  accessToken: string,
  timeMin?: string,
  timeMax?: string,
): Promise<TasksResult> {
  console.log('[Google Tasks] Fetching task lists...');

  try {
    // 1. 모든 Task 목록 가져오기
    const taskListsResponse = await fetch(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!taskListsResponse.ok) {
      const errorText = await taskListsResponse.text();
      console.error('[Google Tasks] Failed to fetch task lists:', errorText);
      throw new Error(`Failed to fetch task lists: ${taskListsResponse.status} ${errorText}`);
    }

    const taskListsData = await taskListsResponse.json();
    const taskLists: GoogleTaskList[] = taskListsData.items || [];

    console.log('[Google Tasks] Found', taskLists.length, 'task lists');

    // 2. 각 목록의 작업들 가져오기
    const allTasks: GoogleTask[] = [];

    for (const taskList of taskLists) {
      console.log('[Google Tasks] Fetching tasks from list:', taskList.title);

      const tasksUrl = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${taskList.id}/tasks`);
      
      // 필터 파라미터 추가
      tasksUrl.searchParams.set('showCompleted', 'true'); // 완료된 작업도 포함
      tasksUrl.searchParams.set('showHidden', 'false'); // 숨겨진 작업 제외
      
      if (timeMin) {
        tasksUrl.searchParams.set('dueMin', timeMin);
      }
      if (timeMax) {
        tasksUrl.searchParams.set('dueMax', timeMax);
      }

      const tasksResponse = await fetch(tasksUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!tasksResponse.ok) {
        console.warn('[Google Tasks] Failed to fetch tasks from list:', taskList.title);
        continue;
      }

      const tasksData = await tasksResponse.json();
      const tasks: GoogleTask[] = tasksData.items || [];

      console.log('[Google Tasks] Found', tasks.length, 'tasks in', taskList.title);
      
      // 🔥 완료된 태스크 개수 로깅
      const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
      console.log('[Google Tasks] - Completed tasks:', completedTasksCount, '/', tasks.length);

      // 각 작업에 taskList 정보 추가 (나중에 어떤 목록에서 왔는지 알기 위해)
      const tasksWithListInfo = tasks.map(task => ({
        ...task,
        taskListId: taskList.id,
        taskListTitle: taskList.title,
      }));

      allTasks.push(...tasksWithListInfo);
    }

    console.log('[Google Tasks] Total tasks fetched:', allTasks.length);

    return {
      items: allTasks,
      taskLists: taskLists,
    };
  } catch (error) {
    console.error('[Google Tasks] Error fetching tasks:', error);
    throw error;
  }
}

/**
 * 구글 Tasks에 새 작업 생성
 */
export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  task: {
    title: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
  }
): Promise<GoogleTask> {
  console.log('[Google Tasks] Creating task in list:', taskListId);

  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Tasks] Failed to create task:', errorText);
    throw new Error(`Failed to create task: ${response.status} ${errorText}`);
  }

  const createdTask = await response.json();
  console.log('[Google Tasks] Task created:', createdTask.id);
  return createdTask;
}

/**
 * 구글 Task 수정
 */
export async function updateGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  updates: {
    title?: string;
    notes?: string;
    due?: string;
    status?: 'needsAction' | 'completed';
  }
): Promise<GoogleTask> {
  console.log('[Google Tasks] Updating task:', taskId);

  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Tasks] Failed to update task:', errorText);
    throw new Error(`Failed to update task: ${response.status} ${errorText}`);
  }

  const updatedTask = await response.json();
  console.log('[Google Tasks] Task updated:', updatedTask.id);
  return updatedTask;
}

/**
 * 구글 Task 삭제
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  console.log('[Google Tasks] Deleting task:', taskId);

  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Tasks] Failed to delete task:', errorText);
    throw new Error(`Failed to delete task: ${response.status} ${errorText}`);
  }

  console.log('[Google Tasks] Task deleted successfully');
}

/**
 * Calendary Task 형식을 Google Task 형식으로 변환
 */
export function convertToGoogleTask(calendaryTask: {
  title: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
}): {
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
} {
  return {
    title: calendaryTask.title,
    notes: calendaryTask.description,
    due: calendaryTask.dueDate,
    status: calendaryTask.completed ? 'completed' : 'needsAction',
  };
}