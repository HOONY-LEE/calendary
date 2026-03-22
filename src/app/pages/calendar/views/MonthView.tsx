import { Plus, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CalendarEvent, Category } from "../types";
import {
  getDaysInMonth,
  dayNames,
  isToday,
  isCurrentMonth,
} from "../utils/dateUtils";
import { getBackgroundColor } from "../utils/colorUtils";
import {
  expandRecurringEvents,
  getNextAvailableTime,
} from "../utils/eventUtils";
import { EventCreatePopover } from "../../../components/EventCreatePopover";
import { formatDate } from "../utils/dateUtils";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { eventsAPI, categoriesAPI } from "../../../../lib/api";
import { projectId, publicAnonKey } from "../../../../lib/supabase-info";

interface PreviewEvent {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  categoryId: string;
  startDate?: Date;
  endDate?: Date;
  isPeriod?: boolean;
  recurrence?: {
    freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    interval: number;
    byweekday?: number[];
    until?: Date;
    count?: number;
  };
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: "ko" | "en";
  selectedEvent: CalendarEvent | null;
  previewEvent: PreviewEvent | null;
  isDragging: boolean;
  dragStartDate: Date | null;
  dragEndDate: Date | null;
  monthViewPopoverDate: Date | null;
  monthViewPopoverOpen: boolean;
  clickedDateForNewEvent: Date | null;
  expandedRows: Set<number>;
  // Session info for API calls
  session: { access_token: string; provider_token?: string | null } | null;
  userId?: string;
  // Callbacks
  onEventClick: (event: CalendarEvent, element?: HTMLElement) => void;
  onMouseDown: (date: Date | null, e: React.MouseEvent) => void;
  onMouseEnter: (date: Date | null) => void;
  onMouseUp: () => void;
  isDateInDragRange: (date: Date | null) => boolean;
  setExpandedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  setMonthViewPopoverDate: (date: Date | null) => void;
  setMonthViewPopoverOpen: (open: boolean) => void;
  setClickedDateForNewEvent: (date: Date | null) => void;
  setSelectedDate: (date: Date | null) => void;
  setPreviewEvent: (event: PreviewEvent | null) => void;
  setDragStartDate: (date: Date | null) => void;
  setDragEndDate: (date: Date | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export function MonthView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  selectedEvent,
  previewEvent,
  isDragging,
  dragStartDate,
  dragEndDate,
  monthViewPopoverDate,
  monthViewPopoverOpen,
  clickedDateForNewEvent,
  expandedRows,
  session,
  userId,
  onEventClick,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  isDateInDragRange,
  setExpandedRows,
  setMonthViewPopoverDate,
  setMonthViewPopoverOpen,
  setClickedDateForNewEvent,
  setSelectedDate,
  setPreviewEvent,
  setDragStartDate,
  setDragEndDate,
  setIsDragging,
  setEvents,
  setCategories,
  setSelectedCategoryIds,
}: MonthViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { days, rows } = getDaysInMonth(currentDate);
  // 주 수에 따라 표시할 이벤트 수 동적 조정
  const maxEventsToShow = rows === 4 ? 7 : rows === 5 ? 5 : 4;

  // 현재 월의 시작과 끝 날짜 계산
  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  // 표시되는 캘린더의 실제 시작과 끝 (이전/다음 달 포함)
  const calendarStart = days[0] || monthStart;
  const calendarEnd = days[days.length - 1] || monthEnd;

  // 반복 일정 확장
  const expandedEvents = expandRecurringEvents(
    events,
    calendarStart,
    calendarEnd,
  );

  const isCurrentMonthLocal = (date: Date | null) => {
    return isCurrentMonth(date, currentDate);
  };

  // 특정 날짜의 이벤트 목록에 대해 레이어 할당 (미리보기용)
  const assignLayersForDate = (
    eventsForDate: CalendarEvent[],
  ) => {
    const eventLayers = new Map<string, number>();

    eventsForDate.forEach((event) => {
      // 사용 중인 레이어 찾기
      const usedLayers = new Set<number>();
      eventsForDate.forEach((e) => {
        if (eventLayers.has(e.id)) {
          usedLayers.add(eventLayers.get(e.id)!);
        }
      });

      // 사용 가능한 가장 낮은 레이어 찾기
      let layer = 0;
      while (usedLayers.has(layer)) {
        layer++;
      }

      eventLayers.set(event.id, layer);
    });

    return eventLayers;
  };

