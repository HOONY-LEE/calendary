import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "./ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Plus,
  ChevronDown,
  Check,
  X,
  Trash2,
  Clock,
  Repeat,
  MoreHorizontal,
  MoreVertical,
  Edit2,
  Palette,
} from "lucide-react";
import { DatePicker } from "./ui/date-picker";
import { DateRangePicker } from "./ui/date-range-picker";
import { RRule, Frequency } from "rrule";
import { useTranslation } from "react-i18next";
import { DraggableCategoryItem } from "./calendar/DraggableCategoryItem";
import { RecurrenceSection } from "./calendar/RecurrenceSection";
import { DeleteOptionsDialog } from "./calendar/DeleteOptionsDialog";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface RecurrenceRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  byweekday?: number[]; // 0=Monday, 6=Sunday
  until?: Date;
  count?: number;
}

interface EventCreatePopoverProps {
  trigger?: React.ReactNode;
  anchorElement?: HTMLElement | null;
  selectedDate: Date | null;
  selectedEndDate?: Date | null; // 여러 날짜에 걸친 일정을 위한 종료일
  defaultStartTime?: string;
  defaultEndTime?: string;
  categories: Category[];
  language: string;
  onSave: (eventData: {
    title: string;
    startTime: string;
    endTime: string;
    description: string;
    categoryId: string;
    startDate: Date; // 시작 날짜
    endDate?: Date; // 여러 날짜에 걸친 일정을 위한 종료일
    recurrence?: RecurrenceRule;
    rrule?: string; // RRule string for Google Calendar compatibility
  }) => void;
  onAddCategory: (categoryData: {
    name: string;
    color: string;
  }) => Promise<string> | string;
  onUpdateCategory?: (
    categoryId: string,
    categoryData: {
      name: string;
      color: string;
    },
  ) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onReorderCategories?: (categoryOrders: { id: string; order_index: number }[]) => void;
  onExpandToSidebar?: () => void;
  event?: {
    id: string;
    title: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    categoryId?: string;
    endDate?: Date;
    recurrence?: RecurrenceRule;
    rrule?: string;
    isGoogleEvent?: boolean;
  } | null;
  onDelete?: (
    deleteType?: "this" | "following" | "all",
  ) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange?: (eventData: {
    title: string;
    startTime: string;
    endTime: string;
    description: string;
    categoryId: string;
    startDate?: Date;
    endDate?: Date;
    isPeriod: boolean;
    recurrence?: RecurrenceRule;
  }) => void;
}

