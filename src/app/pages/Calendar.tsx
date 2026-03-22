import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router";
import { DndProvider } from "react-dnd";
import { DraggableCategoryItem } from "../components/calendar/DraggableCategoryItem";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Calendar as CalendarIcon,
  Phone,
  MapPin,
  Briefcase,
  Users,
  MoreHorizontal,
  ListTodo,
  ChevronDown,
  Check,
  Minimize2,
  Repeat,
  Chrome,
  Palette,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { EventCreatePopover } from "../components/EventCreatePopover";
import { SegmentTabs } from "../components/SegmentTabs";
import { RRule } from "rrule";
import type { ViewType, Category, CalendarEvent } from "./calendar/types";
import { DEFAULT_CATEGORIES } from "./calendar/constants";
import {
  COLOR_PRESETS,
  GOOGLE_CALENDAR_COLOR_MAP,
  colorPalette,
  getBackgroundColor,
  getTextColor,
} from "./calendar/utils/colorUtils";
import {
  monthNames,
  dayNames,
  getDaysInMonth,
  getWeekDays,
  isToday,
  isCurrentMonth,
  getPreviousPeriodDate,
  getNextPeriodDate,
  formatDate,
} from "./calendar/utils/dateUtils";
import {
  expandRecurringEvents,
  getEventsForDate,
  getNextAvailableTime,
} from "./calendar/utils/eventUtils";
import { useAuth } from "../context/AuthContext";
import {
  eventsAPI,
  DBEvent,
  categoriesAPI,
  DBCategory,
} from "../../lib/api";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { projectId, publicAnonKey } from "../../lib/supabase-info";
import { getGoogleToken } from "../../lib/google-token";
import googleIcon from "@/assets/ebb9edcfadcb4a0ed9d4fb9a34c8c95ec3d0a6aa.png";
import { YearView } from "./calendar/views/YearView";
import { MonthView } from "./calendar/views/MonthView";
import { WeekView } from "./calendar/views/WeekView";
import { DayView } from "./calendar/views/DayView";
import { useCalendarEvents } from "./calendar/hooks/useCalendarEvents";
import { useCategories } from "./calendar/hooks/useCategories";
import { useDragSelection } from "./calendar/hooks/useDragSelection";


