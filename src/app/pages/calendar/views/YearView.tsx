import type { CalendarEvent, Category } from "../types";
import { expandRecurringEvents } from "../utils/eventUtils";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedCategoryIds: string[];
  categories: Category[];
  language: "ko" | "en";
  onDateClick: (date: Date) => void;
  onViewChange: (view: "month") => void;
}

export function YearView({
  currentDate,
  events,
  selectedCategoryIds,
  categories,
  language,
  onDateClick,
  onViewChange,
}: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);

  // 연간 뷰를 위한 날짜 범위 설정
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  // 반복 일정 확장 및 카테고리 필터링
  const expandedEvents = expandRecurringEvents(
    events,
    yearStart,
    yearEnd,
  ).filter(
    (event) =>
      !event.categoryId ||
      selectedCategoryIds.includes(event.categoryId),
  );

  // 각 월의 일정 개수 계산
  const getEventsCountForMonth = (monthIndex: number) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    return expandedEvents.filter((event) => {
      const eventDate = new Date(event.date);
      const eventEndDate = event.endDate
        ? new Date(event.endDate)
        : eventDate;

      // 일정이 해당 월과 겹치는지 확인
      return (
        (eventDate >= monthStart && eventDate <= monthEnd) ||
        (eventEndDate >= monthStart &&
          eventEndDate <= monthEnd) ||
        (eventDate < monthStart && eventEndDate > monthEnd)
      );
    }).length;
  };

  // 작은 월간 캘린더 렌더링
  const renderMiniMonth = (monthIndex: number) => {
    const monthStart = new Date(year, monthIndex, 1);
    const firstDayOfMonth = monthStart.getDay();
    const daysInMonth = new Date(
      year,
      monthIndex + 1,
      0,
    ).getDate();

    const days: (number | null)[] = [
      ...Array(firstDayOfMonth).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year &&
      today.getMonth() === monthIndex;
    const todayDate = today.getDate();

    return (
      <div className="flex flex-col gap-1">
        {/* 월 헤더와 일정 개수를 같은 라인에 배치 */}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[20px] font-bold">
            {language === "ko"
              ? `${monthIndex + 1}월`
              : new Date(year, monthIndex).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                  },
                )}
          </h3>
          <span className="text-xs text-muted-foreground">
            {getEventsCountForMonth(monthIndex)}{" "}
            {language === "ko" ? "개" : ""}
          </span>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-px">
          {(language === "ko"
            ? ["일", "월", "화", "수", "목", "금", "토"]
            : ["S", "M", "T", "W", "T", "F", "S"]
          ).map((day, i) => {
            return (
              <div
                key={i}
                className="text-xs text-center font-medium h-5 flex items-center justify-center text-muted-foreground"
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, index) => {
            const isToday =
              isCurrentMonth && day === todayDate;
            const date = day
              ? new Date(year, monthIndex, day)
              : null;

            // 해당 날짜의 일정 가져오기
            const dayEvents = date
              ? expandedEvents.filter((event) => {
                  const eventDate = new Date(event.date);
                  const eventEndDate = event.endDate
                    ? new Date(event.endDate)
                    : eventDate;

                  const normalizedDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  const normalizedEventStart = new Date(
                    eventDate.getFullYear(),
                    eventDate.getMonth(),
                    eventDate.getDate(),
                  );
                  const normalizedEventEnd = new Date(
                    eventEndDate.getFullYear(),
                    eventEndDate.getMonth(),
                    eventEndDate.getDate(),
                  );

                  return (
                    normalizedDate >= normalizedEventStart &&
                    normalizedDate <= normalizedEventEnd
                  );
                })
              : [];

            // 🎌 공휴일 체크
            const isHoliday = dayEvents.some(
              (e) => e.isHoliday,
            );

            // 공휴일 제외한 일반 일정만 카운트
            const regularEvents = dayEvents.filter(
              (e) => !e.isHoliday,
            );
            const dayEventsCount = regularEvents.length;

            return (
              <button
                key={index}
                onClick={() => {
                  if (day) {
                    onDateClick(
                      new Date(year, monthIndex, 1),
                    );
                    onViewChange("month");
                  }
                }}
                disabled={!day}
                className={`
                  h-9 flex items-center justify-center text-sm rounded relative
                  ${!day ? "invisible" : ""}
                  ${isToday ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium" : "hover:bg-[#F5F5F5] dark:hover:bg-[#252525]"}
                  ${!isToday && day ? (isHoliday ? "text-red-500" : "text-foreground") : ""}
                `}
              >
                {day}
                {dayEventsCount > 0 && !isToday && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {regularEvents
                      .slice(0, 3)
                      .map((event, i) => {
                        const category = categories.find(
                          (c) => c.id === event.categoryId,
                        );
                        const eventColor =
                          category?.color || "#FF2D55";
                        return (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{
                              backgroundColor: eventColor,
                            }}
                          />
                        );
                      })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden flex items-center justify-center">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-full  h-full p-[0px]">
        {months.map((monthIndex) => (
          <div
            key={monthIndex}
            className="rounded-lg border w-full p-[16px]"
          >
            {renderMiniMonth(monthIndex)}
          </div>
        ))}
      </div>
    </div>
  );
}
