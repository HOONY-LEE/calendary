import {
  Phone,
  MapPin,
  Briefcase,
  Users,
  MoreHorizontal,
  ListTodo,
  Repeat,
} from "lucide-react";
import type { CalendarEvent, Category } from "../types";
import {
  getWeekDays,
  dayNames,
  isToday,
} from "../utils/dateUtils";
import { getTextColor } from "../utils/colorUtils";
import { expandRecurringEvents } from "../utils/eventUtils";

interface PreviewEvent {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
  categoryId: string;
  startDate?: Date;
  endDate?: Date;
  isPeriod?: boolean;
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: string;
  selectedEvent: CalendarEvent | null;
  previewEvent: PreviewEvent | null;
  onEventClick: (event: CalendarEvent, element?: HTMLElement) => void;
  onAddEventClick: (date: Date, hour?: number) => void;
}

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

export function WeekView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  selectedEvent,
  previewEvent,
  onEventClick,
  onAddEventClick,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 주간 뷰의 시작과 끝 날짜
  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];

  // 반복 일정 확장
  const expandedEvents = expandRecurringEvents(
    events,
    weekStart,
    weekEnd,
  );

  // 특정 날짜의 이벤트 가져오기 (확장된 이벤트 사용)
  const getEventsForDateExpanded = (date: Date | null) => {
    if (!date) return [];
    return expandedEvents
      .filter((event) => {
        const startDateMatch =
          event.date.getDate() === date.getDate() &&
          event.date.getMonth() === date.getMonth() &&
          event.date.getFullYear() === date.getFullYear();

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

  return (
    <div
      className="grid flex-1 min-h-0 border border-border rounded-md overflow-hidden"
      style={{
        gridTemplateColumns: "64px repeat(7, 1fr)",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <div className="border-b border-r bg-muted/30" />

      {weekDays.map((day, index) => {
        const isTodayDate = isToday(day);
        const dayOfWeek = day.getDay();

        return (
          <div
            key={index}
            className="px-2 py-1 text-center bg-muted/30 border-b border-r last:border-r-0 relative"
          >
            <span className={`text-[13px] ${getTextColor(isTodayDate, dayOfWeek)}`}>
              {dayNames[language][day.getDay()]} (
              {day.getDate()})
            </span>
          </div>
        );
      })}

      <div className="relative border-r bg-muted/30">
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute left-0 right-0 px-2 py-1"
            style={{
              top: `${(index / hours.length) * 100}%`,
              height: `${(1 / hours.length) * 100}%`,
              borderBottom:
                index < hours.length - 1
                  ? "1px solid var(--color-border)"
                  : "none",
            }}
          >
            <span className="text-[11px] text-muted-foreground">
              {hour.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {weekDays.map((day, dayIndex) => {
        const dayEvents = getEventsForDateExpanded(day);
        const isTodayDate = isToday(day);

        return (
          <div
            key={dayIndex}
            className="border-r last:border-r-0 relative"
          >
            {hours.map((hour, index) => (
              <div
                key={hour}
                onClick={(e) => {
                  if (
                    (e?.target as HTMLElement).closest(
                      '[data-event="true"]',
                    )
                  ) {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
                  onAddEventClick(day, hour);
                }}
                className="absolute left-0 right-0 cursor-pointer hover:bg-muted/10"
                style={{
                  top: `${(index / hours.length) * 100}%`,
                  height: `${(1 / hours.length) * 100}%`,
                  borderBottom:
                    index < hours.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
              />
            ))}

            {dayEvents.map((event) => {
              const startHour = event.startTime
                ? parseInt(event.startTime.split(":")[0])
                : 0;
              const startMinute = event.startTime
                ? parseInt(event.startTime.split(":")[1])
                : 0;
              const endHour = event.endTime
                ? parseInt(event.endTime.split(":")[0])
                : startHour + 1;
              const endMinute = event.endTime
                ? parseInt(event.endTime.split(":")[1])
                : 0;

              const startPosition =
                ((startHour * 60 + startMinute) / (24 * 60)) *
                100;
              const duration =
                ((endHour * 60 +
                  endMinute -
                  (startHour * 60 + startMinute)) /
                  (24 * 60)) *
                100;

              // 이 일정이 현재 수정중인 일정인지 확인
              const isBeingEdited =
                selectedEvent?.id === event.id &&
                previewEvent;
              const displayData = isBeingEdited
                ? {
                    title: previewEvent.title,
                    startTime: previewEvent.startTime,
                    endTime: previewEvent.endTime,
                    categoryId: previewEvent.categoryId,
                  }
                : event;
              const displayColor = isBeingEdited
                ? categories.find(
                    (c) => c.id === previewEvent.categoryId,
                  )?.color || "#FF2D55"
                : categories.find(
                    (c) => c.id === event.categoryId,
                  )?.color || "#FF2D55";

              // 표시할 시간 계산
              const displayStartHour = displayData.startTime
                ? parseInt(
                    displayData.startTime.split(":")[0],
                  )
                : 0;
              const displayStartMinute = displayData.startTime
                ? parseInt(
                    displayData.startTime.split(":")[1],
                  )
                : 0;
              const displayEndHour = displayData.endTime
                ? parseInt(displayData.endTime.split(":")[0])
                : displayStartHour + 1;
              const displayEndMinute = displayData.endTime
                ? parseInt(displayData.endTime.split(":")[1])
                : 0;

              const displayStartPosition =
                ((displayStartHour * 60 +
                  displayStartMinute) /
                  (24 * 60)) *
                100;
              const displayDuration =
                ((displayEndHour * 60 +
                  displayEndMinute -
                  (displayStartHour * 60 +
                    displayStartMinute)) /
                  (24 * 60)) *
                100;

              return (
                <div
                  key={event.id}
                  data-event="true"
                  className={`absolute rounded-sm px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden pointer-events-auto flex items-center ${isBeingEdited ? "opacity-50 bg-muted/40" : ""}`}
                  style={{
                    top: `${displayStartPosition}%`,
                    height: `${displayDuration}%`,
                    left: "4px",
                    width: "calc(100% - 8px)",
                    backgroundColor: displayColor + "20",
                    borderLeft: `3px solid ${displayColor}`,
                    minHeight: "28px",
                  }}
                  onClick={(e) =>
                    onEventClick(event, e.currentTarget)
                  }
                >
                  <div
                    className={`flex items-center gap-1.5 truncate text-[13px] font-medium ${isBeingEdited ? "italic" : ""}`}
                    style={{ color: displayColor }}
                  >
                    <span className="shrink-0">
                      {displayData.categoryId &&
                        getCategoryIcon(
                          categories.find(
                            (c) =>
                              c.id === displayData.categoryId,
                          ) as Category,
                          "h-3.5 w-3.5",
                        )}
                    </span>
                    {(event.recurrence || event.rrule) && (
                      <Repeat
                        className="w-3 h-3 shrink-0"
                        style={{ color: displayColor }}
                      />
                    )}
                    <span className="truncate">
                      {displayData.title ||
                        (({ ko: "(제목 없음)", en: "(No title)", zh: "(无标题)" } as Record<string, string>)[language] || "(No title)")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
