import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko, enUS } from "date-fns/locale";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

interface DatePickerProps {
  id?: string;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  language?: string;
  min?: Date;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  language = "ko",
  min,
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = language === "ko" ? ko : enUS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn("h-9 w-full justify-start text-left font-normal px-3 font-[Pretendard]", !value && "text-muted-foreground", "hover:!bg-transparent dark:hover:!bg-transparent", "hover:!text-foreground dark:hover:!text-foreground", "focus-visible:!ring-0 focus-visible:!border-[var(--calendar-selected)]", "cursor-pointer", className)}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {value ? (
            format(value, "PPP", { locale })
          ) : (
            <span>{placeholder || (language === "ko" ? "날짜 선택" : "Pick a date")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(selectedDate) => {
            onChange(selectedDate);
            setOpen(false);
          }}
          disabled={min ? (date) => date < min : undefined}
          initialFocus
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}