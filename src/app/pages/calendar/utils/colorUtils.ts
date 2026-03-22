export const COLOR_PRESETS = [
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

// 구글 캘린더 색상 프리셋 (colorId → 진한 색상 매핑)
export const GOOGLE_CALENDAR_COLOR_MAP: { [key: string]: string } = {
  "1": "#795548", // Cocoa - 진한 갈색
  "2": "#e67c73", // Flamingo - 진한 핑크
  "3": "#d50000", // Tomato - 진한 빨강
  "4": "#f4511e", // Tangerine - 진한 오렌지
  "5": "#f09300", // Banana - 진한 노랑
  "6": "#0b8043", // Basil - 진한 초록
  "7": "#009688", // Sage - 진한 청록
  "8": "#039be5", // Peacock - 진한 파랑
  "9": "#3f51b5", // Blueberry - 진한 남색
  "10": "#7986cb", // Lavender - 진한 보라
  "11": "#8e24aa", // Grape - 진한 자주
  "12": "#616161", // Graphite - 회색
  "13": "#33b679", // Birch - 진한 민트
  "14": "#039be5", // Radicchio - 진한 하늘색
  "15": "#3f51b5", // Cherry Blossom - 진한 파랑
  "16": "#ad1457", // Eucalyptus - 진한 핑크
  "17": "#d81b60", // Pistachio - 진한 마젠타
  "18": "#c0ca33", // Avocado - 진한 라임
  "19": "#e67c73", // Citron - 핑크
  "20": "#f4511e", // Pumpkin - 진한 오렌지
  "21": "#ef6c00", // Mango - 진한 오렌지
  "22": "#c0ca33", // Eucalyptus - 진한 연두
  "23": "#009688", // Basil - 진한 청록
  "24": "#7cb342", // Pistachio - 진한 초록
};

// 색상 팔레트
export const colorPalette = [
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

/**
 * 색상을 10% 불투명도로 변환하는 함수
 * #RRGGBB 형식을 rgba로 변환
 */
export const getBackgroundColor = (color?: string): string => {
  // color가 없으면 기본 색상 사용
  if (!color) {
    color = "#FF2D55";
  }
  // #RRGGBB 형식을 rgba로 변환
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
};

/**
 * 요일에 따른 텍스트 색상 클래스 반환
 */
export const getTextColor = (
  isTodayDate: boolean,
  dayOfWeek: number,
): string => {
  if (isTodayDate) return "text-foreground font-medium";
  if (dayOfWeek === 0) return "text-red-500";
  if (dayOfWeek === 6) return "text-blue-500";
  return "text-muted-foreground";
};
