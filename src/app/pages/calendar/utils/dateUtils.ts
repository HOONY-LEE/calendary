import type { ViewType } from "../types";

export const monthNames: { ko: string[]; en: string[] } = {
  ko: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

export const dayNames: { ko: string[]; en: string[] } = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const getDaysInMonth = (
  date: Date,
): { days: (Date | null)[]; rows: number } => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    const prevMonthDay = new Date(
      year,
      month,
      -startingDayOfWeek + i + 1,
    );
    days.push(prevMonthDay);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const totalCells = days.length;
  const weeksNeeded = Math.ceil(totalCells / 7);
  const targetCells = weeksNeeded * 7;
  const remainingCells = targetCells - days.length;

  for (let i = 1; i <= remainingCells; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return { days, rows: weeksNeeded };
};

export const getWeekDays = (date: Date): Date[] => {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const sunday = new Date(date);
  sunday.setDate(diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(sunday);
    weekDay.setDate(sunday.getDate() + i);
    days.push(weekDay);
  }
  return days;
};

export const isToday = (date: Date | null): boolean => {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isCurrentMonth = (
  date: Date | null,
  currentDate: Date,
): boolean => {
  if (!date) return false;
  return date.getMonth() === currentDate.getMonth();
};

/**
 * 이전 기간으로 이동할 새 날짜를 계산
 */
export const getPreviousPeriodDate = (
  currentDate: Date,
  viewType: ViewType,
): Date => {
  if (viewType === "day") {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    return newDate;
  } else if (viewType === "week") {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    return newDate;
  } else if (viewType === "year") {
    return new Date(currentDate.getFullYear() - 1, 0, 1);
  } else {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
  }
};

/**
 * 다음 기간으로 이동할 새 날짜를 계산
 */
export const getNextPeriodDate = (
  currentDate: Date,
  viewType: ViewType,
): Date => {
  if (viewType === "day") {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    return newDate;
  } else if (viewType === "week") {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    return newDate;
  } else if (viewType === "year") {
    return new Date(currentDate.getFullYear() + 1, 0, 1);
  } else {
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
  }
};

/**
 * YYYY-MM-DD 형식으로 날짜 변환
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
