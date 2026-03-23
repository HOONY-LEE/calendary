import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export interface RecurrenceSectionProps {
  language: string;
  recurrenceFreq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  setRecurrenceFreq: (freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY") => void;
  selectedWeekdays: number[];
  setSelectedWeekdays: (weekdays: number[]) => void;
  recurrenceEndType: "never" | "date" | "count";
  setRecurrenceEndType: (type: "never" | "date" | "count") => void;
  recurrenceCount: string | number;
  setRecurrenceCount: (count: string | number) => void;
  recurrenceEndDate: Date | undefined;
  setRecurrenceEndDate: (date: Date | undefined) => void;
  internalStartDate: Date | undefined;
}

export function RecurrenceSection({
  language,
  recurrenceFreq,
  setRecurrenceFreq,
  selectedWeekdays,
  setSelectedWeekdays,
  recurrenceEndType,
  setRecurrenceEndType,
  recurrenceCount,
  setRecurrenceCount,
  recurrenceEndDate,
  setRecurrenceEndDate,
  internalStartDate,
}: RecurrenceSectionProps) {
  return (
    <div className="space-y-2">
      {/* Frequency selector - SegmentTabs style */}
      <div className="inline-flex rounded-lg bg-muted/50 p-1 w-full">
        {(
          [
            "DAILY",
            "WEEKLY",
            "MONTHLY",
            "YEARLY",
          ] as const
        ).map((freq) => {
          const labels = {
            DAILY: { ko: "매일", en: "Daily", zh: "每天" } as Record<string, string>,
            WEEKLY: { ko: "매주", en: "Weekly", zh: "每周" } as Record<string, string>,
            MONTHLY: { ko: "매월", en: "Monthly", zh: "每月" } as Record<string, string>,
            YEARLY: { ko: "년", en: "Yearly", zh: "每年" } as Record<string, string>,
          };
          return (
            <button
              key={freq}
              onClick={() => setRecurrenceFreq(freq)}
              className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-all ${
                recurrenceFreq === freq
                  ? "bg-background text-[#0c8ce9] font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {labels[freq][language] || labels[freq]["en"]}
            </button>
          );
        })}
      </div>

      {/* Weekly weekday selector */}
      {recurrenceFreq === "WEEKLY" && (
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            {({ ko: "반복 요일", en: "Repeat on", zh: "重复日" } as Record<string, string>)[language] || "Repeat on"}
          </Label>
          <div className="grid grid-cols-7 gap-1">
            {[
              { ko: "월", en: "M", zh: "一", value: 0 },
              { ko: "화", en: "T", zh: "二", value: 1 },
              { ko: "수", en: "W", zh: "三", value: 2 },
              { ko: "목", en: "T", zh: "四", value: 3 },
              { ko: "금", en: "F", zh: "五", value: 4 },
              { ko: "토", en: "S", zh: "六", value: 5 },
              { ko: "일", en: "S", zh: "日", value: 6 },
            ].map((day) => {
              const isSelected =
                selectedWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedWeekdays(
                        selectedWeekdays.filter(
                          (d) => d !== day.value,
                        ),
                      );
                    } else {
                      setSelectedWeekdays(
                        [
                          ...selectedWeekdays,
                          day.value,
                        ].sort(),
                      );
                    }
                  }}
                  className={`h-10 text-sm rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#0C8CE9] text-white"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {(day as Record<string, any>)[language] || day["en"]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurrence end */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">
          {({ ko: "종료", en: "Ends", zh: "结束" } as Record<string, string>)[language] || "Ends"}
        </Label>

        {/* End type selector - SegmentTabs style + count input */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex rounded-lg bg-muted/50 p-1">
            {(
              ["never", "date", "count"] as const
            ).map((type) => {
              const labels = {
                never: { ko: "없음", en: "Never", zh: "永不" } as Record<string, string>,
                date: { ko: "날짜", en: "Date", zh: "日期" } as Record<string, string>,
                count: { ko: "횟수", en: "Count", zh: "次数" } as Record<string, string>,
              };
              return (
                <button
                  key={type}
                  onClick={() => {
                    setRecurrenceEndType(type);
                    // When date tab is selected, auto-set to 1 year later
                    if (
                      type === "date" &&
                      internalStartDate
                    ) {
                      const oneYearLater = new Date(
                        internalStartDate,
                      );
                      oneYearLater.setFullYear(
                        oneYearLater.getFullYear() +
                          1,
                      );
                      setRecurrenceEndDate(
                        oneYearLater,
                      );
                    }
                  }}
                  className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-[13px] transition-all ${
                    recurrenceEndType === type
                      ? "bg-background text-[#0c8ce9] font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[type][language] || labels[type]["en"]}
                </button>
              );
            })}
          </div>

          {/* Count input area - right aligned */}
          <div className="flex items-center justify-end gap-1.5">
            {recurrenceEndType === "count" && (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={recurrenceCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string
                    if (value === "") {
                      setRecurrenceCount("");
                      return;
                    }
                    // Only allow positive integers starting from 1
                    if (/^[1-9]\d*$/.test(value)) {
                      setRecurrenceCount(
                        parseInt(value),
                      );
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, set min value 1 if empty
                    if (
                      e.target.value === "" ||
                      parseInt(e.target.value) < 1
                    ) {
                      setRecurrenceCount(1);
                    }
                  }}
                  className="h-9 w-20 text-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {({ ko: "회", en: "times", zh: "次" } as Record<string, string>)[language] || "times"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
