import { useState, useEffect } from "react";
import {
  Plus,
  Check,
  X,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { SegmentTabs } from "../components/SegmentTabs";
import { TaskInput } from "../components/TaskInput";
import { DraggableTaskItem } from "../components/DraggableTaskItem";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../context/AuthContext";
import { useTasks } from "../context/TasksContext";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import { getGoogleToken } from "../../lib/google-token";
import { nowInTimezone, getTodayInTimezone, toISOStringInTimezone } from "../../lib/timezone";
import { formatDate } from "./calendar/utils/dateUtils";

export function Tasks() {
  const { t, i18n } = useTranslation();
  const { reauthorizeWithTasks, hasGoogleTasks, session } =
    useAuth();
  const language = i18n.language;

  // TasksContext 사용 (캐싱된 데이터)
  const {
    tasks,
    isLoading,
    needsReauth,
    apiNotEnabled,
    refreshAll,
    updateTask,
    addTask: contextAddTask,
    deleteTask: contextDeleteTask,
    moveTask,
    saveTaskOrder,
    googleTaskLists,
    setNeedsReauth,
    setApiNotEnabled,
    currentDate: contextDate,
    setCurrentDate: setContextDate,
  } = useTasks();

  const [currentDate, setCurrentDate] = useState(() => nowInTimezone()); // 🔥 UI용 Date 객체
  const [filter, setFilter] = useState<
    "all" | "inProgress" | "completed"
  >("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<
    number | string | null
  >(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<
    number | string | null
  >(null);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [showPendingTasksModal, setShowPendingTasksModal] =
    useState(false);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [selectedPendingTasks, setSelectedPendingTasks] =
    useState<Set<number | string>>(new Set());

  // 🔥 미완료 태스크 확인 (페이지 로드 시)
  useEffect(() => {
    const lastVisitDate = localStorage.getItem(
      "calendary-last-visit-date",
    );
    const today = getTodayInTimezone();

    // 첫 방문이 아니고, 마지막 방문일이 오늘이 아닐 때
    if (
      lastVisitDate &&
      lastVisitDate !== today &&
      tasks.length > 0
    ) {
      // 어제와 그 이전의 미완료 태스크 찾기
      const incompletePastTasks = tasks.filter((task) => {
        const taskDate = task.date || "";
        return taskDate < today && !task.completed;
      });

      if (incompletePastTasks.length > 0) {
        setPendingTasks(incompletePastTasks);
        setSelectedPendingTasks(
          new Set(incompletePastTasks.map((t) => t.id)),
        );
        setShowPendingTasksModal(true);
      }
    }

    // 마지막 방문 날짜 업데이트
    localStorage.setItem("calendary-last-visit-date", today);
  }, [tasks]);

  // 🔥 선택한 미완료 태스크를 오늘로 이동
  const movePendingTasksToToday = async () => {
    const today = getTodayInTimezone();

    for (const taskId of selectedPendingTasks) {
      await updateTask(taskId, { date: today });
    }

    setShowPendingTasksModal(false);
    setPendingTasks([]);
    setSelectedPendingTasks(new Set());

    // 새로고침하여 UI 업데이트
    await refreshAll();
  };

  // 🔥 태스크 선택 토글
  const togglePendingTask = (taskId: number | string) => {
    const newSelected = new Set(selectedPendingTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedPendingTasks(newSelected);
  };

  // 🔥 날짜 변경 핸들러
  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setContextDate(formatDate(newDate));
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setContextDate(formatDate(newDate));
  };

  const handleToday = () => {
    const today = nowInTimezone();
    setCurrentDate(today);
    setContextDate(getTodayInTimezone());
  };

  // 🔥 날짜가 변경되면 context의 날짜도 동기화
  useEffect(() => {
    setContextDate(formatDate(currentDate));
  }, [currentDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  };

  const toggleTask = (id: number | string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    updateTask(id, { completed: !task.completed });
  };

  const startEditingTask = (task: any) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const saveEditingTask = () => {
    if (editingTaskTitle.trim() && editingTaskId !== null) {
      updateTask(editingTaskId, { title: editingTaskTitle });
    }
    setEditingTaskId(null);
    setEditingTaskTitle("");
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle("");
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      // 구글 Tasks 동기화가 켜져 있고, 구글 Tasks 권한이 있으면 구글에 저장
      if (
        syncToGoogle &&
        hasGoogleTasks &&
        getGoogleToken(session)
      ) {
        console.log("[Tasks] Creating Google Task...");

        if (!session?.access_token) {
          console.error("[Tasks] No access token available");
          // 로컬로 폴백
          await contextAddTask({
            title: newTaskTitle,
            completed: false,
            date: formatDate(currentDate),
            type: "single", // 🔥 필수 필드 추가
            category: "기타", // 🔥 필수 필드 추가
          });
          setNewTaskTitle("");
          return;
        }

        // 첫 번째 TaskList를 사용 (기본 리스트)
        // 구글 Tasks API에서 @default가 기본 리스트입니다
        const listId = "@default";

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-tasks/tasks/${listId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
              "X-User-JWT": session.access_token,
              "X-Google-Access-Token": getGoogleToken(session),
            },
            body: JSON.stringify({
              title: newTaskTitle,
              status: "needsAction",
              due: toISOStringInTimezone(currentDate),
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "[Tasks] Failed to create Google Task:",
            errorText,
          );
          // 실패 시 로컬로 폴백
          await contextAddTask({
            title: newTaskTitle,
            completed: false,
            date: formatDate(currentDate),
            type: "single", // 🔥 필수 필드 추가
            category: "기타", // 🔥 필수 필드 추가
          });
          setNewTaskTitle("");
          return;
        }

        const result = await response.json();
        console.log("[Tasks] ✅ Google Task created:", result);

        // 구글 Tasks 생성 후 전체 새로고침
        await refreshAll();
      } else {
        // 로컬에만 저장
        console.log("[Tasks] Creating local task...");
        await contextAddTask({
          title: newTaskTitle,
          completed: false,
          date: formatDate(currentDate),
          type: "single", // 🔥 필수 필드 추가
          category: "기타", // 🔥 필수 필드 추가
        });
      }

      setNewTaskTitle("");
    } catch (error) {
      console.error("[Tasks] Error creating task:", error);
      // 에러 발생 시에도 폼 초기화
      setNewTaskTitle("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    }
  };

  const deleteTask = async (id: number | string) => {
    await contextDeleteTask(id);
  };

  // 🔥 선택된 날짜의 태스크만 필터링
  const currentDateString = formatDate(currentDate);
  const todayTasks = tasks.filter((task) => {
    // task.date가 없으면 오늘 날짜로 간주
    const taskDate =
      task.date || getTodayInTimezone();
    return taskDate === currentDateString;
  });

  const filteredTasks = todayTasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "inProgress") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const completedCount = todayTasks.filter(
    (t) => t.completed,
  ).length;
  const totalCount = todayTasks.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Google Tasks 재인증 필요 배너 */}
      {needsReauth && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-amber-600 dark:text-amber-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-500 mb-1">
                {({ ko: "구글 Tasks 권한 필요", en: "Google Tasks Permission Required", zh: "Google Tasks 权限需要" } as Record<string, string>)[language] || "Google Tasks Permission Required"}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                {({ ko: "구글 Tasks를 사용하려면 권한을 다시 승인해야 합니다.", en: "To use Google Tasks, you need to re-authorize the app.", zh: "要使用 Google Tasks，需要重新授权应用。" } as Record<string, string>)[language] || "To use Google Tasks, you need to re-authorize the app."}
              </p>
              <Button
                onClick={reauthorizeWithTasks}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {({ ko: "구글로 다시 로그인", en: "Re-authorize with Google", zh: "使用 Google 重新登录" } as Record<string, string>)[language] || "Re-authorize with Google"}
              </Button>
            </div>
            <button
              onClick={() => setNeedsReauth(false)}
              className="flex-shrink-0 text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* API 활성화 필요 배너 */}
      {apiNotEnabled && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-amber-600 dark:text-amber-500"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-500 mb-1">
                {({ ko: "구글 Tasks API 활성화 필요", en: "Google Tasks API Activation Required", zh: "Google Tasks API 需要激活" } as Record<string, string>)[language] || "Google Tasks API Activation Required"}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {({ ko: "구글 Tasks API가 활성화되지 않았습니다.", en: "Google Tasks API is not enabled.", zh: "Google Tasks API 未启用。" } as Record<string, string>)[language] || "Google Tasks API is not enabled."}
              </p>
            </div>
            <button
              onClick={() => setApiNotEnabled(false)}
              className="flex-shrink-0 text-amber-600 dark:text-amber-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-2">
            {/* 🔥 날짜 네비게이션 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevDay}
                className="h-8 w-8 p-0"
                title={
                  ({ ko: "이전 날", en: "Previous day", zh: "前一天" } as Record<string, string>)[language] || "Previous day"
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <button className="text-sm text-gray-500 dark:text-gray-400 transition-colors px-2">
                {currentDate.toLocaleDateString(
                  ({ ko: "ko-KR", en: "en-US", zh: "zh-CN" } as Record<string, string>)[language] || "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  },
                )}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextDay}
                className="h-8 w-8 p-0"
                title={
                  ({ ko: "다음 날", en: "Next day", zh: "后一天" } as Record<string, string>)[language] || "Next day"
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* 🔥 오늘 버튼 */}
              {formatDate(currentDate) !==
                getTodayInTimezone() && (
                <Button
                  onClick={handleToday}
                  variant="outline"
                  size="sm"
                >
                  {({ ko: "오늘", en: "Today", zh: "今天" } as Record<string, string>)[language] || "Today"}
                </Button>
              )}

              {/* 🧪 임시 디버그: 미완료 태스크 모달 테스트 */}
              <Button
                onClick={() => {
                  const today = getTodayInTimezone();
                  const incompletePastTasks = tasks.filter((task) => {
                    const taskDate = task.date || "";
                    return taskDate < today && !task.completed;
                  });
                  if (incompletePastTasks.length > 0) {
                    setPendingTasks(incompletePastTasks);
                    setSelectedPendingTasks(new Set(incompletePastTasks.map((t) => t.id)));
                    setShowPendingTasksModal(true);
                  } else {
                    alert("미완료 과거 태스크가 없습니다.");
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs border-dashed border-orange-400 text-orange-500"
              >
                🧪 날짜변경 모달 테스트
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                {({ ko: "오늘 할 일", en: "Today's Tasks", zh: "今日任务" } as Record<string, string>)[language] || "Today's Tasks"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="h-9 w-9 p-0"
                title={
                  ({ ko: "새로고침", en: "Refresh", zh: "刷新" } as Record<string, string>)[language] || "Refresh"
                }
              >
                {isLoading || isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {isLoading && (
                <span className="text-sm text-muted-foreground">
                  {({ ko: "로딩 중...", en: "Loading...", zh: "加载中..." } as Record<string, string>)[language] || "Loading..."}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SegmentTabs
              value={filter}
              onValueChange={(value) => setFilter(value)}
              options={[
                {
                  value: "all",
                  label: ({ ko: "전체", en: "All", zh: "全部" } as Record<string, string>)[language] || "All",
                },
                {
                  value: "inProgress",
                  label:
                    ({ ko: "진행중", en: "In Progress", zh: "进行中" } as Record<string, string>)[language] || "In Progress",
                },
                {
                  value: "completed",
                  label:
                    ({ ko: "완료됨", en: "Completed", zh: "已完成" } as Record<string, string>)[language] || "Completed",
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      {/* <div className="border-t border-border mb-6" /> */}

      {/* Loading Skeleton */}
      {isLoading && tasks.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-lg p-3 border border-border animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-muted rounded" />
                <div className="flex-1 h-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks List */}
      {!isLoading || tasks.length > 0 ? (
        <DndProvider backend={HTML5Backend}>
          <div className="space-y-2">
            {filteredTasks.map((task, index) => (
              <DraggableTaskItem
                key={task.id}
                task={task}
                index={index}
                isEditing={editingTaskId === task.id}
                editingTaskTitle={editingTaskTitle}
                isHovered={hoveredTaskId === task.id}
                language={language}
                onMove={moveTask}
                onDragEnd={saveTaskOrder}
                onToggle={() => toggleTask(task.id)}
                onEdit={() => startEditingTask(task)}
                onDelete={() => deleteTask(task.id)}
                onEditChange={setEditingTaskTitle}
                onEditSave={saveEditingTask}
                onEditCancel={cancelEditingTask}
                onHover={setHoveredTaskId}
              />
            ))}
          </div>
        </DndProvider>
      ) : null}

      {/* Divider */}
      <div className="border-t border-border mb-6 mt-6" />

      {/* Task Input */}
      <div className="mb-6">
        <div className="bg-card border border-border rounded-md px-[12px] py-[8px]">
          {/* 구글 Tasks 동기화 스위치 (구글 연동 사용자만 표시) */}
          {hasGoogleTasks && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="sync-google"
                  className="text-sm font-medium cursor-pointer"
                >
                  {({ ko: "구글 Tasks에 동기화", en: "Sync to Google Tasks", zh: "同步到 Google Tasks" } as Record<string, string>)[language] || "Sync to Google Tasks"}
                </Label>
                <span className="text-xs text-muted-foreground">
                  (
                  {syncToGoogle
                    ? ({ ko: "구글에 저장됨", en: "Saved to Google", zh: "已保存到 Google" } as Record<string, string>)[language] || "Saved to Google"
                    : ({ ko: "로컬에만 저장됨", en: "Local only", zh: "仅本地" } as Record<string, string>)[language] || "Local only"}
                  )
                </span>
              </div>
              <Switch
                id="sync-google"
                checked={syncToGoogle}
                onCheckedChange={setSyncToGoogle}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded border-2 border-muted-foreground flex-shrink-0" />
            <TaskInput
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                ({ ko: "새 작업 추가...", en: "Add new task...", zh: "添加新任务..." } as Record<string, string>)[language] || "Add new task..."
              }
              className="flex-1 h-9"
            />

            <div className="flex-shrink-0">
              {newTaskTitle && (
                <Button
                  onClick={handleAddTask}
                  size="md"
                  className="bg-[#0C8CE9] hover:bg-[#0C8CE9]/90 h-9 px-4 flex items-center gap-1.5 rounded-sm"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">
                    Enter
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 미완료 태스크 이동 모달 */}
      {showPendingTasksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">
                {({ ko: "완료하지 못한 작업이 있습니다", en: "You have incomplete tasks", zh: "您有未完成的任务" } as Record<string, string>)[language] || "You have incomplete tasks"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {({ ko: "이전 날짜의 미완료 작업을 오늘로 이동하시겠습니까?", en: "Would you like to move incomplete tasks to today?", zh: "是否将未完成的任务移至今天？" } as Record<string, string>)[language] || "Would you like to move incomplete tasks to today?"}
              </p>
            </div>

            {/* 태스크 리스트 */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-[#0C8CE9]/30 transition-colors cursor-pointer"
                    onClick={() => togglePendingTask(task.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePendingTask(task.id);
                      }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all"
                        style={{
                          backgroundColor:
                            selectedPendingTasks.has(task.id)
                              ? "#0C8CE9"
                              : "transparent",
                          borderColor: selectedPendingTasks.has(
                            task.id,
                          )
                            ? "#0C8CE9"
                            : "#D1D5DB",
                        }}
                      >
                        {selectedPendingTasks.has(task.id) && (
                          <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                        )}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(task.date).toLocaleDateString(
                          ({ ko: "ko-KR", en: "en-US", zh: "zh-CN" } as Record<string, string>)[language] || "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPendingTasksModal(false);
                  setPendingTasks([]);
                  setSelectedPendingTasks(new Set());
                }}
                className="flex-1"
              >
                {({ ko: "건너뛰기", en: "Skip", zh: "跳过" } as Record<string, string>)[language] || "Skip"}
              </Button>
              <Button
                onClick={movePendingTasksToToday}
                disabled={selectedPendingTasks.size === 0}
                className="flex-1 bg-[#0C8CE9] hover:bg-[#0C8CE9]/90"
              >
                {({ ko: `오늘로 이동 (${selectedPendingTasks.size})`, en: `Move to Today (${selectedPendingTasks.size})`, zh: `移至今天 (${selectedPendingTasks.size})` } as Record<string, string>)[language] || `Move to Today (${selectedPendingTasks.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}