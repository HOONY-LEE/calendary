import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

interface DateRangePickerProps {
  id?: string;
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  language?: "ko" | "en";
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder,
  language = "ko",
  className,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = language === "ko" ? ko : enUS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "h-9 w-full justify-start text-left font-normal px-3",
            !value?.from && "text-muted-foreground",
            "hover:!bg-transparent dark:hover:!bg-transparent",
            "hover:!text-foreground dark:hover:!text-foreground",
            "focus-visible:!ring-0 focus-visible:!border-[var(--calendar-selected)]",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "PPP", { locale })} -{" "}
                {format(value.to, "PPP", { locale })}
              </>
            ) : (
              format(value.from, "PPP", { locale })
            )
          ) : (
            <span>{placeholder || (language === "ko" ? "기간 선택" : "Pick a range")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={1}
          initialFocus
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}