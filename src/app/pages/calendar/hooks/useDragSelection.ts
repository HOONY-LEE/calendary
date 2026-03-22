import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent, Category } from "../types";
import { getNextAvailableTime } from "../utils/eventUtils";

interface UseDragSelectionParams {
  events: CalendarEvent[];
  categories: Category[];
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setPreviewEvent: React.Dispatch<React.SetStateAction<any>>;
  setMonthViewPopoverDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setMonthViewPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseDragSelectionReturn {
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  dragStartDate: Date | null;
  setDragStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
  dragEndDate: Date | null;
  setDragEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
  isDateInDragRange: (date: Date | null) => boolean;
  handleMouseDown: (date: Date | null, e: React.MouseEvent) => void;
  handleMouseEnter: (date: Date | null) => void;
  handleMouseUp: () => void;
}

export function useDragSelection({
  events,
  categories,
  setSelectedDate,
  setSelectedEvent,
  setFormData,
  setPreviewEvent,
  setMonthViewPopoverDate,
  setMonthViewPopoverOpen,
}: UseDragSelectionParams): UseDragSelectionReturn {
  const [dragStartDate, setDragStartDate] =
    useState<Date | null>(null);
  const [dragEndDate, setDragEndDate] = useState<Date | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  // 드래그된 날짜 범위인지 확인하는 함수
  const isDateInDragRange = useCallback((date: Date | null) => {
    if (!date || !dragStartDate || !dragEndDate) return false;

    const start =
      dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
    const end =
      dragStartDate < dragEndDate ? dragEndDate : dragStartDate;

    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const startOnly = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const endOnly = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
    );

    return dateOnly >= startOnly && dateOnly <= endOnly;
  }, [dragStartDate, dragEndDate]);

  // 드래그 핸들러들
  const handleMouseDown = useCallback((
    date: Date | null,
    e: React.MouseEvent,
  ) => {
    if (!date) return;
    // 이벤트나 버튼 클릭이면 드래그 시작 안함
    if (
      (e.target as HTMLElement).closest(
        '[data-event="true"]',
      ) ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }
    setIsDragging(true);
    setDragStartDate(date);
    setDragEndDate(null);
  }, []);

  const handleMouseEnter = useCallback((date: Date | null) => {
    if (!date || !isDragging) return;

    // 드래그 시작 날짜와 같은 날짜로 돌아오면 dragEndDate를 null로 설정
    if (
      dragStartDate &&
      date.getFullYear() === dragStartDate.getFullYear() &&
      date.getMonth() === dragStartDate.getMonth() &&
      date.getDate() === dragStartDate.getDate()
    ) {
      setDragEndDate(null);
    } else {
      setDragEndDate(date);
    }
  }, [isDragging, dragStartDate]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStartDate || !dragEndDate) {
      setIsDragging(false);
      setDragStartDate(null);
      setDragEndDate(null);
      return;
    }

    // 시작일과 종료일 정렬
    const start =
      dragStartDate < dragEndDate ? dragStartDate : dragEndDate;
    const end =
      dragStartDate < dragEndDate ? dragEndDate : dragStartDate;

    // 단일 날짜인 경우 기존 동작 유지
    if (start.getTime() === end.getTime()) {
      setIsDragging(false);
      setDragStartDate(null);
      setDragEndDate(null);
      return;
    }

    // 여러 날짜 선택된 경우 팝오버 열기
    setSelectedDate(start);
    setSelectedEvent(null);

    // 다음 사용 가능한 시간 찾기
    const availableStartTime = getNextAvailableTime(
      start,
      events,
    );
    const startHour = parseInt(
      availableStartTime.split(":")[0],
    );
    const availableEndTime = `${(startHour + 1).toString().padStart(2, "0")}:00`;

    setFormData({
      title: "",
      startTime: availableStartTime,
      endTime: availableEndTime,
      description: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
    });
    setPreviewEvent({
      title: "",
      startTime: availableStartTime,
      endTime: availableEndTime,
      description: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
      startDate: start,
      endDate: end,
      isPeriod: true,
    });
    setMonthViewPopoverDate(start);
    setMonthViewPopoverOpen(true);

    // 드래그 상태는 다음 프레임에 초기화 (레이어 계산 완료 후)
    setTimeout(() => {
      setIsDragging(false);
      setDragStartDate(null);
      setDragEndDate(null);
    }, 0);
  }, [isDragging, dragStartDate, dragEndDate, events, categories, setSelectedDate, setSelectedEvent, setFormData, setPreviewEvent, setMonthViewPopoverDate, setMonthViewPopoverOpen]);

  // 전역 mouseup 이벤트 리스너 추가
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isDragging || !dragStartDate || !dragEndDate) {
        setIsDragging(false);
        setDragStartDate(null);
        setDragEndDate(null);
        return;
      }

      // 시작일과 종료일 정렬
      const start =
        dragStartDate < dragEndDate
          ? dragStartDate
          : dragEndDate;
      const end =
        dragStartDate < dragEndDate
          ? dragEndDate
          : dragStartDate;

      // 단일 날짜인 경우 기존 동작 유지
      if (start.getTime() === end.getTime()) {
        setIsDragging(false);
        setDragStartDate(null);
        setDragEndDate(null);
        return;
      }

      // 여러 날짜 선택된 경우 팝오버 열기
      setSelectedDate(start);
      setSelectedEvent(null);

      // 다음 사용 가능한 시간 찾기
      const availableStartTime = getNextAvailableTime(
        start,
        events,
      );
      const startHour = parseInt(
        availableStartTime.split(":")[0],
      );
      const availableEndTime = `${(startHour + 1).toString().padStart(2, "0")}:00`;

      setFormData({
        title: "",
        startTime: availableStartTime,
        endTime: availableEndTime,
        description: "",
        categoryId:
          categories.length > 0 ? categories[0].id : "",
      });
      setPreviewEvent({
        title: "",
        startTime: availableStartTime,
        endTime: availableEndTime,
        description: "",
        categoryId:
          categories.length > 0 ? categories[0].id : "",
        startDate: start,
        endDate: end,
        isPeriod: true,
      });
      setMonthViewPopoverDate(start);
      setMonthViewPopoverOpen(true);

      // 드래그 상태는 다음 프레임에 초기화 (레이어 계산 완료 후)
      setTimeout(() => {
        setIsDragging(false);
        setDragStartDate(null);
        setDragEndDate(null);
      }, 0);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () =>
      window.removeEventListener(
        "mouseup",
        handleGlobalMouseUp,
      );
  }, [isDragging, dragStartDate, dragEndDate]);

  return {
    isDragging,
    setIsDragging,
    dragStartDate,
    setDragStartDate,
    dragEndDate,
    setDragEndDate,
    isDateInDragRange,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
}
