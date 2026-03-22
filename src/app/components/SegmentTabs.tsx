interface SegmentTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: {
    value: T;
    label: string;
  }[];
}

export function SegmentTabs<T extends string>({
  value,
  onValueChange,
  options,
}: SegmentTabsProps<T>) {
  return (
    <div className="inline-flex h-9 rounded-md bg-muted/50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
          className={`cursor-pointer rounded-sm px-6 py-1 text-[13px] transition-all ${
            value === option.value
              ? "bg-background text-[#0c8ce9] font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}