export function Calendar() {
  const { t, i18n } = useTranslation();
  const language = i18n.language as "ko" | "en";
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("month");
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    null,
  );
  const [createPopoverOpen, setCreatePopoverOpen] =
    useState(false);
  const [popoverMode, setPopoverMode] = useState(false);
  const [popoverAnchor, setPopoverAnchor] =
    useState<HTMLElement | null>(null);
  const [previewEvent, setPreviewEvent] = useState<{
    title: string;
    startTime: string;
    endTime: string;
    description: string;
    categoryId: string;
    startDate?: Date;
    endDate?: Date;
    isPeriod: boolean;
  } | null>(null);

  const [monthViewPopoverDate, setMonthViewPopoverDate] =
    useState<Date | null>(null);
  const [monthViewPopoverOpen, setMonthViewPopoverOpen] =
    useState(false);
  const [clickedDateForNewEvent, setClickedDateForNewEvent] =
    useState<Date | null>(null);

  // 월간 뷰 확장된 행 상태
  const [expandedRows, setExpandedRows] = useState<Set<number>>(
    new Set(),
  );

  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    description: "",
    categoryId: "" as string,
  });

  const { events, setEvents, loadEvents, isLoading, setIsLoading } = useCalendarEvents({ session, user, signOut, language });
  const { categories, setCategories, selectedCategoryIds, setSelectedCategoryIds, showAddCategoryInDropdown, setShowAddCategoryInDropdown, newCategoryNameInDropdown, setNewCategoryNameInDropdown, newCategoryColorInDropdown, setNewCategoryColorInDropdown, showColorPickerInDropdown, setShowColorPickerInDropdown, editingCategoryIdInDropdown, setEditingCategoryIdInDropdown, deletingCategoryIdInDropdown, setDeletingCategoryIdInDropdown, handleCreateCategoryInDropdown, handleCancelAddCategoryInDropdown, handleUpdateCategoryInDropdown, handleDeleteCategoryInDropdown, moveCategory, saveCategoryOrder } = useCategories({ session, user, signOut, language, setIsLoading, formData, setFormData });
  const { isDragging, setIsDragging, dragStartDate, setDragStartDate, dragEndDate, setDragEndDate, isDateInDragRange, handleMouseDown, handleMouseEnter, handleMouseUp } = useDragSelection({ events, categories, setSelectedDate, setSelectedEvent, setFormData, setPreviewEvent, setMonthViewPopoverDate, setMonthViewPopoverOpen });



  const getCategoryIcon = (
    category: Category,
    className?: string,
  ) => {
    const iconProps = { className: className || "h-3 w-3" };
    switch (category.id) {
      case "call":
        return <Phone {...iconProps} />;
      case "visit":
        return <MapPin {...iconProps} />;
      case "task":
        return <ListTodo {...iconProps} />;
      case "work":
        return <Briefcase {...iconProps} />;
      case "meeting":
        return <Users {...iconProps} />;
      case "etc":
        return <MoreHorizontal {...iconProps} />;
    }
  };

  const getEventsForDateLocal = (date: Date | null) => {
    return getEventsForDate(date, events, selectedCategoryIds);
  };

  const isCurrentMonthLocal = (date: Date | null) => {
    return isCurrentMonth(date, currentDate);
  };

  const previousPeriod = () => {
    setCurrentDate(getPreviousPeriodDate(currentDate, viewType));
  };

  const nextPeriod = () => {
    setCurrentDate(getNextPeriodDate(currentDate, viewType));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (
    event: CalendarEvent,
    element?: HTMLElement,
  ) => {
    // 반복 일정의 인스턴스를 클릭한 경우, 원본 일정을 찾음
    let targetEvent = event;
    if (event.isRecurringInstance && event.recurringEventId) {
      const originalEvent = events.find(
        (e) => e.id === event.recurringEventId,
      );
      if (originalEvent) {
        targetEvent = originalEvent;
      }
    }

    setSelectedEvent(targetEvent);
    setSelectedDate(event.date); // 클릭한 날짜는 유지
    setFormData({
      title: targetEvent.title,
      startTime: targetEvent.startTime || "",
      endTime: targetEvent.endTime || "",
      description: targetEvent.description || "",
      categoryId:
        targetEvent.categoryId ||
        (categories.length > 0 ? categories[0].id : ""),
    });
    // 일정 상세 모달 열릴 때도 미리보기 설정
    setPreviewEvent({
      title: targetEvent.title,
      startTime: targetEvent.startTime || "",
      endTime: targetEvent.endTime || "",
      description: targetEvent.description || "",
      categoryId:
        targetEvent.categoryId ||
        (categories.length > 0 ? categories[0].id : ""),
      startDate: event.date,
      endDate: targetEvent.endDate,
      isPeriod: !!targetEvent.endDate,
      recurrence: targetEvent.recurrence,
    });
    setIsCreating(false);
    if (element) {
      setPopoverAnchor(element);
    }
    setCreatePopoverOpen(true);
    setPopoverMode(true);
  };

  const handleAddEventClick = (date: Date, hour?: number) => {
    setSelectedEvent(null);
    setSelectedDate(date);

    const defaultStartTime =
      hour !== undefined
        ? `${hour.toString().padStart(2, "0")}:00`
        : "09:00";
    const defaultEndTime =
      hour !== undefined
        ? `${(hour + 1).toString().padStart(2, "0")}:00`
        : "10:00";

    setFormData({
      title: "",
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      description: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
    });
    setIsCreating(true);

    // 미리보기 즉시 설정
    setPreviewEvent({
      title: "",
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      description: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
    });
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast.error(
        language === "ko"
          ? "로그인이 필요합니다"
          : "Login required",
      );
      return;
    }

    if (!formData.title.trim()) {
      toast.error(
        language === "ko"
          ? "제목을 입력해주세요"
          : "Please enter a title",
      );
      return;
    }

    try {
      if (isCreating && selectedDate) {
        // 새 이벤트 생성
        console.log("[Calendar] Creating new event...");
        console.log("[Calendar] Form data:", formData);
        console.log("[Calendar] Selected date:", selectedDate);

        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);

        // 시간 설정
        if (formData.startTime) {
          const [startHour, startMin] = formData.startTime
            .split(":")
            .map(Number);
          startDate.setHours(startHour, startMin, 0, 0);
        }
        if (formData.endTime) {
          const [endHour, endMin] = formData.endTime
            .split(":")
            .map(Number);
          endDate.setHours(endHour, endMin, 0, 0);
        }

        console.log(
          "[Calendar] Start date:",
          startDate.toISOString(),
        );
        console.log(
          "[Calendar] End date:",
          endDate.toISOString(),
        );
        // 시간이 있는지 확인
        const isAllDay =
          !formData.startTime && !formData.endTime;

        // 🔥 구글 캘린더 기준: 종일 일정의 end_date는 EXCLUSIVE
        // UI에서는 "6월 10~14일"이지만, DB에는 "start: 06-10, end: 06-15"로 저장
        let dbEndDate = endDate;
        if (
          isAllDay &&
          endDate.getTime() !== startDate.getTime()
        ) {
          dbEndDate = new Date(endDate);
          dbEndDate.setDate(dbEndDate.getDate() + 1); // +1일 (exclusive)
        }

        // 🔥 카테고리가 구글 캘린더인지 확인
        const selectedCategory = categories.find(
          (c) => c.id === formData.categoryId,
        );
        const isGoogleCalendarCategory =
          selectedCategory?.isGoogleCalendar &&
          selectedCategory?.googleCalendarId;

        console.log("[Calendar] 🔍 Category check:");
        console.log(
          "  - Selected categoryId:",
          formData.categoryId,
        );
        console.log("  - Found category:", selectedCategory);
        console.log(
          "  - Is Google Calendar?",
          selectedCategory?.isGoogleCalendar,
        );
        console.log(
          "  - Google Calendar ID:",
          selectedCategory?.googleCalendarId,
        );
        console.log(
          "  - Has provider token?",
          !!getGoogleToken(session),
        );
        console.log(
          "  - Will create in Google Calendar?",
          isGoogleCalendarCategory && !!getGoogleToken(session),
        );

        if (
          isGoogleCalendarCategory &&
          getGoogleToken(session)
        ) {
          // 구글 캘린더에 직접 생성
          console.log(
            "[Calendar] Creating event in Google Calendar:",
            selectedCategory.googleCalendarId,
          );

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(selectedCategory.googleCalendarId!)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${publicAnonKey}`,
                "X-User-JWT": session.access_token,
                "X-Google-Access-Token": getGoogleToken(session),
              },
              body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                startTime: formData.startTime,
                endTime: formData.endTime,
                isAllDay: isAllDay,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({}));
            if (response.status === 403) {
              console.error(
                "[Calendar] ⚠️ Google Calendar permission error:",
                errorData,
              );
              toast.error(
                language === "ko"
                  ? "🚨 구글 캘린더 생성 권한이 없습니다. Settings에서 재연결하세요."
                  : "🚨 No permission to create Google Calendar event. Reconnect in Settings.",
                {
                  duration: 8000,
                  action: {
                    label: "Settings",
                    onClick: () =>
                      navigate(
                        "/settings?permission_error=true",
                      ),
                  },
                },
              );
              throw new Error(
                "Insufficient Google Calendar permissions",
              );
            }
            throw new Error(
              "Failed to create Google Calendar event",
            );
          }

          const googleEvent = await response.json();
          console.log(
            "[Calendar] Google Calendar event created:",
            googleEvent,
          );

          // UI에 추가 (구글 이벤트로 표시)
          const newEvent: CalendarEvent = {
            id: `google-${googleEvent.id}`,
            title: formData.title,
            date: startDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            description: formData.description,
            categoryId: formData.categoryId,
            isGoogleEvent: true,
            googleEventId: googleEvent.id,
            googleCalendarId: selectedCategory.googleCalendarId,
            googleCalendarName: selectedCategory.name,
          };

          setEvents([...events, newEvent]);
          setIsCreating(false);
          toast.success(
            language === "ko"
              ? "구글 캘린���에 일정이 생성되었습니다"
              : "Event created in Google Calendar",
          );
          console.log("[Calendar] Google event added to UI");
        } else {
          // 일반 카테고리는 Supabase DB에 생성
          const dbEvent = await eventsAPI.create(
            {
              summary: formData.title, // title → summary
              description: formData.description || undefined,
              is_all_day: isAllDay,
              start_date: isAllDay
                ? formatDate(startDate)
                : undefined,
              end_date: isAllDay
                ? formatDate(dbEndDate)
                : undefined,
              start_datetime: !isAllDay
                ? startDate.toISOString()
                : undefined,
              end_datetime: !isAllDay
                ? endDate.toISOString()
                : undefined,
              category_id: formData.categoryId || undefined,
              user_id: user?.id,
            },
            session.access_token,
          );

          console.log(
            "[Calendar] Event created successfully:",
            dbEvent,
          );

          // UI에 추가
          const newEvent: CalendarEvent = {
            id: dbEvent.id,
            title: dbEvent.summary, // summary → title
            date: startDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            description: dbEvent.description,
            categoryId: formData.categoryId,
          };

          setEvents([...events, newEvent]);
          setIsCreating(false);
          toast.success(
            language === "ko"
              ? "일정이 생성되었습니다"
              : "Event created",
          );
          console.log(
            "[Calendar] Event added to UI, total events:",
            events.length + 1,
          );
        }
      } else if (selectedEvent) {
        // 기존 이벤트 수정
        const startDate = new Date(selectedEvent.date);
        const endDate = new Date(
          selectedEvent.endDate || selectedEvent.date,
        );

        // 시간 설정
        if (formData.startTime) {
          const [startHour, startMin] = formData.startTime
            .split(":")
            .map(Number);
          startDate.setHours(startHour, startMin, 0, 0);
        }
        if (formData.endTime) {
          const [endHour, endMin] = formData.endTime
            .split(":")
            .map(Number);
          endDate.setHours(endHour, endMin, 0, 0);
        }
        // 시간이 있는지 확인
        const isAllDay =
          !formData.startTime && !formData.endTime;

        // 🔥 구글 캘린더 기준: 종일 일정의 end_date는 EXCLUSIVE
        let dbEndDate = endDate;
        if (
          isAllDay &&
          endDate.getTime() !== startDate.getTime()
        ) {
          dbEndDate = new Date(endDate);
          dbEndDate.setDate(dbEndDate.getDate() + 1); // +1일 (exclusive)
        }

        // 🔥 카테고리 변경 감지
        const newCategory = categories.find(
          (c) => c.id === formData.categoryId,
        );
        const oldCategory = categories.find(
          (c) => c.id === selectedEvent.categoryId,
        );
        const categoryChanged =
          formData.categoryId !== selectedEvent.categoryId;
        const newIsGoogleCategory =
          newCategory?.isGoogleCalendar &&
          newCategory?.googleCalendarId;
        const oldIsGoogleCategory =
          oldCategory?.isGoogleCalendar ||
          selectedEvent.isGoogleEvent;

        // 카테고리 변경 시 경고
        if (
          categoryChanged &&
          oldIsGoogleCategory &&
          newIsGoogleCategory
        ) {
          toast.warning(
            language === "ko"
              ? "⚠️ 구글 캘린더 간 이동은 지원되지 않습니다. 카테고리 변경이 무시됩니다."
              : "⚠️ Moving between Google Calendars is not supported. Category change will be ignored.",
            { duration: 6000 },
          );
          // 카테고리 변경 무시
          formData.categoryId = selectedEvent.categoryId;
        }

        // 구글 캘린더 이벤트인 경우 토큰 확인
        if (selectedEvent.isGoogleEvent && !getGoogleToken(session)) {
          toast.error(
            language === "ko"
              ? "구글 캘린더 연동이 만료되었습니다. 설정에서 다시 연동해주세요."
              : "Google Calendar connection expired. Please reconnect in Settings.",
            {
              duration: 5000,
              action: {
                label: "Settings",
                onClick: () => navigate("/settings"),
              },
            },
          );
          return;
        }

        // 구글 캘린더 이벤트인 경우 구글 API로 수정
        if (
          selectedEvent.isGoogleEvent &&
          selectedEvent.googleEventId &&
          selectedEvent.googleCalendarId &&
          getGoogleToken(session)
        ) {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(selectedEvent.googleCalendarId)}/${selectedEvent.googleEventId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${publicAnonKey}`,
                "X-User-JWT": session.access_token,
                "X-Google-Access-Token": getGoogleToken(session),
              },
              body: JSON.stringify({
                title: formData.title,
                description: formData.description,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                startTime: formData.startTime,
                endTime: formData.endTime,
                isAllDay: isAllDay,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({}));

            // 403 권한 부족 에러 처리
            if (response.status === 403) {
              console.error(
                "[Calendar] ⚠️ Google Calendar permission error:",
                errorData,
              );
              toast.error(
                language === "ko"
                  ? "🚨 구글 캘린더 수정 권한이 없습니다. Settings에서 재연결하세요."
                  : "🚨 No permission to modify Google Calendar. Reconnect in Settings.",
                {
                  duration: 8000,
                  action: {
                    label: "Settings",
                    onClick: () =>
                      navigate(
                        "/settings?permission_error=true",
                      ),
                  },
                },
              );
              throw new Error(
                "Insufficient Google Calendar permissions",
              );
            }

            throw new Error(
              "Failed to update Google Calendar event",
            );
          }

          console.log(
            "[Calendar] Google Calendar event updated",
          );
        } else {
          // 일반 이벤트는 Supabase DB로 수정
          const dbEvent = await eventsAPI.update(
            selectedEvent.id,
            {
              summary: formData.title, // title → summary
              description: formData.description || undefined,
              is_all_day: isAllDay,
              start_date: isAllDay
                ? formatDate(startDate)
                : undefined,
              end_date: isAllDay
                ? formatDate(dbEndDate)
                : undefined,
              start_datetime: !isAllDay
                ? startDate.toISOString()
                : undefined,
              end_datetime: !isAllDay
                ? endDate.toISOString()
                : undefined,
              category_id: formData.categoryId || undefined,
            },
            session.access_token,
          );
        }

        // UI 업데이트
        setEvents(
          events.map((e) =>
            e.id === selectedEvent.id
              ? {
                  ...e,
                  title: formData.title,
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                  description: formData.description,
                  categoryId: formData.categoryId,
                }
              : e,
          ),
        );
        toast.success(
          language === "ko"
            ? "일정이 수정되었습니다"
            : "Event updated",
        );
      }
    } catch (error) {
      console.error("[Calendar] Failed to save event:", error);

      // 401 에러 (세션 만료) 처리
      if (
        error instanceof Error &&
        error.message.includes("Authentication failed")
      ) {
        console.log("[Calendar] Session expired, signing out");
        toast.error(
          language === "ko"
            ? "세션이 만료되었습니다. 다시 로그인해주세요."
            : "Session expired. Please sign in again.",
        );
        await signOut();
        return;
      }

      toast.error(
        language === "ko"
          ? "일정 저장에 실패했습니다"
          : "Failed to save event",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !session?.access_token) return;

    try {
      // 구글 캘린더 이벤트인 경우
      if (selectedEvent.isGoogleEvent) {
        if (!getGoogleToken(session)) {
          toast.error(
            language === "ko"
              ? "구글 캘린더 연동이 만료되었습니다. 설정에서 다시 연동해주세요."
              : "Google Calendar connection expired. Please reconnect in Settings.",
            {
              duration: 5000,
              action: {
                label: "Settings",
                onClick: () => navigate("/settings"),
              },
            },
          );
          return;
        }
      }

      // 🔥 낙관적 UI 업데이트: 먼저 UI에서 제거
      const deletedEvent = selectedEvent;
      setEvents(
        events.filter((e) => e.id !== deletedEvent.id),
      );
      toast.success(
        language === "ko"
          ? "일정이 삭제되었습니다"
          : "Event deleted",
      );

      // 구글 캘린더 이벤트인 경우 구글 API로 백그라운드 삭제
      if (
        deletedEvent.isGoogleEvent &&
        deletedEvent.googleEventId &&
        deletedEvent.googleCalendarId &&
        getGoogleToken(session)
      ) {
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(deletedEvent.googleCalendarId)}/${deletedEvent.googleEventId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              "X-User-JWT": session.access_token,
              "X-Google-Access-Token": getGoogleToken(session),
            },
          },
        ).then(async (response) => {
          if (!response.ok) {
            console.error("[Calendar] Google delete failed, restoring event");
            // 실패 시 이벤트 복원
            setEvents((prev) => [...prev, deletedEvent]);
            toast.error(
              language === "ko"
                ? "구글 캘린더 삭제에 실패했습니다. 일정이 복원됩니다."
                : "Failed to delete from Google Calendar. Event restored.",
            );
          }
        }).catch(() => {
          setEvents((prev) => [...prev, deletedEvent]);
          toast.error(
            language === "ko"
              ? "구글 캘린더 삭제에 실패했습니다. 일정이 복원됩니다."
              : "Failed to delete from Google Calendar. Event restored.",
          );
        });
      } else {
        // 일반 이벤트는 Supabase DB에서 삭제
        await eventsAPI.delete(
          deletedEvent.id,
          session.access_token,
        );
      }
    } catch (error) {
      console.error(
        "[Calendar] Failed to delete event:",
        error,
      );

      // 401 에러 (세션 만료) 처리
      if (
        error instanceof Error &&
        error.message.includes("Authentication failed")
      ) {
        console.log("[Calendar] Session expired, signing out");
        toast.error(
          language === "ko"
            ? "세션이 만료되었습니다. 다시 로그인해주세요."
            : "Session expired. Please sign in again.",
        );
        await signOut();
        return;
      }

      toast.error(
        language === "ko"
          ? "일정 삭제에 실패했습니다"
          : "Failed to delete event",
      );
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
    } else {
      if (selectedEvent) {
        setFormData({
          title: selectedEvent.title,
          startTime: selectedEvent.startTime || "",
          endTime: selectedEvent.endTime || "",
          description: selectedEvent.description || "",
          categoryId:
            selectedEvent.categoryId ||
            (categories.length > 0 ? categories[0].id : ""),
        });
      }
    }
  };

  const getHeaderTitle = () => {
    if (viewType === "day") {
      return `${monthNames[language][currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    } else if (viewType === "week") {
      const weekDays = getWeekDays(currentDate);
      const firstDay = weekDays[0];
      const lastDay = weekDays[6];
      return `${monthNames[language][firstDay.getMonth()]} ${firstDay.getDate()} - ${monthNames[language][lastDay.getMonth()]} ${lastDay.getDate()}, ${currentDate.getFullYear()}`;
    } else if (viewType === "year") {
      return `${currentDate.getFullYear()}`;
    } else {
      return `${monthNames[language][currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col h-screen px-[24px] pt-[10px] pb-[24px] relative">
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Calendar Controls */}
      <div className="flex items-center justify-between shrink-0 mx-[0px] mt-[0px] mb-[10px]">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-2xl">
            {getHeaderTitle()}
          </h2>

          <div className="flex items-center gap-1">
            <Button
              onClick={previousPeriod}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={nextPeriod}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={goToToday}
            variant="outline"
            size="sm"
          >
            {language === "ko" ? "오늘" : "Today"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) {
                // 드롭다운이 닫힐 때 상태 초기화
                setShowAddCategoryInDropdown(false);
                setNewCategoryNameInDropdown("");
                setNewCategoryColorInDropdown("#FF2D55");
                setEditingCategoryIdInDropdown(null);
                setShowColorPickerInDropdown(false);
              }
            }}
          >
            <DropdownMenuTrigger className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 border border-border bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-[240px] justify-between">
              <span className="text-sm">
                {selectedCategoryIds.length === 6
                  ? language === "ko"
                    ? "전체 카테고리"
                    : "All Categories"
                  : language === "ko"
                    ? `${selectedCategoryIds.length}개 선택됨`
                    : `${selectedCategoryIds.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[240px]">
              <DndProvider backend={HTML5Backend}>
                {categories.map((cat, index) => {
                  const isChecked =
                    selectedCategoryIds.includes(cat.id);
                  const isEditing =
                    editingCategoryIdInDropdown === cat.id;

                  return (
                    <DraggableCategoryItem
                      key={cat.id}
                      variant="sidebar"
                      cat={cat as any}
                      index={index}
                      isChecked={isChecked}
                      isEditing={isEditing}
                      editingCategoryId={editingCategoryIdInDropdown}
                      showColorPicker={showColorPickerInDropdown}
                      newCategoryName={newCategoryNameInDropdown}
                      newCategoryColor={newCategoryColorInDropdown}
                      colorPalette={colorPalette}
                      language={language}
                      onToggleSelect={() => {
                        if (isChecked) {
                          setSelectedCategoryIds(
                            selectedCategoryIds.filter(
                              (c) => c !== cat.id,
                            ),
                          );
                        } else {
                          setSelectedCategoryIds([
                            ...selectedCategoryIds,
                            cat.id,
                          ]);
                        }
                      }}
                      onMove={moveCategory}
                      onDragEnd={() => saveCategoryOrder(categories)}
                      onEditStart={() => {
                        setNewCategoryNameInDropdown(cat.name);
                        setNewCategoryColorInDropdown(cat.color);
                        setEditingCategoryIdInDropdown(cat.id);
                      }}
                      onDeleteStart={() => {
                        setDeletingCategoryIdInDropdown(cat.id);
                      }}
                      setShowColorPicker={setShowColorPickerInDropdown}
                      setNewCategoryName={setNewCategoryNameInDropdown}
                      setNewCategoryColor={setNewCategoryColorInDropdown}
                      handleSaveCategory={handleUpdateCategoryInDropdown}
                      handleCancelCategory={handleCancelAddCategoryInDropdown}
                    />
                  );
                })}
              </DndProvider>

              {/* Divider */}
              <div className="border-t border-dashed border-border my-1" />

              {/* Add Category */}
              {showAddCategoryInDropdown ? (
                <div className="px-2 flex items-center gap-2 h-[40px]">
                  {/* 색상 선택 */}
                  <Popover
                    open={showColorPickerInDropdown}
                    onOpenChange={setShowColorPickerInDropdown}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110"
                        style={{
                          backgroundColor:
                            newCategoryColorInDropdown,
                        }}
                      ></button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-3"
                      align="start"
                      side="bottom"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setNewCategoryColorInDropdown(
                                color,
                              );
                              setShowColorPickerInDropdown(
                                false,
                              );
                            }}
                            className={`w-8 h-8 rounded-md transition-all ${
                              newCategoryColorInDropdown ===
                              color
                                ? "ring-2 ring-offset-2 ring-[#0C8CE9] scale-110"
                                : "hover:scale-105"
                            }`}
                            style={{
                              backgroundColor: color,
                            }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* 이름 입력 */}
                  <input
                    value={newCategoryNameInDropdown}
                    onChange={(e) =>
                      setNewCategoryNameInDropdown(
                        e.target.value,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategoryInDropdown();
                      } else if (e.key === "Escape") {
                        handleCancelAddCategoryInDropdown();
                      }
                    }}
                    placeholder={
                      language === "ko"
                        ? "카테고리 이름"
                        : "Category name"
                    }
                    className="h-7 text-sm flex-1 min-w-0 border-0 bg-transparent outline-none px-0 placeholder:text-muted-foreground"
                    autoFocus
                  />

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleCreateCategoryInDropdown}
                      disabled={
                        !newCategoryNameInDropdown.trim()
                      }
                      className="px-3 py-1.5 text-sm font-medium text-white bg-[#0C8CE9] rounded-md hover:bg-[#0A7BC9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {language === "ko" ? "저장" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() =>
                    setShowAddCategoryInDropdown(true)
                  }
                  className="w-full group relative flex items-center gap-3 rounded-md px-3 h-[40px] hover:bg-muted/30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0C8CE9] transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-[#0C8CE9] transition-colors">
                    {language === "ko"
                      ? "새 카테고리"
                      : "New Category"}
                  </span>
                </button>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Type Tabs */}
          <SegmentTabs
            value={viewType}
            onValueChange={(value) => setViewType(value)}
            options={[
              {
                value: "day",
                label: language === "ko" ? "일간" : "Day",
              },
              {
                value: "week",
                label: language === "ko" ? "주간" : "Week",
              },
              {
                value: "month",
                label: language === "ko" ? "월간" : "Month",
              },
              {
                value: "year",
                label: language === "ko" ? "연간" : "Year",
              },
            ]}
          />
        </div>
      </div>

      {/* Calendar Views */}
      {viewType === "day" && (
        <DayView
          currentDate={currentDate}
          events={events}
          selectedCategoryIds={selectedCategoryIds}
          categories={categories}
          language={language}
          selectedEvent={selectedEvent}
          previewEvent={previewEvent}
          onEventClick={handleEventClick}
          onAddEventClick={handleAddEventClick}
        />
      )}
      {viewType === "week" && (
        <WeekView
          currentDate={currentDate}
          events={events}
          selectedCategoryIds={selectedCategoryIds}
          categories={categories}
          language={language}
          selectedEvent={selectedEvent}
          previewEvent={previewEvent}
          onEventClick={handleEventClick}
          onAddEventClick={handleAddEventClick}
        />
      )}
      {viewType === "month" && (
        <MonthView
          currentDate={currentDate}
          events={events}
          selectedCategoryIds={selectedCategoryIds}
          categories={categories}
          language={language}
          selectedEvent={selectedEvent}
          previewEvent={previewEvent}
          isDragging={isDragging}
          dragStartDate={dragStartDate}
          dragEndDate={dragEndDate}
          monthViewPopoverDate={monthViewPopoverDate}
          monthViewPopoverOpen={monthViewPopoverOpen}
          clickedDateForNewEvent={clickedDateForNewEvent}
          expandedRows={expandedRows}
          session={session}
          userId={user?.id}
          onEventClick={handleEventClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseUp={handleMouseUp}
          isDateInDragRange={isDateInDragRange}
          setExpandedRows={setExpandedRows}
          setMonthViewPopoverDate={setMonthViewPopoverDate}
          setMonthViewPopoverOpen={setMonthViewPopoverOpen}
          setClickedDateForNewEvent={setClickedDateForNewEvent}
          setSelectedDate={setSelectedDate}
          setPreviewEvent={setPreviewEvent}
          setDragStartDate={setDragStartDate}
          setDragEndDate={setDragEndDate}
          setIsDragging={setIsDragging}
          setEvents={setEvents}
          setCategories={setCategories}
          setSelectedCategoryIds={setSelectedCategoryIds}
        />
      )}
      {viewType === "year" && (
        <YearView
          currentDate={currentDate}
          events={events}
          selectedCategoryIds={selectedCategoryIds}
          categories={categories}
          language={language}
          onDateClick={setCurrentDate}
          onViewChange={setViewType}
        />
      )}

      {/* 🔥 일정 상세 Popover (일정 클릭 시 표시) */}
      <EventCreatePopover
        anchorElement={popoverAnchor}
        selectedDate={selectedDate}
        selectedEndDate={selectedEvent?.endDate}
        defaultStartTime="09:00"
        defaultEndTime="10:00"
        categories={categories}
        language={language}
        open={createPopoverOpen && popoverMode}
        onOpenChange={(open) => {
          setCreatePopoverOpen(open);
          if (!open) {
            setPopoverMode(false);
            setPopoverAnchor(null);
            setSelectedEvent(null);
            setPreviewEvent(null);
          }
        }}
        event={
          selectedEvent
            ? {
                id: selectedEvent.id,
                title: selectedEvent.title,
                startTime: selectedEvent.startTime,
                endTime: selectedEvent.endTime,
                description: selectedEvent.description,
                categoryId: selectedEvent.categoryId,
                endDate: selectedEvent.endDate,
                recurrence: selectedEvent.recurrence,
                rrule: selectedEvent.rrule,
                isGoogleEvent: selectedEvent.isGoogleEvent,
              }
            : null
        }
        onSave={async (eventData) => {
          if (!session?.access_token) {
            toast.error(
              language === "ko"
                ? "로그인이 필요합니다"
                : "Login required",
            );
            return;
          }

          if (!eventData.title.trim()) {
            toast.error(
              language === "ko"
                ? "제목을 입력해주세요"
                : "Please enter a title",
            );
            return;
          }

          try {
            if (selectedEvent) {
              // 기존 일정 수정
              const startDate = new Date(eventData.startDate);
              const endDate = eventData.endDate
                ? new Date(eventData.endDate)
                : new Date(eventData.startDate);

              // 시간 설정
              if (eventData.startTime) {
                const [startHour, startMin] =
                  eventData.startTime.split(":").map(Number);
                startDate.setHours(startHour, startMin, 0, 0);
              }
              if (eventData.endTime) {
                const [endHour, endMin] = eventData.endTime
                  .split(":")
                  .map(Number);
                endDate.setHours(endHour, endMin, 0, 0);
              }
              const isAllDay =
                !eventData.startTime && !eventData.endTime;
              const recurrence = eventData.rrule
                ? [eventData.rrule]
                : undefined;

              let dbEndDate = eventData.endDate
                ? new Date(eventData.endDate)
                : new Date(eventData.startDate);
              if (
                isAllDay &&
                dbEndDate.getTime() !== startDate.getTime()
              ) {
                dbEndDate = new Date(dbEndDate);
                dbEndDate.setDate(dbEndDate.getDate() + 1);
              }

              const selectedCategory = categories.find(
                (c) => c.id === eventData.categoryId,
              );
              const isGoogleCalendarCategory =
                selectedCategory?.isGoogleCalendar &&
                selectedCategory?.googleCalendarId;

              // 구글 이벤트인 경우 토큰 확인
              if (selectedEvent.isGoogleEvent && !getGoogleToken(session)) {
                toast.error(
                  language === "ko"
                    ? "구글 캘린더 연동이 만료되었습니다. 설정에서 다시 연동해주세요."
                    : "Google Calendar connection expired. Please reconnect in Settings.",
                  { duration: 5000 },
                );
                return;
              }

              if (
                selectedEvent.isGoogleEvent &&
                getGoogleToken(session) &&
                selectedEvent.googleEventId &&
                selectedEvent.googleCalendarId
              ) {
                const newCategory = categories.find(
                  (c) => c.id === eventData.categoryId,
                );
                const newGoogleCalendarId = newCategory?.googleCalendarId;

                // 구글→로컬 카테고리 변경은 불가 (구글 이벤트는 구글 캘린더 간만 이동 가능)
                const isMovingToLocalCategory = !newCategory?.isGoogleCalendar;
                if (isMovingToLocalCategory) {
                  toast.error(
                    language === "ko"
                      ? "구글 캘린더 일정은 다른 구글 캘린더로만 이동할 수 있습니다."
                      : "Google Calendar events can only be moved to other Google Calendars.",
                    { duration: 4000 },
                  );
                  return;
                }

                const categoryChanged = newGoogleCalendarId &&
                  newGoogleCalendarId !== selectedEvent.googleCalendarId;

                const eventBody = {
                  title: eventData.title,
                  description: eventData.description || "",
                  startDate: formatDate(startDate),
                  endDate: formatDate(dbEndDate),
                  startTime: eventData.startTime || undefined,
                  endTime: eventData.endTime || undefined,
                  isAllDay,
                  rrule: recurrence?.[0] || undefined,
                };

                if (categoryChanged) {
                  // 다른 구글 캘린더로 이동 + 수정
                  const moveResponse = await fetch(
                    `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(selectedEvent.googleCalendarId)}/${selectedEvent.googleEventId}/move`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${publicAnonKey}`,
                        "X-User-JWT": session.access_token,
                        "X-Google-Access-Token":
                          getGoogleToken(session),
                      },
                      body: JSON.stringify({
                        destinationCalendarId: newGoogleCalendarId,
                        eventData: eventBody,
                      }),
                    },
                  );

                  if (!moveResponse.ok) {
                    const errorData = await moveResponse.json().catch(() => ({}));
                    console.error("[Calendar] Move failed:", errorData);
                    throw new Error(
                      "Failed to move Google Calendar event",
                    );
                  }
                } else {
                  // 같은 캘린더 내 수정
                  const updateResponse = await fetch(
                    `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(selectedEvent.googleCalendarId)}/${selectedEvent.googleEventId}`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${publicAnonKey}`,
                        "X-User-JWT": session.access_token,
                        "X-Google-Access-Token":
                          getGoogleToken(session),
                      },
                      body: JSON.stringify(eventBody),
                    },
                  );

                  if (!updateResponse.ok) {
                    const errorData = await updateResponse.json().catch(() => ({}));
                    console.error("[Calendar] Update failed:", errorData);
                    throw new Error(
                      "Failed to update Google Calendar event",
                    );
                  }
                }

                toast.success(
                  language === "ko"
                    ? "일정이 수정되었습니다"
                    : "Event updated",
                );
              } else if (!selectedEvent.isGoogleEvent) {
                // 로컬 일정 수정
                await eventsAPI.update(
                  selectedEvent.id,
                  {
                    title: eventData.title,
                    description: eventData.description || "",
                    start_date: formatDate(startDate),
                    end_date: formatDate(dbEndDate),
                    start_time: eventData.startTime || null,
                    end_time: eventData.endTime || null,
                    category_id: eventData.categoryId,
                    recurrence,
                  },
                  session.access_token,
                );

                toast.success(
                  language === "ko"
                    ? "일정이 수정되었습니다"
                    : "Event updated",
                );
              }

              // 🔥 낙관적 UI 업데이트: 전체 재조회 대신 로컬 상태만 갱신
              setEvents((prev) =>
                prev.map((e) =>
                  e.id === selectedEvent.id
                    ? {
                        ...e,
                        title: eventData.title,
                        description: eventData.description,
                        date: startDate,
                        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
                        startTime: eventData.startTime,
                        endTime: eventData.endTime,
                        categoryId: eventData.categoryId,
                        recurrence: eventData.recurrence,
                        rrule: eventData.rrule,
                      }
                    : e,
                ),
              );
            }
          } catch (error) {
            console.error("Failed to update event:", error);
            toast.error(
              language === "ko"
                ? "일정 수정에 실패했습니다"
                : "Failed to update event",
            );
          }
        }}
        onDelete={async (deleteType) => {
          if (!selectedEvent || !session?.access_token) return;

          try {
            const selectedCategory = categories.find(
              (c) => c.id === selectedEvent.categoryId,
            );
            // 구글 이벤트인 경우 토큰 확인
            if (selectedEvent.isGoogleEvent && !getGoogleToken(session)) {
              toast.error(
                language === "ko"
                  ? "구글 캘린더 연동이 만료되었습니다. 설정에서 다시 연동해주세요."
                  : "Google Calendar connection expired. Please reconnect in Settings.",
                { duration: 5000 },
              );
              return;
            }

            // 🔥 낙관적 UI 업데이트: 먼저 UI에서 제거
            const deletedEvent = selectedEvent;
            setEvents((prev) => prev.filter((e) => e.id !== deletedEvent.id));
            toast.success(
              language === "ko"
                ? "일정이 삭제되었습니다"
                : "Event deleted",
            );
            setCreatePopoverOpen(false);
            setPopoverMode(false);
            setPopoverAnchor(null);
            setSelectedEvent(null);

            if (
              deletedEvent.isGoogleEvent &&
              getGoogleToken(session) &&
              deletedEvent.googleEventId &&
              deletedEvent.googleCalendarId
            ) {
              // 구글 캘린더 일정 백그라운드 삭제
              fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(deletedEvent.googleCalendarId)}/${deletedEvent.googleEventId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${publicAnonKey}`,
                    "X-User-JWT": session.access_token,
                    "X-Google-Access-Token": getGoogleToken(session),
                  },
                },
              ).then(async (res) => {
                if (!res.ok) {
                  setEvents((prev) => [...prev, deletedEvent]);
                  toast.error(
                    language === "ko"
                      ? "구글 캘린더 삭제 실패. 일정이 복원됩니다."
                      : "Google delete failed. Event restored.",
                  );
                }
              }).catch(() => {
                setEvents((prev) => [...prev, deletedEvent]);
                toast.error(
                  language === "ko"
                    ? "구글 캘린더 삭제 실패. 일정이 복원됩니다."
                    : "Google delete failed. Event restored.",
                );
              });
            } else if (!deletedEvent.isGoogleEvent) {
              // 로컬 일정 삭제
              await eventsAPI.delete(
                deletedEvent.id,
                session.access_token,
              );
            }
          } catch (error) {
            console.error("Failed to delete event:", error);
            toast.error(
              language === "ko"
                ? "일정 삭제에 실패했습니다"
                : "Failed to delete event",
            );
          }
        }}
        onAddCategory={async (categoryData) => {
          if (!session?.access_token) {
            toast.error(
              language === "ko"
                ? "로그인이 필요합니다"
                : "Login required",
            );
            return "";
          }

          try {
            const maxOrderIndex =
              categories.length > 0
                ? Math.max(
                    ...categories.map(
                      (cat) => (cat as any).order_index ?? 0,
                    ),
                  )
                : 0;

            const dbCategory = await categoriesAPI.create(
              {
                name: categoryData.name,
                color: categoryData.color,
                type: ["calendar"],
                order_index: maxOrderIndex + 1,
                user_id: user?.id,
              },
              session.access_token,
            );

            const newCategory: Category = {
              id: dbCategory.id,
              name: dbCategory.name,
              color: dbCategory.color,
            };

            setCategories([...categories, newCategory]);
            setSelectedCategoryIds([
              ...selectedCategoryIds,
              newCategory.id,
            ]);

            toast.success(
              language === "ko"
                ? "카테고리가 생성되었습니다"
                : "Category created",
            );

            return newCategory.id;
          } catch (error) {
            console.error("Failed to create category:", error);
            toast.error(
              language === "ko"
                ? "카테고리 생성에 실패했습니다"
                : "Failed to create category",
            );
            return "";
          }
        }}
        onUpdateCategory={async (categoryId, categoryData) => {
          if (!session?.access_token) {
            toast.error(
              language === "ko"
                ? "로그인이 필요합니다"
                : "Login required",
            );
            return;
          }

          try {
            await categoriesAPI.update(
              categoryId,
              {
                name: categoryData.name,
                color: categoryData.color,
              },
              session.access_token,
            );

            setCategories(
              categories.map((cat) =>
                cat.id === categoryId
                  ? {
                      ...cat,
                      name: categoryData.name,
                      color: categoryData.color,
                    }
                  : cat,
              ),
            );

            toast.success(
              language === "ko"
                ? "카테고리가 수정되었습니다"
                : "Category updated",
            );
          } catch (error) {
            console.error("Failed to update category:", error);
            toast.error(
              language === "ko"
                ? "카테고리 수정에 실패했습니다"
                : "Failed to update category",
            );
          }
        }}
        onDeleteCategory={async (categoryId) => {
          if (!session?.access_token) {
            toast.error(
              language === "ko"
                ? "로그인이 필요합니다"
                : "Login required",
            );
            return;
          }

          try {
            await categoriesAPI.delete(
              categoryId,
              session.access_token,
            );

            setCategories(
              categories.filter((cat) => cat.id !== categoryId),
            );
            setSelectedCategoryIds(
              selectedCategoryIds.filter(
                (id) => id !== categoryId,
              ),
            );

            toast.success(
              language === "ko"
                ? "카테고리가 삭제되었습니다"
                : "Category deleted",
            );
          } catch (error) {
            console.error("Failed to delete category:", error);
            toast.error(
              language === "ko"
                ? "카테고리 삭제에 실패했습니다"
                : "Failed to delete category",
            );
          }
        }}
        onReorderCategories={async (categoryOrders) => {
          if (!session?.access_token) {
            toast.error(
              language === "ko"
                ? "로그인이 필요합니다"
                : "Login required",
            );
            return;
          }

          try {
            await categoriesAPI.reorder(
              categoryOrders,
              session.access_token,
            );

            // 로컬 상태 업데이트
            const reorderedCategories = categoryOrders
              .map((order) =>
                categories.find((cat) => cat.id === order.id),
              )
              .filter((cat) => cat !== undefined) as Category[];

            setCategories(reorderedCategories);

            toast.success(
              language === "ko"
                ? "카테고리 순서가 저장되었습니다"
                : "Category order saved",
            );
          } catch (error) {
            console.error(
              "Failed to reorder categories:",
              error,
            );
            toast.error(
              language === "ko"
                ? "카테고리 순서 저장에 실패했습니다"
                : "Failed to save category order",
            );
          }
        }}
        onChange={(eventData) => {
          setPreviewEvent(eventData);
        }}
      />

      {/* 🔥 카테고리 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deletingCategoryIdInDropdown}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategoryIdInDropdown(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ko"
                ? "카테고리 삭제"
                : "Delete Category"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ko"
                ? "이 카테고리를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다."
                : "Are you sure you want to delete this category? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "ko" ? "취소" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategoryIdInDropdown && handleDeleteCategoryInDropdown(deletingCategoryIdInDropdown)}
              className="bg-red-600 hover:bg-red-700"
            >
              {language === "ko" ? "삭제" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Calendar;