  // 특정 날짜의 이벤트 가져오기 (확장된 이벤트 사용)
  const getEventsForDateExpanded = (date: Date | null) => {
    if (!date) return [];
    return expandedEvents
      .filter((event) => {
        // 시작일과 같은지 확인
        const startDateMatch =
          event.date.getDate() === date.getDate() &&
          event.date.getMonth() === date.getMonth() &&
          event.date.getFullYear() === date.getFullYear();

        // 여러 날짜에 걸친 일정인 경우, 범위 내에 있는지 확인
        let dateInRange = startDateMatch;
        if (!dateInRange && event.endDate) {
          const checkDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
          );
          const startDate = new Date(
            event.date.getFullYear(),
            event.date.getMonth(),
            event.date.getDate(),
          );
          const endDate = new Date(
            event.endDate.getFullYear(),
            event.endDate.getMonth(),
            event.endDate.getDate(),
          );

          dateInRange =
            checkDate >= startDate && checkDate <= endDate;
        }

        return dateInRange;
      })
      .filter(
        (event) =>
          !event.categoryId ||
          selectedCategoryIds.includes(event.categoryId),
      );
  };

  // 모든 기간 일정에 레이어(행) 번호 할당
  const assignEventLayers = (
    additionalEvents: CalendarEvent[] = [],
  ) => {
    const eventLayers = new Map<string, number>();
    const periodEvents = [
      ...expandedEvents.filter((e) => e.endDate),
      ...additionalEvents,
    ];

    // 모든 날짜를 순회하면서 각 일정의 레이어를 할당
    const sortedDays = [...days]
      .filter((d) => d !== null)
      .sort((a, b) => a!.getTime() - b!.getTime()) as Date[];

    sortedDays.forEach((day) => {
      // 해당 날짜에 활성화된 기간 일정들
      const activeEvents = periodEvents.filter((event) => {
        const eventStart = new Date(event.date);
        const eventEnd = event.endDate
          ? new Date(event.endDate)
          : eventStart;

        // 시간을 0으로 설정하여 날짜만 비교
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(0, 0, 0, 0);
        const currentDay = new Date(day);
        currentDay.setHours(0, 0, 0, 0);

        return (
          currentDay >= eventStart && currentDay <= eventEnd
        );
      });

      // 시작 날짜가 빠른 순서대로 정렬
      activeEvents.sort((a, b) => {
        const aStart = new Date(a.date).getTime();
        const bStart = new Date(b.date).getTime();
        return aStart - bStart;
      });

      // 각 일정에 레이어 할당
      activeEvents.forEach((event) => {
        if (!eventLayers.has(event.id)) {
          // 사용 중인 레이어 찾기
          const usedLayers = new Set<number>();
          activeEvents.forEach((e) => {
            if (eventLayers.has(e.id)) {
              usedLayers.add(eventLayers.get(e.id)!);
            }
          });

          // 사용 가능한 가장 낮은 레이어 찾기
          let layer = 0;
          while (usedLayers.has(layer)) {
            layer++;
          }

          eventLayers.set(event.id, layer);
        }
      });
    });

    return eventLayers;
  };

  // 미리보기 이벤트를 임시 이벤트 배열에 추가
  const previewEventForLayers: CalendarEvent[] = [];

  // 드래그 미리보기 추가
  if (
    isDragging &&
    dragStartDate &&
    dragEndDate &&
    dragStartDate.getTime() !== dragEndDate.getTime()
  ) {
    const start =
      dragStartDate < dragEndDate
        ? dragStartDate
        : dragEndDate;
    const end =
      dragStartDate < dragEndDate
        ? dragEndDate
        : dragStartDate;
    previewEventForLayers.push({
      id: "drag-preview-temp",
      title: "",
      date: start,
      endDate: end,
      startTime: "",
      endTime: "",
      description: "",
      categoryId: "",
    } as CalendarEvent);
  }

  // 팝오버 미리보기 추가
  if (
    previewEvent &&
    !selectedEvent &&
    previewEvent.isPeriod &&
    previewEvent.startDate &&
    previewEvent.endDate
  ) {
    const previewColor =
      categories.find((c) => c.id === previewEvent.categoryId)
        ?.color || "#000";
    previewEventForLayers.push({
      id: "preview-temp",
      title: previewEvent.title || "",
      date: previewEvent.startDate,
      endDate: previewEvent.endDate,
      startTime: previewEvent.startTime,
      endTime: previewEvent.endTime,
      description: previewEvent.description || "",
      categoryId: previewEvent.categoryId,
    } as CalendarEvent);
  }

  const eventLayers = assignEventLayers(
    previewEventForLayers,
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col border border-border rounded-md overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 shrink-0">
        {dayNames[language].map((day, index) => {
          const getDayColor = () => {
            if (index === 0) return "text-red-500";
            if (index === 6) return "text-blue-500";
            return "text-foreground";
          };

          return (
            <div
              key={index}
              className="border-r px-3 py-1 text-right last:border-r-0"
            >
              <span
                className={`text-sm font-semibold ${getDayColor()}`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="grid flex-1 grid-cols-7 overflow-auto min-h-0"
        style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {days.map((date, index) => {
          const dayEvents = getEventsForDateExpanded(date);
          const isTodayDate = isToday(date);
          const isInCurrentMonth = isCurrentMonthLocal(date);
          const isWeekend =
            index % 7 === 0 || index % 7 === 6;

          // 기간 일정과 단일 일정 분리 (🎌 공휴일 제외)
          const periodEventsForDay = dayEvents.filter(
            (e) => e.endDate && !e.isHoliday,
          );
          const singleEventsForDay = dayEvents.filter(
            (e) => !e.endDate && !e.isHoliday,
          );

          const isInDragRange = isDateInDragRange(date);

          // 이 날짜에 표시되는 기간 일정의 최대 레이어 계산
          let maxLayer =
            periodEventsForDay.length > 0
              ? Math.max(
                  ...periodEventsForDay.map(
                    (e) => eventLayers.get(e.id) || 0,
                  ),
                )
              : -1;

          // 드래그 미리보기가 이 날짜에 있는지 확인하고 레이어 포함
          if (
            isDragging &&
            dragStartDate &&
            dragEndDate &&
            isInDragRange &&
            !monthViewPopoverOpen
          ) {
            const dragLayer =
              eventLayers.get("drag-preview-temp") || 0;
            maxLayer = Math.max(maxLayer, dragLayer);
          }

          // 팝오버 미리보기가 이 날짜에 있는지 확인하고 레이어 포함
          if (
            previewEvent &&
            !selectedEvent &&
            previewEvent.isPeriod &&
            previewEvent.startDate &&
            previewEvent.endDate
          ) {
            const previewStart = new Date(
              previewEvent.startDate,
            );
            const previewEnd = new Date(previewEvent.endDate);
            previewStart.setHours(0, 0, 0, 0);
            previewEnd.setHours(0, 0, 0, 0);
            const currentDateNorm = new Date(date!);
            currentDateNorm.setHours(0, 0, 0, 0);

            if (
              currentDateNorm >= previewStart &&
              currentDateNorm <= previewEnd
            ) {
              const previewLayer =
                eventLayers.get("preview-temp") || 0;
              maxLayer = Math.max(maxLayer, previewLayer);
            }
          }

          const periodEventsHeight = (maxLayer + 1) * 24; // 각 레이어는 22px + 2px gap

          // 현재 행 번호 계산
          const rowIndex = Math.floor(index / 7);
          const isRowExpanded = expandedRows.has(rowIndex);

          // 전체 이벤트 수 계산
          const totalEventsCount =
            periodEventsForDay.length +
            singleEventsForDay.length;
          const effectiveMaxEvents = isRowExpanded
            ? totalEventsCount
            : maxEventsToShow;
          const hasMoreEvents =
            totalEventsCount > effectiveMaxEvents;

          // 표시할 단일 이벤트 수 계산 (더 많은 이벤트가 있으면 1개 줄여서 "외 n개" 표시)
          const maxSingleEvents =
            effectiveMaxEvents - periodEventsForDay.length;
          const displayEvents = singleEventsForDay.slice(
            0,
            hasMoreEvents
              ? maxSingleEvents - 1
              : maxSingleEvents,
          );

          // 남은 이벤트 수 계산 (표시되지 않은 단일 이벤트 수)
          const remainingCount =
            singleEventsForDay.length - displayEvents.length;

          const isLastColumn = index % 7 === 6;
          const isLastRow = index >= days.length - 7;

          // 공휴일 체크
          const isHoliday =
            date &&
            events.some(
              (e) =>
                e.isHoliday &&
                e.date.getDate() === date.getDate() &&
                e.date.getMonth() === date.getMonth() &&
                e.date.getFullYear() === date.getFullYear(),
            );

          return (
            <div
              key={index}
              className={`group select-none ${!isLastRow ? "border-b" : ""} ${!isLastColumn ? "border-r" : ""} ${isWeekend || isHoliday ? "bg-muted/20" : "bg-card"} relative`}
              onMouseDown={(e) => onMouseDown(date, e)}
              onMouseEnter={() => onMouseEnter(date)}
              onMouseUp={onMouseUp}
            >
              <div className="flex flex-col h-full min-h-[100px] overflow-hidden p-[0px]">
                <div className="flex justify-between items-start shrink-0 m-[4px]">
                  {/* 🎌 공휴일 표시: 왼쪽에 공휴일 이름 */}
                  <div className="flex-1 mr-1 pl-[4px] h-[18px] overflow-hidden">
                    {(() => {
                      const holiday =
                        date &&
                        events.find(
                          (e) =>
                            e.isHoliday &&
                            e.date.getDate() ===
                              date.getDate() &&
                            e.date.getMonth() ===
                              date.getMonth() &&
                            e.date.getFullYear() ===
                              date.getFullYear(),
                        );
                      return holiday ? (
                        <span className="text-[13px] text-red-500 truncate block">
                          {holiday.title}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[14px] w-6 h-6 flex items-center justify-center ${
                        !isInCurrentMonth
                          ? "text-muted-foreground/50"
                          : isTodayDate
                            ? "bg-[#0c8ce9] text-white rounded-full"
                            : (() => {
                                // 🎌 공휴일 체크
                                const isHoliday =
                                  date &&
                                  events.some(
                                    (e) =>
                                      e.isHoliday &&
                                      e.date.getDate() ===
                                        date.getDate() &&
                                      e.date.getMonth() ===
                                        date.getMonth() &&
                                      e.date.getFullYear() ===
                                        date.getFullYear(),
                                  );
                                return isHoliday ||
                                  (date &&
                                    date.getDay() === 0)
                                  ? "text-red-500"
                                  : date &&
                                      date.getDay() === 6
                                    ? "text-blue-500"
                                    : "text-foreground";
                              })()
                      }`}
                    >
                      {date?.getDate()}
                    </span>
                  </div>
                </div>

                <div className="flex-1 relative overflow-hidden">
                  {/* 드래그 미리보기 렌더링 - 기존 기간 일정들과 겹치지 않도록 맨 위에 배치 */}
                  {isDragging &&
                    dragStartDate &&
                    dragEndDate &&
                    isInDragRange &&
                    !monthViewPopoverOpen &&
                    (() => {
                      const start =
                        dragStartDate < dragEndDate
                          ? dragStartDate
                          : dragEndDate;
                      const end =
                        dragStartDate < dragEndDate
                          ? dragEndDate
                          : dragStartDate;

                      const dragStartNorm = new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        start.getDate(),
                      );
                      const dragEndNorm = new Date(
                        end.getFullYear(),
                        end.getMonth(),
                        end.getDate(),
                      );
                      const currentDateNorm = new Date(
                        date!.getFullYear(),
                        date!.getMonth(),
                        date!.getDate(),
                      );

                      const isStartDate =
                        currentDateNorm.getTime() ===
                        dragStartNorm.getTime();
                      const isEndDate =
                        currentDateNorm.getTime() ===
                        dragEndNorm.getTime();
                      const isLastDayOfWeek = index % 7 === 6;
                      const isFirstDayOfWeek =
                        index % 7 === 0;

                      const paddingClass =
                        (isStartDate || isFirstDayOfWeek) &&
                        (isEndDate || isLastDayOfWeek)
                          ? "px-2"
                          : isStartDate || isFirstDayOfWeek
                            ? "pl-2 pr-1"
                            : isEndDate || isLastDayOfWeek
                              ? "pl-1 pr-2"
                              : "px-1";

                      const marginClass =
                        (isStartDate || isFirstDayOfWeek) &&
                        (isEndDate || isLastDayOfWeek)
                          ? "mx-1"
                          : isStartDate || isFirstDayOfWeek
                            ? "ml-1"
                            : isEndDate || isLastDayOfWeek
                              ? "mr-1"
                              : "";

                      // 드래그 미리보기의 레이어는 이미 계산되어 있음
                      const layer =
                        eventLayers.get(
                          "drag-preview-temp",
                        ) || 0;

                      return (
                        <div
                          className={`absolute left-0 right-0 flex items-center gap-2 ${paddingClass} ${marginClass} opacity-60 pointer-events-none pl-2 pr-[8px] select-none`}
                          style={{
                            backgroundColor:
                              getBackgroundColor(
                                categories[0]?.color ||
                                  "#FF2D55",
                              ),
                            borderTopLeftRadius:
                              isStartDate || isFirstDayOfWeek
                                ? "6px"
                                : "0",
                            borderBottomLeftRadius:
                              isStartDate || isFirstDayOfWeek
                                ? "6px"
                                : "0",
                            borderTopRightRadius:
                              isEndDate || isLastDayOfWeek
                                ? "6px"
                                : "0",
                            borderBottomRightRadius:
                              isEndDate || isLastDayOfWeek
                                ? "6px"
                                : "0",
                            height: "22px",
                            top: `${layer * 24}px`,
                            zIndex: 100,
                          }}
                        >
                          {(isStartDate ||
                            isFirstDayOfWeek) && (
                            <>
                              <Plus
                                className="w-3.5 h-3.5 shrink-0"
                                strokeWidth={2}
                                style={{
                                  color:
                                    categories[0]?.color ||
                                    "#FF2D55",
                                }}
                              />
                              <span
                                className="text-[13px] font-normal"
                                style={{
                                  color:
                                    categories[0]?.color ||
                                    "#FF2D55",
                                }}
                              >
                                {t("calendar.newEvent")}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()}

                  {/* 기간 일정 먼저 렌더링 (레이어 순서대로, 절대 위치 사용) */}
                  {periodEventsForDay.map((event) => {
                    const layer =
                      eventLayers.get(event.id) || 0;
                    // 이 일정이 현재 수정중인 일정인지 확인
                    const isBeingEdited =
                      selectedEvent?.id === event.id &&
                      previewEvent;
                    const displayData = isBeingEdited
                      ? previewEvent
                      : event;
                    const displayColor = isBeingEdited
                      ? categories.find(
                          (c) =>
                            c.id === previewEvent.categoryId,
                        )?.color || "#FF2D55"
                      : categories.find(
                          (c) => c.id === event.categoryId,
                        )?.color || "#FF2D55";

                    const eventStartDate = new Date(
                      event.date.getFullYear(),
                      event.date.getMonth(),
                      event.date.getDate(),
                    );
                    const eventEndDate = new Date(
                      event.endDate!.getFullYear(),
                      event.endDate!.getMonth(),
                      event.endDate!.getDate(),
                    );
                    const currentDateNorm = new Date(
                      date!.getFullYear(),
                      date!.getMonth(),
                      date!.getDate(),
                    );

                    // 이 날짜가 일정의 시작 날짜인지 확인
                    const isStartDate =
                      currentDateNorm.getTime() ===
                      eventStartDate.getTime();

                    // 이 날짜가 일정의 종료 날짜인지 확인
                    const isEndDate =
                      currentDateNorm.getTime() ===
                      eventEndDate.getTime();

                    // 이 날짜가 주의 마지막 날(토요일)인지 확인
                    const isLastDayOfWeek = index % 7 === 6;

                    // 이 날짜가 주의 첫번째 날(일요일)인지 확인
                    const isFirstDayOfWeek = index % 7 === 0;

                    // 패딩 클래스 결정
                    const paddingClass =
                      (isStartDate || isFirstDayOfWeek) &&
                      (isEndDate || isLastDayOfWeek)
                        ? "px-2" // 시작과 끝이 같은 날
                        : isStartDate || isFirstDayOfWeek
                          ? "pl-2 pr-1" // 시작 날짜
                          : isEndDate || isLastDayOfWeek
                            ? "pl-1 pr-2" // 종료 날짜
                            : "px-1"; // 중간 날짜

                    // 마진 클래스 결정 (셀 경계로부터 여백)
                    const marginClass =
                      (isStartDate || isFirstDayOfWeek) &&
                      (isEndDate || isLastDayOfWeek)
                        ? "mx-1" // 시작과 끝이 같은 날
                        : isStartDate || isFirstDayOfWeek
                          ? "ml-1" // 시작 날짜
                          : isEndDate || isLastDayOfWeek
                            ? "mr-1" // 종료 날짜
                            : ""; // 중간 날짜

                    return (
                      <div
                        key={event.id}
                        data-event="true"
                        className={`cursor-pointer hover:opacity-90 transition-opacity absolute left-0 right-0 flex items-center gap-2 ${paddingClass} ${marginClass} ${isBeingEdited ? "opacity-50" : ""} pl-[12px] pr-[4px] py-[0px] select-none`}
                        style={{
                          backgroundColor:
                            getBackgroundColor(displayColor),
                          borderTopLeftRadius:
                            isStartDate || isFirstDayOfWeek
                              ? "6px"
                              : "0",
                          borderBottomLeftRadius:
                            isStartDate || isFirstDayOfWeek
                              ? "6px"
                              : "0",
                          borderTopRightRadius:
                            isEndDate || isLastDayOfWeek
                              ? "6px"
                              : "0",
                          borderBottomRightRadius:
                            isEndDate || isLastDayOfWeek
                              ? "6px"
                              : "0",
                          height: "22px", // 고정 높이
                          top: `${layer * 24}px`, // 레이어에 따른 위치 (22px height + 2px gap)
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(
                            event,
                            e.currentTarget,
                          );
                        }}
                      >
                        {/* 시작 날짜에만 제목 표시 */}
                        {(isStartDate ||
                          isFirstDayOfWeek) && (
                          <span
                            className={`truncate flex-1 text-[13px] font-normal ${isBeingEdited ? "italic" : ""}`}
                            style={{ color: displayColor }}
                          >
                            {displayData.title ||
                              (language === "ko"
                                ? "(제목 없음)"
                                : "(No title)")}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* 기간 일정 미리보기 */}
                  {previewEvent &&
                    !selectedEvent &&
                    previewEvent.isPeriod &&
                    previewEvent.startDate &&
                    previewEvent.endDate &&
                    date &&
                    (() => {
                      const previewStartDate = new Date(
                        previewEvent.startDate.getFullYear(),
                        previewEvent.startDate.getMonth(),
                        previewEvent.startDate.getDate(),
                      );
                      const previewEndDate = new Date(
                        previewEvent.endDate.getFullYear(),
                        previewEvent.endDate.getMonth(),
                        previewEvent.endDate.getDate(),
                      );
                      const currentDateNorm = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                      );

                      // 이 날짜가 미리보기 일정 범위 안에 있는지 확인
                      const isInRange =
                        currentDateNorm >= previewStartDate &&
                        currentDateNorm <= previewEndDate;

                      if (!isInRange) return null;

                      const isStartDate =
                        currentDateNorm.getTime() ===
                        previewStartDate.getTime();
                      const isEndDate =
                        currentDateNorm.getTime() ===
                        previewEndDate.getTime();
                      const isLastDayOfWeek = index % 7 === 6;
                      const isFirstDayOfWeek =
                        index % 7 === 0;

                      const paddingClass =
                        (isStartDate || isFirstDayOfWeek) &&
                        (isEndDate || isLastDayOfWeek)
                          ? "px-2"
                          : isStartDate || isFirstDayOfWeek
                            ? "pl-2 pr-1"
                            : isEndDate || isLastDayOfWeek
                              ? "pl-1 pr-2"
                              : "px-1";

                      const marginClass =
                        (isStartDate || isFirstDayOfWeek) &&
                        (isEndDate || isLastDayOfWeek)
                          ? "mx-1"
                          : isStartDate || isFirstDayOfWeek
                            ? "ml-1"
                            : isEndDate || isLastDayOfWeek
                              ? "mr-1"
                              : "";

                      const previewColor =
                        categories.find(
                          (c) =>
                            c.id === previewEvent.categoryId,
                        )?.color || "#000";

                      // 미리보기 이벤트의 레이어는 이미 계산되어 있음
                      const layer =
                        eventLayers.get("preview-temp") || 0;

                      return (
                        <div
                          key="preview-period"
                          className={`absolute left-0 right-0 flex items-center gap-2 ${paddingClass} ${marginClass} opacity-50 pointer-events-none pl-[12px] pr-[4px] py-[0px] select-none`}
                          style={{
                            backgroundColor:
                              getBackgroundColor(
                                previewColor,
                              ),
                            borderTopLeftRadius:
                              isStartDate || isFirstDayOfWeek
                                ? "6px"
                                : "0",
                            borderBottomLeftRadius:
                              isStartDate || isFirstDayOfWeek
                                ? "6px"
                                : "0",
                            borderTopRightRadius:
                              isEndDate || isLastDayOfWeek
                                ? "6px"
                                : "0",
                            borderBottomRightRadius:
                              isEndDate || isLastDayOfWeek
                                ? "6px"
                                : "0",
                            height: "22px",
                            top: `${layer * 24}px`,
                          }}
                        >
                          {(isStartDate ||
                            isFirstDayOfWeek) && (
                            <span
                              className="truncate flex-1 text-[13px] font-normal italic"
                              style={{ color: previewColor }}
                            >
                              {previewEvent.title ||
                                (language === "ko"
                                  ? "(제목 없음)"
                                  : "(No title)")}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                  {/* 단일 일정 렌더링 (기간 일정 아래에 배치) */}
                  {displayEvents.map((event, eventIndex) => {
                    // 시간 포맷팅 함수
                    const formatTime = (time?: string) => {
                      if (!time) return "";
                      const [hour, minute] = time.split(":");
                      const hourNum = parseInt(hour);
                      const period =
                        language === "ko"
                          ? hourNum < 12
                            ? "오전"
                            : "오후"
                          : hourNum < 12
                            ? "AM"
                            : "PM";
                      const displayHour =
                        hourNum === 0
                          ? 12
                          : hourNum > 12
                            ? hourNum - 12
                            : hourNum;
                      return `${period} ${displayHour}시`;
                    };

                    // 이 일정이 현재 수정중인 일정인지 확인
                    const isBeingEdited =
                      selectedEvent?.id === event.id &&
                      previewEvent;
                    const displayData = isBeingEdited
                      ? previewEvent
                      : event;
                    const displayColor = isBeingEdited
                      ? categories.find(
                          (c) =>
                            c.id === previewEvent.categoryId,
                        )?.color || "#FF2D55"
                      : categories.find(
                          (c) => c.id === event.categoryId,
                        )?.color || "#FF2D55";

                    return (
                      <div
                        key={event.id}
                        data-event="true"
                        className={`cursor-pointer transition-all shrink-0 flex items-center gap-2 pl-[4px] pr-[8px] rounded-sm select-none ${isBeingEdited ? "opacity-50 bg-muted/40" : ""}`}
                        style={
                          eventIndex === 0
                            ? {
                                marginTop: `${periodEventsHeight}px`,
                                height: "24px",
                              }
                            : {
                                height: "24px",
                              }
                        }
                        onMouseEnter={(e) => {
                          if (
                            !isBeingEdited &&
                            displayColor
                          ) {
                            e.currentTarget.style.backgroundColor =
                              displayColor + "0D"; // 95% 투명도 (5% 불투명도)
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isBeingEdited) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(
                            event,
                            e.currentTarget,
                          );
                        }}
                      >
                        {/* 왼쪽 색상 바 */}
                        <div
                          className="w-[4px] h-[16px] rounded-full shrink-0"
                          style={{
                            backgroundColor: displayColor,
                          }}
                        />

                        {/* 제목 */}
                        <span
                          className={`truncate flex-1 text-[13px] text-foreground ${isBeingEdited ? "italic" : ""}`}
                        >
                          {displayData.title ||
                            (language === "ko"
                              ? "(제목 없음)"
                              : "(No title)")}
                        </span>

                        {/* 반복 아이콘 */}
                        {(event.recurrence ||
                          event.rrule) && (
                          <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}

                        {/* 시간 */}
                        {displayData.startTime && (
                          <span className="text-muted-foreground shrink-0 text-[12px]">
                            {formatTime(
                              displayData.startTime,
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* 미리보기 일정 - 단일 일정인 경우에만 (기간 일정 아래에 배치) */}
                  {previewEvent &&
                    !selectedEvent &&
                    !previewEvent.isPeriod &&
                    previewEvent.startDate &&
                    date &&
                    previewEvent.startDate.getDate() ===
                      date.getDate() &&
                    previewEvent.startDate.getMonth() ===
                      date.getMonth() &&
                    previewEvent.startDate.getFullYear() ===
                      date.getFullYear() && (
                      <div
                        className="shrink-0 flex items-center gap-2 pl-[4px] pr-[8px] opacity-50 select-none"
                        style={
                          displayEvents.length === 0
                            ? {
                                marginTop: `${periodEventsHeight}px`,
                                height: "24px",
                              }
                            : {
                                height: "24px",
                              }
                        }
                      >
                        {/* 왼쪽 색상 바 */}
                        <div
                          className="w-[4px] h-[16px] rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              categories.find(
                                (c) =>
                                  c.id ===
                                  previewEvent.categoryId,
                              )?.color || "#000",
                          }}
                        />

                        {/* 제목 */}
                        <span className="truncate flex-1 text-[13px] text-foreground italic">
                          {previewEvent.title ||
                            (language === "ko"
                              ? "(제목 없음)"
                              : "(No title)")}
                        </span>

                        {/* 시간 */}
                        {previewEvent.startTime && (
                          <span className="text-muted-foreground shrink-0 text-[12px]">
                            {(() => {
                              const [hour, minute] =
                                previewEvent.startTime.split(
                                  ":",
                                );
                              const hourNum = parseInt(hour);
                              const period =
                                language === "ko"
                                  ? hourNum < 12
                                    ? "오전"
                                    : "오후"
                                  : hourNum < 12
                                    ? "AM"
                                    : "PM";
                              const displayHour =
                                hourNum === 0
                                  ? 12
                                  : hourNum > 12
                                    ? hourNum - 12
                                    : hourNum;
                              return `${period} ${displayHour}시`;
                            })()}
                          </span>
                        )}
                      </div>
                    )}

                  {/* 더 많은 이벤트가 있을 때 "외 n개의 일정" 표시 */}
                  {hasMoreEvents && remainingCount > 0 && (
                    <div
                      className="shrink-0 flex items-center justify-end gap-2 pl-2 pr-[8px] cursor-pointer select-none hover:text-[#0C8CE9] transition-colors"
                      style={
                        displayEvents.length === 0
                          ? {
                              marginTop: `${periodEventsHeight}px`,
                              height: "24px",
                            }
                          : {
                              height: "24px",
                            }
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        // 행 확장/축소 토글
                        setExpandedRows((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(rowIndex)) {
                            newSet.delete(rowIndex);
                          } else {
                            newSet.add(rowIndex);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <span className="text-[13px] text-muted-foreground group-hover:text-[#0C8CE9]">
                        {language === "ko"
                          ? `+ ${remainingCount}개 일정`
                          : `+${remainingCount} more`}
                      </span>
                    </div>
                  )}

                  {/* 새 일정 추가 버튼 (호버 시 표시) - 기간 일정 아래에 배치 */}
                  <EventCreatePopover
                    trigger={
                      <div
                        className={`transition-opacity shrink-0 flex items-center gap-2 pl-2 pr-[8px] bg-muted/30 mx-[4px] cursor-pointer hover:bg-muted/40 ${
                          monthViewPopoverOpen ||
                          (clickedDateForNewEvent !== null &&
                            clickedDateForNewEvent.toDateString() ===
                              date!.toDateString()) ||
                          (monthViewPopoverDate !== null &&
                            monthViewPopoverDate.toDateString() ===
                              date!.toDateString()) ||
                          (previewEvent &&
                            previewEvent.startDate &&
                            previewEvent.startDate.toDateString() ===
                              date!.toDateString()) ||
                          (isDragging &&
                            dragStartDate &&
                            dragEndDate &&
                            dragStartDate.getTime() !==
                              dragEndDate.getTime())
                            ? "opacity-0 pointer-events-none"
                            : "opacity-0 group-hover:opacity-100 group-has-[[data-event]:hover]:opacity-0"
                        }`}
                        style={
                          displayEvents.length === 0
                            ? {
                                marginTop: `${periodEventsHeight}px`,
                                height: "24px",
                                borderRadius: "6px",
                              }
                            : {
                                height: "24px",
                                borderRadius: "6px",
                              }
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          // 1. 클릭된 날짜 즉시 저장 → 버튼 숨김 및 비활성화
                          setClickedDateForNewEvent(date);
                          // 2. Popover 열기
                          setMonthViewPopoverDate(date);
                          setMonthViewPopoverOpen(true);
                        }}
                      >
                        <Plus
                          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                          strokeWidth={2}
                        />
                        <span className="text-[13px] font-medium text-muted-foreground">
                          {t("calendar.newEvent")}
                        </span>
                      </div>
                    }
                    selectedDate={
                      dragStartDate && isDragging
                        ? dragStartDate <
                          (dragEndDate || dragStartDate)
                          ? dragStartDate
                          : dragEndDate || dragStartDate
                        : date
                    }
                    selectedEndDate={
                      dragEndDate &&
                      dragStartDate &&
                      isDragging &&
                      dragStartDate.getTime() !==
                        dragEndDate.getTime()
                        ? dragStartDate < dragEndDate
                          ? dragEndDate
                          : dragStartDate
                        : undefined
                    }
                    defaultStartTime={getNextAvailableTime(
                      date,
                      events,
                    )}
                    defaultEndTime={(() => {
                      const startTime = getNextAvailableTime(
                        date,
                        events,
                      );
                      const startHour = parseInt(
                        startTime.split(":")[0],
                      );
                      return `${(startHour + 1).toString().padStart(2, "0")}:00`;
                    })()}
                    categories={categories}
                    language={language}
                    open={
                      monthViewPopoverDate !== null &&
                      date !== null &&
                      monthViewPopoverDate.getDate() ===
                        date.getDate() &&
                      monthViewPopoverDate.getMonth() ===
                        date.getMonth() &&
                      monthViewPopoverDate.getFullYear() ===
                        date.getFullYear()
                    }
                    onChange={(eventData) => {
                      // 실시간 미리보기 업데이트
                      setSelectedDate(date);
                      setPreviewEvent(eventData);
                    }}
                    onOpenChange={(open) => {
                      if (open) {
                        // 팝오버 열릴 때 미리보기 즉시 설정
                        setMonthViewPopoverDate(date);
                        setMonthViewPopoverOpen(true);
                        setSelectedDate(date);

                        // 다음 사용 가능한 시간 찾기
                        const availableStartTime =
                          getNextAvailableTime(date, events);
                        const startHour = parseInt(
                          availableStartTime.split(":")[0],
                        );
                        const availableEndTime = `${(startHour + 1).toString().padStart(2, "0")}:00`;

                        setPreviewEvent({
                          title: "",
                          startTime: availableStartTime,
                          endTime: availableEndTime,
                          description: "",
                          categoryId:
                            categories.length > 0
                              ? categories[0].id
                              : "",
                          isPeriod: !!(
                            dragStartDate &&
                            dragEndDate &&
                            dragStartDate.getTime() !==
                              dragEndDate.getTime()
                          ),
                          startDate:
                            dragStartDate && dragEndDate
                              ? dragStartDate < dragEndDate
                                ? dragStartDate
                                : dragEndDate
                              : dragStartDate || date!,
                          endDate:
                            dragStartDate &&
                            dragEndDate &&
                            dragStartDate.getTime() !==
                              dragEndDate.getTime()
                              ? dragStartDate < dragEndDate
                                ? dragEndDate
                                : dragStartDate
                              : undefined,
                        });
                      } else {
                        // 팝오버 닫힐 때 미리보기 및 드래그 상태 제거
                        setMonthViewPopoverDate(null);
                        setMonthViewPopoverOpen(false);
                        setClickedDateForNewEvent(null);
                        setPreviewEvent(null);
                        setDragStartDate(null);
                        setDragEndDate(null);
                        setIsDragging(false);
                      }
                    }}
                    onSave={async (eventData) => {
                      console.log(
                        "[Calendar-MonthView] onSave triggered with:",
                        eventData,
                      );

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
                        // 드래그 상태 초기화
                        setDragStartDate(null);
                        setDragEndDate(null);
                        setIsDragging(false);

                        // API로 이벤트 생성
                        const startDate = new Date(
                          eventData.startDate,
                        );
                        const endDate = eventData.endDate
                          ? new Date(eventData.endDate)
                          : new Date(eventData.startDate);

                        // 시간 설정
                        if (eventData.startTime) {
                          const [startHour, startMin] =
                            eventData.startTime
                              .split(":")
                              .map(Number);
                          startDate.setHours(
                            startHour,
                            startMin,
                            0,
                            0,
                          );
                        }
                        if (eventData.endTime) {
                          const [endHour, endMin] =
                            eventData.endTime
                              .split(":")
                              .map(Number);
                          endDate.setHours(
                            endHour,
                            endMin,
                            0,
                            0,
                          );
                        }
                        // 시간이 있는지 확인
                        const isAllDay =
                          !eventData.startTime &&
                          !eventData.endTime;

                        // RRule 변환 (rrule 문자열 → recurrence 배열)
                        const recurrence = eventData.rrule
                          ? [eventData.rrule]
                          : undefined;

                        // 🔥 구글 캘린더 기준: 종일 일정의 end_date는 EXCLUSIVE
                        let dbEndDate = eventData.endDate
                          ? new Date(eventData.endDate)
                          : new Date(eventData.startDate);
                        if (
                          isAllDay &&
                          eventData.endDate &&
                          eventData.endDate.getTime() !==
                            eventData.startDate.getTime()
                        ) {
                          dbEndDate = new Date(
                            eventData.endDate,
                          );
                          dbEndDate.setDate(
                            dbEndDate.getDate() + 1,
                          ); // +1일 (exclusive)
                        }

                        // 🔥 카테고리가 구글 캘린더인지 확인
                        const selectedCategory =
                          categories.find(
                            (c) =>
                              c.id === eventData.categoryId,
                          );
                        const isGoogleCalendarCategory =
                          selectedCategory?.isGoogleCalendar &&
                          selectedCategory?.googleCalendarId;

                        console.log(
                          "[Calendar-MonthView] 🔍 Category check:",
                        );
                        console.log(
                          "  - Selected categoryId:",
                          eventData.categoryId,
                        );
                        console.log(
                          "  - Found category:",
                          selectedCategory,
                        );
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
                          !!session.provider_token,
                        );

                        if (
                          isGoogleCalendarCategory &&
                          session.provider_token
                        ) {
                          // 구글 캘린더에 직접 생성
                          console.log(
                            "[Calendar-MonthView] ✅ Creating event in Google Calendar:",
                            selectedCategory.googleCalendarId,
                          );

                          const response = await fetch(
                            `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events/${encodeURIComponent(selectedCategory.googleCalendarId!)}`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type":
                                  "application/json",
                                Authorization: `Bearer ${publicAnonKey}`,
                                "X-User-JWT":
                                  session.access_token,
                                "X-Google-Access-Token":
                                  session.provider_token,
                              },
                              body: JSON.stringify({
                                title: eventData.title,
                                description:
                                  eventData.description,
                                startDate: formatDate(
                                  new Date(
                                    eventData.startDate,
                                  ),
                                ),
                                endDate: formatDate(
                                  eventData.endDate
                                    ? new Date(
                                        eventData.endDate,
                                      )
                                    : new Date(
                                        eventData.startDate,
                                      ),
                                ),
                                startTime:
                                  eventData.startTime,
                                endTime: eventData.endTime,
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
                                "[Calendar-MonthView] ⚠️ Google Calendar permission error:",
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

                          const googleEvent =
                            await response.json();
                          console.log(
                            "[Calendar-MonthView] Google Calendar event created:",
                            googleEvent,
                          );

                          // UI에 추가 (구글 이벤트로 표시)
                          const newEvent: CalendarEvent = {
                            id: `google-${googleEvent.id}`,
                            title: eventData.title,
                            date: eventData.startDate,
                            endDate: eventData.endDate,
                            startTime: eventData.startTime,
                            endTime: eventData.endTime,
                            description:
                              eventData.description,
                            categoryId: eventData.categoryId,
                            recurrence: eventData.recurrence,
                            rrule: eventData.rrule,
                            isGoogleEvent: true,
                            googleEventId: googleEvent.id,
                            googleCalendarId:
                              selectedCategory.googleCalendarId,
                            googleCalendarName:
                              selectedCategory.name,
                          };

                          setEvents((prev) => [...prev, newEvent]);
                          setMonthViewPopoverDate(null);
                          setPreviewEvent(null);
                          setDragStartDate(null);
                          setDragEndDate(null);
                          setIsDragging(false);
                          toast.success(
                            language === "ko"
                              ? "구글 캘린더에 일정이 생성되었습니다"
                              : "Event created in Google Calendar",
                          );
                        } else {
                          // 일반 카테고리는 Supabase DB에 생성
                          console.log(
                            "[Calendar-MonthView] Creating event via API...",
                          );
                          const dbEvent =
                            await eventsAPI.create(
                              {
                                summary: eventData.title, // title → summary
                                description:
                                  eventData.description ||
                                  undefined,
                                is_all_day: isAllDay,
                                start_date: isAllDay
                                  ? formatDate(
                                      new Date(
                                        eventData.startDate,
                                      ),
                                    )
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
                                category_id:
                                  eventData.categoryId ||
                                  undefined,
                                recurrence: recurrence, // rrule → recurrence[]
                                user_id: userId,
                              },
                              session.access_token,
                            );

                          console.log(
                            "[Calendar-MonthView] Event created successfully:",
                            dbEvent,
                          );

                          // UI에 추가
                          const newEvent: CalendarEvent = {
                            id: dbEvent.id,
                            title: eventData.title,
                            date: eventData.startDate,
                            endDate: eventData.endDate,
                            startTime: eventData.startTime,
                            endTime: eventData.endTime,
                            description:
                              eventData.description,
                            categoryId: eventData.categoryId,
                            recurrence: eventData.recurrence,
                            rrule: eventData.rrule,
                          };
                          setEvents((prev) => [...prev, newEvent]);
                          setMonthViewPopoverDate(null);
                          setPreviewEvent(null);
                          setDragStartDate(null);
                          setDragEndDate(null);
                          setIsDragging(false);

                          toast.success(
                            language === "ko"
                              ? "일정이 생성되었습니다"
                              : "Event created",
                          );
                        }
                      } catch (error) {
                        console.error(
                          "[Calendar-MonthView] Failed to create event:",
                          error,
                        );
                        toast.error(
                          language === "ko"
                            ? "일정 생성에 실패했습니다"
                            : "Failed to create event",
                        );
                      }
                    }}
                    onAddCategory={async (categoryData) => {
                      // 카테고리 DB에 생성
                      try {
                        if (!session?.access_token) {
                          toast.error(
                            language === "ko"
                              ? "로그인이 필요합니다"
                              : "Login required",
                          );
                          return "";
                        }

                        console.log(
                          "[Calendar-MonthView] Creating category:",
                          categoryData,
                        );

                        // 다음 order_index 계산
                        const maxOrderIndex =
                          categories.length > 0
                            ? Math.max(
                                ...categories.map((c) =>
                                  categories.indexOf(c),
                                ),
                              )
                            : 0;

                        const dbCategory =
                          await categoriesAPI.create(
                            {
                              name: categoryData.name,
                              color: categoryData.color,
                              type: ["calendar"],
                              order_index: maxOrderIndex + 1,
                              user_id: userId,
                            },
                            session.access_token,
                          );

                        console.log(
                          "[Calendar-MonthView] Category created successfully:",
                          dbCategory,
                        );

                        // UI에 추가
                        const newCategory: Category = {
                          id: dbCategory.id,
                          name: dbCategory.name,
                          color: dbCategory.color,
                        };

                        setCategories((prev) => [
                          ...prev,
                          newCategory,
                        ]);

                        // 새로 생성된 카테고리를 필터에 추가 (캘린더에 보이도록)
                        setSelectedCategoryIds((prev) => [
                          ...prev,
                          newCategory.id,
                        ]);

                        toast.success(
                          language === "ko"
                            ? "카테고리가 생성되었습니다"
                            : "Category created",
                        );

                        // 새로 생성된 카테고리 ID 반환
                        return newCategory.id;
                      } catch (error) {
                        console.error(
                          "[Calendar-MonthView] Failed to create category:",
                          error,
                        );
                        toast.error(
                          language === "ko"
                            ? "카테고리 생성에 실패했습니다"
                            : "Failed to create category",
                        );
                        return "";
                      }
                    }}
                    onUpdateCategory={async (
                      categoryId,
                      categoryData,
                    ) => {
                      // 카테고리 DB에서 수정
                      try {
                        if (!session?.access_token) {
                          toast.error(
                            language === "ko"
                              ? "로그인이 필요합니다"
                              : "Login required",
                          );
                          return;
                        }

                        console.log(
                          "[Calendar-MonthView] Updating category:",
                          categoryId,
                        );

                        await categoriesAPI.update(
                          categoryId,
                          {
                            name: categoryData.name,
                            color: categoryData.color,
                          },
                          session.access_token,
                        );

                        console.log(
                          "[Calendar-MonthView] Category updated successfully",
                        );

                        // UI 업데이트
                        setCategories((prev) =>
                          prev.map((cat) =>
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
                        console.error(
                          "[Calendar-MonthView] Failed to update category:",
                          error,
                        );
                        toast.error(
                          language === "ko"
                            ? "카테고리 수정에 실패했습니다"
                            : "Failed to update category",
                        );
                      }
                    }}
                    onDeleteCategory={async (categoryId) => {
                      // 최소 1개 카테고리 검증
                      if (categories.length <= 1) {
                        toast.error(
                          language === "ko"
                            ? "최소 한 개의 카테고리는 남아있어야 합니다"
                            : "At least one category must remain",
                        );
                        return;
                      }

                      // 카테고리 DB에서 삭제
                      try {
                        if (!session?.access_token) {
                          toast.error(
                            language === "ko"
                              ? "로그인이 필요합니다"
                              : "Login required",
                          );
                          return;
                        }

                        console.log(
                          "[Calendar-MonthView] Deleting category:",
                          categoryId,
                        );

                        await categoriesAPI.delete(
                          categoryId,
                          session.access_token,
                        );

                        console.log(
                          "[Calendar-MonthView] Category deleted successfully",
                        );

                        // UI에서 제거
                        setCategories((prev) =>
                          prev.filter(
                            (cat) => cat.id !== categoryId,
                          ),
                        );
                        setSelectedCategoryIds((prev) =>
                          prev.filter(
                            (id) => id !== categoryId,
                          ),
                        );

                        // 삭제된 카테고리를 사용하는 이벤트들은 DB의 ON DELETE SET NULL에 의해 자동으로 null로 설정됨
                        // UI에서도 categoryId를 제거
                        setEvents((prev) =>
                          prev.map((event) =>
                            event.categoryId === categoryId
                              ? {
                                  ...event,
                                  categoryId: undefined,
                                }
                              : event,
                          ),
                        );

                        toast.success(
                          language === "ko"
                            ? "카테고리가 삭제되었습니다"
                            : "Category deleted",
                        );
                      } catch (error) {
                        console.error(
                          "[Calendar-MonthView] Failed to delete category:",
                          error,
                        );
                        toast.error(
                          language === "ko"
                            ? "카테고리 삭제에 실패했습니다"
                            : "Failed to delete category",
                        );
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