export function EventCreatePopover({
  trigger,
  anchorElement,
  selectedDate,
  selectedEndDate,
  defaultStartTime = "09:00",
  defaultEndTime = "10:00",
  categories,
  language,
  onSave,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onExpandToSidebar,
  event,
  onDelete,
  open,
  onOpenChange,
  onChange,
}: EventCreatePopoverProps) {
  const { t } = useTranslation();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled
    ? onOpenChange
    : setInternalOpen;

  const [formData, setFormData] = useState({
    title: event?.title || "",
    startTime: event?.startTime || defaultStartTime,
    endTime: event?.endTime || defaultEndTime,
    description: event?.description || "",
    categoryId:
      event?.categoryId || categories[0]?.id || "default",
  });

  // 시간 duration 계산 헬퍼 함수
  const calculateTimeDuration = (
    start: string,
    end: string,
  ): number => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  // 시간에 duration 추가 헬퍼 함수
  const addMinutesToTime = (
    time: string,
    minutes: number,
  ): string => {
    const [hour, min] = time.split(":").map(Number);
    let totalMinutes = hour * 60 + min + minutes;

    // 24시간을 넘어가면 23:59로 제한
    if (totalMinutes >= 24 * 60) {
      totalMinutes = 24 * 60 - 1;
    }
    // 음수면 00:00으로
    if (totalMinutes < 0) {
      totalMinutes = 0;
    }

    const newHour = Math.floor(totalMinutes / 60);
    const newMin = totalMinutes % 60;
    return `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`;
  };

  // 이전 시작시간을 저장하는 ref
  const prevStartTimeRef = useRef(formData.startTime);

  // 날짜 선택 상태
  const [internalStartDate, setInternalStartDate] = useState<
    Date | undefined
  >(selectedDate || undefined);
  const [internalEndDate, setInternalEndDate] = useState<
    Date | undefined
  >(() => {
    // event가 있고 endDate가 있으면 그것을 사용
    if (event?.endDate) return event.endDate;

    // selectedEndDate가 있으면 설정 (같은 날이어도 설정)
    if (selectedEndDate) return selectedEndDate;

    // 기본값: 시작 날짜와 동일
    return selectedDate || undefined;
  });

  // isPeriod는 계산된 값 (시작날짜와 종료날짜 비교)
  const isPeriod = useMemo(() => {
    if (!internalStartDate || !internalEndDate) return false;

    const isSameDay =
      internalStartDate.getDate() ===
        internalEndDate.getDate() &&
      internalStartDate.getMonth() ===
        internalEndDate.getMonth() &&
      internalStartDate.getFullYear() ===
        internalEndDate.getFullYear();

    return !isSameDay; // 다른 날짜면 기간 일정
  }, [internalStartDate, internalEndDate]);

  // 반복 일정 상태
  const [isRecurring, setIsRecurring] = useState(
    !!event?.recurrence,
  );
  const [recurrenceFreq, setRecurrenceFreq] = useState<
    "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  >(event?.recurrence?.freq || "WEEKLY");
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    event?.recurrence?.interval || 1,
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<
    number[]
  >(event?.recurrence?.byweekday || []);
  const [recurrenceEndType, setRecurrenceEndType] = useState<
    "never" | "date" | "count"
  >(
    event?.recurrence?.until
      ? "date"
      : event?.recurrence?.count
        ? "count"
        : "never",
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<
    Date | undefined
  >(() => {
    if (event?.recurrence?.until) {
      return event.recurrence.until;
    }
    // 디폴트는 시작 날짜의 1년 후
    if (selectedDate) {
      const oneYearLater = new Date(selectedDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      return oneYearLater;
    }
    return undefined;
  });
  const [recurrenceCount, setRecurrenceCount] = useState<
    string | number
  >(event?.recurrence?.count || 10);

  // Update formData when event prop changes (only on initial load)
  useEffect(() => {
    // 팝오버가 열릴 때만 실행
    if (!isOpen) return;

    if (event) {
      // 기존 이벤트 편집
      console.log("EventCreatePopover: event opened", {
        event,
        endDate: event.endDate,
        isPeriod: !!event.endDate,
      });
      console.log(
        "🔍 EventCreatePopover - Event recurrence data:",
        {
          hasRecurrence: !!event.recurrence,
          recurrence: event.recurrence,
          rrule: event.rrule,
        },
      );

      const newStartTime = event.startTime || defaultStartTime;
      setFormData({
        title: event.title,
        startTime: newStartTime,
        endTime: event.endTime || defaultEndTime,
        description: event.description || "",
        categoryId:
          event.categoryId ||
          (categories.length > 0 ? categories[0].id : ""),
      });

      // prevStartTimeRef 업데이트
      prevStartTimeRef.current = newStartTime;

      // 반복 일정 상태 업데이트
      if (event.recurrence) {
        setIsRecurring(true);
        setRecurrenceFreq(event.recurrence.freq);
        setRecurrenceInterval(event.recurrence.interval);
        setSelectedWeekdays(event.recurrence.byweekday || []);

        console.log("🔍 Setting recurrence state:", {
          freq: event.recurrence.freq,
          interval: event.recurrence.interval,
          weekdays: event.recurrence.byweekday,
          endType: event.recurrence.until
            ? "date"
            : event.recurrence.count
              ? "count"
              : "never",
        });

        if (event.recurrence.until) {
          setRecurrenceEndType("date");
          setRecurrenceEndDate(event.recurrence.until);
        } else if (event.recurrence.count) {
          setRecurrenceEndType("count");
          setRecurrenceCount(event.recurrence.count);
        } else {
          setRecurrenceEndType("never");
        }
      } else {
        console.log("🔍 No recurrence data found in event");
        setIsRecurring(false);
      }

      // 날짜 상태 업데이트
      setInternalStartDate(selectedDate || undefined);
      if (event.endDate) {
        console.log(
          "EventCreatePopover: endDate:",
          event.endDate,
        );
        setInternalEndDate(event.endDate);
      } else {
        console.log(
          "EventCreatePopover: No endDate, setting to startDate",
        );
        setInternalEndDate(selectedDate || undefined);
      }
    } else {
      // 새 이벤트 생성
      console.log(
        "EventCreatePopover: New event, checking selectedDate and selectedEndDate",
        { selectedDate, selectedEndDate },
      );

      // Reset form for new event
      setFormData({
        title: "",
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        description: "",
        categoryId: categories[0]?.id || "default",
      });

      // prevStartTimeRef 업데이트
      prevStartTimeRef.current = defaultStartTime;

      // 반복 일정 상태 초기화
      setIsRecurring(false);

      // 날짜 설정
      setInternalStartDate(selectedDate || undefined);
      if (selectedEndDate) {
        setInternalEndDate(selectedEndDate);
      } else {
        // selectedEndDate가 없으면 시작 날짜와 동일하게 설정
        setInternalEndDate(selectedDate || undefined);
      }
    }
  }, [isOpen]); // isOpen이 변경될 때만 실행 (팝오버가 열릴 때)

  // 🔥 변경사항 감지 (수정 모드일 때만)
  const hasChanges = useMemo(() => {
    if (!event) return false; // 새 이벤트 생성 모드면 항상 false
    
    // 날짜 비교 헬퍼
    const isSameDate = (date1: Date | undefined, date2: Date | undefined) => {
      if (!date1 || !date2) return date1 === date2;
      return date1.toDateString() === date2.toDateString();
    };
    
    // formData 비교
    if (formData.title !== (event.title || "")) return true;
    if (formData.startTime !== (event.startTime || defaultStartTime)) return true;
    if (formData.endTime !== (event.endTime || defaultEndTime)) return true;
    if (formData.description !== (event.description || "")) return true;
    if (formData.categoryId !== (event.categoryId || categories[0]?.id || "default")) return true;
    
    // 날짜 비교
    if (!isSameDate(internalStartDate, selectedDate)) return true;
    if (!isSameDate(internalEndDate, event.endDate)) return true;
    
    return false;
  }, [event, formData, internalStartDate, internalEndDate, selectedDate, defaultStartTime, defaultEndTime, categories]);

  const handleSave = () => {
    console.log("[EventCreatePopover] handleSave called");
    console.log("[EventCreatePopover] formData:", formData);
    console.log(
      "[EventCreatePopover] internalStartDate:",
      internalStartDate,
    );
    console.log(
      "[EventCreatePopover] formData.title.trim():",
      formData.title.trim(),
    );

    if (formData.title.trim() && internalStartDate) {
      console.log(
        "[EventCreatePopover] Validation passed, calling onSave...",
      );
      let recurrence: RecurrenceRule | undefined;
      let rruleString: string | undefined;

      // Generate recurrence rule if recurring is enabled
      if (isRecurring) {
        recurrence = {
          freq: recurrenceFreq,
          interval: recurrenceInterval,
          byweekday:
            recurrenceFreq === "WEEKLY"
              ? selectedWeekdays
              : undefined,
          until:
            recurrenceEndType === "date"
              ? recurrenceEndDate
              : undefined,
          count:
            recurrenceEndType === "count"
              ? typeof recurrenceCount === "string"
                ? parseInt(recurrenceCount) || 1
                : recurrenceCount
              : undefined,
        };

        console.log(
          "🔍 EventCreatePopover - Recurrence Data:",
          {
            selectedWeekdays,
            freq: recurrenceFreq,
            startDate: internalStartDate,
            startDateDayOfWeek: internalStartDate.getDay(),
          },
        );

        // Create RRule for Google Calendar compatibility
        try {
          const freqMap: Record<string, Frequency> = {
            DAILY: RRule.DAILY,
            WEEKLY: RRule.WEEKLY,
            MONTHLY: RRule.MONTHLY,
            YEARLY: RRule.YEARLY,
          };

          // Create dtstart in UTC to match the date exactly
          // RRule internally converts to UTC, so we need to provide UTC date
          const year = internalStartDate.getFullYear();
          const month = internalStartDate.getMonth();
          const date = internalStartDate.getDate();
          const utcDate = new Date(
            Date.UTC(year, month, date, 0, 0, 0),
          );

          const rruleOptions: any = {
            freq: freqMap[recurrenceFreq],
            interval: recurrenceInterval,
            dtstart: utcDate,
          };

          if (
            recurrenceFreq === "WEEKLY" &&
            selectedWeekdays.length > 0
          ) {
            // Convert weekday numbers to RRule Weekday objects
            const weekdayMap = [
              RRule.MO,
              RRule.TU,
              RRule.WE,
              RRule.TH,
              RRule.FR,
              RRule.SA,
              RRule.SU,
            ];
            rruleOptions.byweekday = selectedWeekdays.map(
              (day) => weekdayMap[day],
            );

            console.log("🔍 RRule byweekday mapping:", {
              selectedWeekdays,
              mappedWeekdays: rruleOptions.byweekday,
              weekdayNames: selectedWeekdays.map(
                (day) =>
                  ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][
                    day
                  ],
              ),
              originalDate: internalStartDate,
              utcDate: utcDate,
            });
          }

          if (
            recurrenceEndType === "date" &&
            recurrenceEndDate
          ) {
            const endYear = recurrenceEndDate.getFullYear();
            const endMonth = recurrenceEndDate.getMonth();
            const endDate = recurrenceEndDate.getDate();
            rruleOptions.until = new Date(
              Date.UTC(endYear, endMonth, endDate, 23, 59, 59),
            );
          } else if (recurrenceEndType === "count") {
            rruleOptions.count =
              typeof recurrenceCount === "string"
                ? parseInt(recurrenceCount) || 1
                : recurrenceCount;
          }

          const rule = new RRule(rruleOptions);
          rruleString = rule.toString();

          console.log("🔍 Generated RRule:", {
            rruleString,
            rruleOptions,
            firstOccurrences: rule
              .all((date, i) => i < 5)
              .map((d) => ({
                date: d,
                dayOfWeek: d.getDay(),
                dayName: [
                  "일",
                  "월",
                  "화",
                  "수",
                  "목",
                  "금",
                  "토",
                ][d.getDay()],
              })),
          });
        } catch (error) {
          console.error("Failed to generate RRule:", error);
        }
      }

      // 기간 일정인 경우 internalEndDate를, 아닌 경우 undefined 전달
      const eventData: any = {
        ...formData,
        startDate: internalStartDate,
        recurrence,
        rrule: rruleString,
      };

      if (isPeriod && internalEndDate) {
        eventData.endDate = internalEndDate;
      }

      console.log(
        "[EventCreatePopover] Calling onSave with eventData:",
        eventData,
      );
      onSave(eventData);
      console.log("[EventCreatePopover] onSave returned");
      if (!event) {
        setFormData({
          title: "",
          startTime: defaultStartTime,
          endTime: defaultEndTime,
          description: "",
          categoryId: categories[0]?.id || "default",
        });
        setIsRecurring(false);
      }
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    if (!event) {
      setFormData({
        title: "",
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        description: "",
        categoryId: categories[0]?.id || "default",
      });
    } else {
      setFormData({
        title: event.title,
        startTime: event.startTime || defaultStartTime,
        endTime: event.endTime || defaultEndTime,
        description: event.description || "",
        categoryId:
          event.categoryId || categories[0]?.id || "default",
      });
    }
    setIsOpen(false);
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(selectedDeleteType);
      setIsOpen(false);
    }
  };

  const handleExpandToSidebar = () => {
    if (onExpandToSidebar) {
      onExpandToSidebar();
      setIsOpen(false);
    }
  };

  // Create a ref for the anchor element
  const anchorRef = useRef<HTMLDivElement>(null);
  const [popoverSide, setPopoverSide] = useState<
    "left" | "right"
  >("right");

  // Store the initial anchor position to prevent repositioning
  const anchorPositionRef = useRef<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Sync the anchor element to the ref - only recalculate when anchorElement changes
  useEffect(() => {
    if (anchorElement && anchorRef.current && isOpen) {
      // Only calculate position once when the popover first opens with this anchor
      if (!anchorPositionRef.current) {
        const rect = anchorElement.getBoundingClientRect();

        // Store the position
        anchorPositionRef.current = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        // Apply the stored position
        anchorRef.current.style.position = "fixed";
        anchorRef.current.style.top = `${rect.top}px`;
        anchorRef.current.style.left = `${rect.left}px`;
        anchorRef.current.style.width = `${rect.width}px`;
        anchorRef.current.style.height = `${rect.height}px`;

        // Determine which side has more space
        const windowWidth = window.innerWidth;
        const spaceOnRight = windowWidth - rect.right;
        const spaceOnLeft = rect.left;

        // If there's more space on the left, show popover on the left
        setPopoverSide(
          spaceOnLeft > spaceOnRight ? "left" : "right",
        );

        console.log(
          "Anchor positioned (initial):",
          rect,
          "Side:",
          spaceOnLeft > spaceOnRight ? "left" : "right",
        );
      }
    }

    // Reset position reference when modal closes
    if (!isOpen) {
      anchorPositionRef.current = null;
    }
  }, [anchorElement, isOpen]);

  // Notify parent of formData changes (for preview)
  useEffect(() => {
    if (onChange && isOpen) {
      onChange({
        ...formData,
        startDate: internalStartDate,
        endDate: internalEndDate,
        isPeriod: isPeriod,
      });
    }
  }, [
    formData,
    internalStartDate,
    internalEndDate,
    isPeriod,
    onChange,
    isOpen,
  ]);

  // Auto-focus title input when popover opens
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  // 삭제 옵션 선택 상태
  const [showDeleteOptions, setShowDeleteOptions] =
    useState(false);
  const [selectedDeleteType, setSelectedDeleteType] = useState<
    "this" | "following" | "all"
  >("this");

  // 새 카테고리 추가 상태
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] =
    useState("#FF2D55");

  // 미리 정의된 색상 팔레트
  const colorPalette = [
    "#FF2D55",
    "#FF9500",
    "#FFCC00",
    "#34C759",
    "#30B0C7",
    "#007AFF",
    "#5856D6",
    "#AF52DE",
    "#FF3B30",
    "#A2845E",
  ];

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      if (editingCategoryId && onUpdateCategory) {
        // 수정 모드
        onUpdateCategory(editingCategoryId, {
          name: newCategoryName,
          color: newCategoryColor,
        });
        setFormData({
          ...formData,
          categoryId: editingCategoryId,
        });
      } else {
        // 생성 모드
        const result = onAddCategory({
          name: newCategoryName,
          color: newCategoryColor,
        });

        // Promise 또는 직접 반환된 ID 처리
        const newCategoryId =
          result instanceof Promise ? await result : result;

        if (newCategoryId) {
          setFormData({
            ...formData,
            categoryId: newCategoryId,
          });
        }
      }
      // 초기화
      setNewCategoryName("");
      setNewCategoryColor("#FF2D55");
      setEditingCategoryId(null);
      setShowAddCategory(false);

      // 카테고리 생성 후 제목 입력 필드로 포커스 이동
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
    }
  };

  const handleCancelAddCategory = () => {
    setNewCategoryName("");
    setNewCategoryColor("#FF2D55");
    setEditingCategoryId(null);
    setShowAddCategory(false);
  };

  // 편집 중인 카테고리 ID
  const [editingCategoryId, setEditingCategoryId] = useState<
    string | null
  >(null);

  // 색상 피커 표시 상태
  const [showColorPicker, setShowColorPicker] = useState(false);

  // 설명 필드 표시 상태
  const [showDescription, setShowDescription] = useState(false);

  // 다음 사용 가능한 색상 찾기
  const getNextAvailableColor = () => {
    const usedColors = categories.map((cat) => cat.color);
    const availableColor = colorPalette.find(
      (color) => !usedColors.includes(color),
    );
    return availableColor || colorPalette[0];
  };

  // 새 카테고리 추가 모드 진입 시 다음 색상 자동 선택
  useEffect(() => {
    if (showAddCategory && !editingCategoryId) {
      setNewCategoryColor(getNextAvailableColor());
    }
  }, [showAddCategory, editingCategoryId]);

  // 팝오버 열릴 때 설명이 있으면 펼쳐진 상태로 표시
  useEffect(() => {
    if (isOpen && event?.description) {
      setShowDescription(true);
    } else if (isOpen && !event) {
      setShowDescription(false);
    }
  }, [isOpen, event]);

  // 카테고리 삭제 확인 상태
  const [deletingCategoryId, setDeletingCategoryId] = useState<
    string | null
  >(null);
  const deletingCategory = categories.find(
    (cat) => cat.id === deletingCategoryId,
  );

  // 드래그 앤 드롭을 위한 로컬 카테고리 상태
  const [localCategories, setLocalCategories] = useState(categories);

  // categories prop이 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // 카테고리 이동 핸들러
  const moveCategory = useCallback((dragIndex: number, hoverIndex: number) => {
    setLocalCategories((prevCategories) => {
      const newCategories = [...prevCategories];
      const [removed] = newCategories.splice(dragIndex, 1);
      newCategories.splice(hoverIndex, 0, removed);
      return newCategories;
    });
  }, []);

  // 드래그 종료 시 서버에 저장
  const handleDragEnd = useCallback(() => {
    if (onReorderCategories) {
      const categoryOrders = localCategories.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));
      onReorderCategories(categoryOrders);
    }
  }, [localCategories, onReorderCategories]);

  return (
    <>
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          // 모달이 닫히려고 할 때 (open === false), 무시
          // 모달 내부의 명시적인 닫기 버튼만 작동
          if (open === false) return;
          setIsOpen(open);
        }}
        modal={true}
      >
        {/* Backdrop overlay - 모든 이벤트 차단, 클릭해도 모달 닫히지 않음 */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/10 z-40"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // setIsOpen(false) 제거 - 오버레이 클릭으로 모달 닫히지 않음
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          />
        )}

        {anchorElement ? (
          <PopoverAnchor asChild>
            <div
              ref={anchorRef}
              style={{
                pointerEvents: "none",
                opacity: 0,
                position: "fixed",
              }}
            />
          </PopoverAnchor>
        ) : trigger ? (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        ) : (
          <PopoverTrigger asChild>
            <button
              style={{
                opacity: 0,
                pointerEvents: "none",
                position: "fixed",
              }}
            />
          </PopoverTrigger>
        )}
        <PopoverContent
          className="w-[380px] z-50 p-[20px]"
          align="start"
          side={popoverSide}
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            // 새 일정 생성 시에만 제목 입력란에 포커스
            if (!event) {
              e.preventDefault();
              setTimeout(() => {
                titleInputRef.current?.focus();
              }, 0);
            }
          }}
        >
          <div className="space-y-3">
            {/* Title Input as Header - 아웃라인 없이 하단 구분선만 */}
            <div className="relative pb-2">
              <div className="flex items-center justify-between gap-3">
                <input
                  ref={titleInputRef}
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  onFocus={() => setIsTitleFocused(true)}
                  onBlur={() => setIsTitleFocused(false)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      formData.title.trim() &&
                      internalStartDate
                    ) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  placeholder={t("calendar.newEvent")}
                  className="flex-1 min-w-0 h-auto border-0 px-0 text-xl font-bold focus:outline-none focus:ring-0 bg-transparent placeholder:text-muted-foreground/40 cursor-text"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7.5 w-7.5 bg-gray-100 hover:bg-gray-200 text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer"
                  onClick={handleCancel}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {/* 포커스 시 파란색으로 변하는 하단 구분선 */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-[1px] transition-colors duration-200 ${
                  isTitleFocused ? "bg-[#0C8CE9]" : "bg-border"
                }`}
              />
            </div>

            {/* Repeat Switch - 별도 줄 */}
            <div className="flex items-center justify-end gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground cursor-pointer">
                {language === "ko" ? "반복" : "Repeat"}
              </Label>
              <Switch
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setIsRecurring(checked);
                  if (
                    checked &&
                    recurrenceFreq === "WEEKLY" &&
                    selectedWeekdays.length === 0
                  ) {
                    // 주간 반복이고 요일이 선택되지 않은 경우, 시작 날짜의 요일을 기본으로 선택
                    if (internalStartDate) {
                      const dayOfWeek =
                        (internalStartDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
                      setSelectedWeekdays([dayOfWeek]);
                    }
                  }
                }}
              />
            </div>

            {/* 반복 설정 - 반복이 활성화되었을 때만 표시 */}
            {isRecurring && (
              <RecurrenceSection
                language={language}
                recurrenceFreq={recurrenceFreq}
                setRecurrenceFreq={setRecurrenceFreq}
                selectedWeekdays={selectedWeekdays}
                setSelectedWeekdays={setSelectedWeekdays}
                recurrenceEndType={recurrenceEndType}
                setRecurrenceEndType={setRecurrenceEndType}
                recurrenceCount={recurrenceCount}
                setRecurrenceCount={setRecurrenceCount}
                recurrenceEndDate={recurrenceEndDate}
                setRecurrenceEndDate={setRecurrenceEndDate}
                internalStartDate={internalStartDate}
              />
            )}

            {/* 날짜 선택기 - 항상 시작/종료 날짜 모두 표시 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-sm">
                  {language === "ko"
                    ? "시작 날짜"
                    : "Start Date"}
                </Label>
                <DatePicker
                  id="start-date"
                  value={internalStartDate}
                  language={language}
                  onChange={(date) => {
                    setInternalStartDate(date);
                    // 시작 날짜가 종료 날짜보다 늦으면 종료 날짜를 시작 날짜로 설정
                    if (
                      date &&
                      internalEndDate &&
                      date > internalEndDate
                    ) {
                      setInternalEndDate(date);
                    }
                    // 종료 날짜가 없으면 시작 날짜와 동일하게 설정
                    if (date && !internalEndDate) {
                      setInternalEndDate(date);
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-sm">
                  {language === "ko" ? "종료 날짜" : "End Date"}
                </Label>
                {isRecurring &&
                recurrenceEndType === "never" ? (
                  // 반복 일정이고 종료 안함일 때는 텍스트로 표시
                  <div className="h-9 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-muted/30 flex items-center text-sm text-muted-foreground">
                    {language === "ko"
                      ? "종료 안함"
                      : "No end date"}
                  </div>
                ) : isRecurring &&
                  recurrenceEndType === "date" ? (
                  // 반복 일정이고 날짜 종료일 때는 recurrenceEndDate 사용
                  <DatePicker
                    id="end-date"
                    value={recurrenceEndDate}
                    language={language}
                    onChange={(date) => {
                      setRecurrenceEndDate(date);
                    }}
                    min={internalStartDate}
                    disabled={!internalStartDate}
                  />
                ) : isRecurring &&
                  recurrenceEndType === "count" ? (
                  // 반복 일정이고 횟수 종료일 때는 비활성화
                  <div className="h-9 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-muted/30 flex items-center text-sm text-muted-foreground">
                    {language === "ko"
                      ? "횟수로 제한"
                      : "Limited by count"}
                  </div>
                ) : (
                  // 반복이 아닐 때는 일반 종료 날짜
                  <DatePicker
                    id="end-date"
                    value={internalEndDate}
                    language={language}
                    onChange={(date) => {
                      setInternalEndDate(date);
                    }}
                    min={internalStartDate}
                    disabled={!internalStartDate}
                  />
                )}
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-sm">
                  {language === "ko"
                    ? "시작 시간"
                    : "Start Time"}
                </Label>
                <div className="relative">
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      const prevStartTime =
                        prevStartTimeRef.current;

                      // 현재 duration 계산
                      const duration = calculateTimeDuration(
                        prevStartTime,
                        formData.endTime,
                      );

                      // 새로운 종료시간 = 새 시작시간 + duration
                      const newEndTime = addMinutesToTime(
                        newStartTime,
                        duration,
                      );

                      // 시작시간이 종료시간보다 늦지 않도록 체크
                      if (newStartTime <= newEndTime) {
                        setFormData({
                          ...formData,
                          startTime: newStartTime,
                          endTime: newEndTime,
                        });
                        prevStartTimeRef.current = newStartTime;
                      }
                    }}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch (error) {
                        // Ignore cross-origin iframe errors
                      }
                    }}
                    className="h-9 pr-9 cursor-pointer"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-sm">
                  {language === "ko" ? "종료 시간" : "End Time"}
                </Label>
                <div className="relative">
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => {
                      const newEndTime = e.target.value;

                      // 종료시간이 시작시간보다 이르면 안 됨
                      if (newEndTime >= formData.startTime) {
                        setFormData({
                          ...formData,
                          endTime: newEndTime,
                        });
                      }
                    }}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker?.();
                      } catch (error) {
                        // Ignore cross-origin iframe errors
                      }
                    }}
                    className="h-9 pr-9 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="mx-[0px] mt-[0px] mb-[4px]">
              {/* 카테고리 타이틀 */}
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm">
                  {language === "ko" ? "카테고리" : "Category"}
                </Label>
              </div>

              {/* 카테고리 목록 스크롤 영역 */}
              <DndProvider backend={HTML5Backend}>
                <div className="space-y-0 max-h-[240px] overflow-y-auto scrollbar-macos mb-0">
                  {(event?.isGoogleEvent
                    ? localCategories.filter((cat) =>
                        cat.isGoogleCalendar &&
                        (cat.googleCalendarAccessRole === 'owner' || cat.googleCalendarAccessRole === 'writer')
                      )
                    : localCategories
                  ).map((cat, index) => {
                    const isChecked = formData.categoryId === cat.id;
                    const isEditing = editingCategoryId === cat.id;

                    return (
                      <DraggableCategoryItem
                        key={cat.id}
                        variant="popover"
                        cat={cat}
                        index={index}
                        isChecked={isChecked}
                        isEditing={isEditing}
                        editingCategoryId={editingCategoryId}
                        showColorPicker={showColorPicker}
                        newCategoryName={newCategoryName}
                        newCategoryColor={newCategoryColor}
                        colorPalette={colorPalette}
                        language={language}
                        formData={formData}
                        onSelectCategory={(categoryId) => {
                          setFormData({
                            ...formData,
                            categoryId: categoryId,
                          });
                        }}
                        onMove={moveCategory}
                        onDragEnd={handleDragEnd}
                        onEditStart={(categoryId, name, color) => {
                          setShowAddCategory(true);
                          setNewCategoryName(name);
                          setNewCategoryColor(color);
                          setEditingCategoryId(categoryId);
                        }}
                        onDeleteStart={(categoryId) => {
                          setDeletingCategoryId(categoryId);
                        }}
                        setShowColorPicker={setShowColorPicker}
                        setNewCategoryName={setNewCategoryName}
                        setNewCategoryColor={setNewCategoryColor}
                        handleCreateCategory={handleCreateCategory}
                        handleCancelAddCategory={handleCancelAddCategory}
                        onUpdateCategory={onUpdateCategory}
                        t={t}
                      />
                    );
                  })}
                </div>
              </DndProvider>

              {/* 새 카테고리 추가 버튼 또는 인라인 UI (스크롤 영역 밖) */}
              {showAddCategory && !editingCategoryId ? (
                <div className="group relative flex items-center gap-3 rounded-md px-3 h-[40px] border-2 border-[#0C8CE9]">
                  {/* 색상 버튼 */}
                  <Popover
                    open={showColorPicker}
                    onOpenChange={setShowColorPicker}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-4 h-4 rounded flex-shrink-0 border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: newCategoryColor,
                          borderColor: newCategoryColor,
                        }}
                      />
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-2"
                      align="start"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setNewCategoryColor(color);
                              setShowColorPicker(false);
                            }}
                            className={`w-8 h-8 rounded-md transition-all ${
                              newCategoryColor === color
                                ? "ring-2 ring-offset-2 ring-[#0C8CE9] scale-110"
                                : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* 이름 입력 */}
                  <input
                    value={newCategoryName}
                    onChange={(e) =>
                      setNewCategoryName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      } else if (e.key === "Escape") {
                        handleCancelAddCategory();
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
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-[#0C8CE9] rounded-md hover:bg-[#0A7BC9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {t("common.save", "저장")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
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
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-border my-1" />

            {/* Description */}
            {!showDescription ? (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="w-full group relative flex items-center gap-3 rounded-md px-3 h-[40px] hover:bg-muted/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#0C8CE9] transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-[#0C8CE9] transition-colors">
                  {language === "ko"
                    ? "설명 추가"
                    : "Add description"}
                </span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="description"
                    className="text-sm"
                  >
                    {language === "ko" ? "설명" : "Description"}
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDescription(false);
                      setFormData({
                        ...formData,
                        description: "",
                      });
                    }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#0C8CE9] transition-colors"
                  >
                    <span>-</span>
                    <span>
                      {language === "ko" ? "접기" : "Collapse"}
                    </span>
                  </button>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={
                    language === "ko"
                      ? "일정 설명 입력"
                      : "Enter description"
                  }
                  rows={2}
                  className="text-xs resize-none"
                  autoFocus
                />
              </div>
            )}

            {/* Actions */}
            {!showDeleteOptions ? (
              <div className="flex gap-2 p-[0px]">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 h-9 text-sm hover:bg-muted/50 rounded-sm cursor-pointer"
                >
                  {language === "ko" ? "취소" : "Cancel"}
                </Button>
                <Button
                  onClick={() => {
                    console.log(
                      "[EventCreatePopover] Save button clicked!",
                    );
                    console.log(
                      "[EventCreatePopover] Button disabled?",
                      event
                        ? !formData.title.trim() || !internalStartDate || !hasChanges
                        : !formData.title.trim() || !internalStartDate,
                    );
                    handleSave();
                  }}
                  className="flex-1 h-9 text-sm bg-[#0C8CE9] hover:bg-[#0C8CE9]/90 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                  disabled={
                    event
                      ? !formData.title.trim() || !internalStartDate || !hasChanges
                      : !formData.title.trim() || !internalStartDate
                  }
                >
                  {event
                    ? language === "ko"
                      ? "수정"
                      : "Update"
                    : language === "ko"
                      ? "추가하기"
                      : "Add"}
                </Button>
                {onDelete && (
                  <Button
                    onClick={() => {
                      // 반복 일정이면 삭제 옵션 표시, 아니면 바로 삭제
                      if (event?.recurrence) {
                        setShowDeleteOptions(true);
                        setSelectedDeleteType("this");
                      } else {
                        handleDelete();
                      }
                    }}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 hover:bg-muted/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              // 삭제 옵션 선택 UI
              <div className="space-y-2 pt-2">
                <div className="text-sm font-medium text-center pb-1 border-b">
                  {language === "ko"
                    ? "삭제 범위 선택"
                    : "Select delete range"}
                </div>
                <div className="space-y-1.5">
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedDeleteType === "this"
                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedDeleteType("this")
                    }
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedDeleteType === "this"
                          ? "border-red-600 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedDeleteType === "this" && (
                        <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                      )}
                    </div>
                    <span>
                      {language === "ko"
                        ? "이 일정만"
                        : "This event only"}
                    </span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedDeleteType === "following"
                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedDeleteType("following")
                    }
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedDeleteType === "following"
                          ? "border-red-600 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedDeleteType === "following" && (
                        <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                      )}
                    </div>
                    <span>
                      {language === "ko"
                        ? "이후 모든 일정"
                        : "This and following events"}
                    </span>
                  </button>
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedDeleteType === "all"
                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedDeleteType("all")}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedDeleteType === "all"
                          ? "border-red-600 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedDeleteType === "all" && (
                        <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                      )}
                    </div>
                    <span>
                      {language === "ko"
                        ? "모든 반복 일정"
                        : "All recurring events"}
                    </span>
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => {
                      setShowDeleteOptions(false);
                      setSelectedDeleteType("this");
                    }}
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                  >
                    {language === "ko" ? "취소" : "Cancel"}
                  </Button>
                  <Button
                    onClick={handleDelete}
                    className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
                  >
                    {language === "ko" ? "삭제" : "Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* 카테고리 삭제 확인 AlertDialog */}
      <AlertDialog
        open={deletingCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCategoryId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ko"
                ? "카테고리를 정말 삭제하시겠습니까?"
                : "Are you sure you want to delete this category?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ko" ? (
                <>
                  <strong className="text-foreground">
                    {deletingCategory?.name}
                  </strong>{" "}
                  카테고리를 삭제하면 해당 카테고리에 포함된
                  모든 일정들도 함께 삭제됩니다. 이 작업은
                  되돌릴 수 없습니다.
                </>
              ) : (
                <>
                  Deleting the{" "}
                  <strong className="text-foreground">
                    {deletingCategory?.name}
                  </strong>{" "}
                  category will also delete all events in this
                  category. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeletingCategoryId(null)}
            >
              {language === "ko" ? "취소" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingCategoryId && onDeleteCategory) {
                  onDeleteCategory(deletingCategoryId);
                  setDeletingCategoryId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {language === "ko" ? "삭제" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}