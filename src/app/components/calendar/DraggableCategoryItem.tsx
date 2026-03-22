import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Check, MoreVertical, Edit2, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
}

// ---- Popover variant (used in EventCreatePopover) ----

export interface PopoverDraggableCategoryItemProps {
  variant: "popover";
  cat: Category;
  index: number;
  isChecked: boolean;
  isEditing: boolean;
  editingCategoryId: string | null;
  showColorPicker: boolean;
  newCategoryName: string;
  newCategoryColor: string;
  colorPalette: string[];
  language: "ko" | "en";
  formData: any;
  onSelectCategory: (categoryId: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
  onEditStart: (categoryId: string, name: string, color: string) => void;
  onDeleteStart: (categoryId: string) => void;
  setShowColorPicker: (show: boolean) => void;
  setNewCategoryName: (name: string) => void;
  setNewCategoryColor: (color: string) => void;
  handleCreateCategory: () => void;
  handleCancelAddCategory: () => void;
  onUpdateCategory?: (categoryId: string, data: { name: string; color: string }) => void;
  t: (key: string, fallback?: string) => string;
}

// ---- Sidebar variant (used in Calendar.tsx) ----

export interface SidebarDraggableCategoryItemProps {
  variant: "sidebar";
  cat: Category & {
    order_index?: number;
    isGoogleCalendar?: boolean;
  };
  index: number;
  isChecked: boolean;
  isEditing: boolean;
  editingCategoryId: string | null;
  showColorPicker: boolean;
  newCategoryName: string;
  newCategoryColor: string;
  colorPalette: string[];
  language: "ko" | "en";
  onToggleSelect: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd?: () => void;
  onEditStart: () => void;
  onDeleteStart: () => void;
  setShowColorPicker: (show: boolean) => void;
  setNewCategoryName: (name: string) => void;
  setNewCategoryColor: (color: string) => void;
  handleSaveCategory: () => void;
  handleCancelCategory: () => void;
}

export type DraggableCategoryItemProps =
  | PopoverDraggableCategoryItemProps
  | SidebarDraggableCategoryItemProps;

// ---- Popover variant component ----

function PopoverDraggableCategoryItem(props: PopoverDraggableCategoryItemProps) {
  const {
    cat,
    index,
    isChecked,
    isEditing,
    showColorPicker,
    newCategoryName,
    newCategoryColor,
    colorPalette,
    language,
    onSelectCategory,
    onMove,
    onDragEnd,
    onEditStart,
    onDeleteStart,
    setShowColorPicker,
    setNewCategoryName,
    setNewCategoryColor,
    handleCreateCategory,
    handleCancelAddCategory,
    onUpdateCategory,
    t,
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: "CATEGORY_MODAL",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "CATEGORY_MODAL",
    item: () => {
      return { id: cat.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (onDragEnd) {
        onDragEnd();
      }
    },
  });

  drag(drop(ref));

  // Edit mode
  if (isEditing) {
    return (
      <div
        ref={ref}
        key={cat.id}
        className="group relative flex items-center gap-3 rounded-md px-3 h-[40px] border-2 border-[#0C8CE9]"
        data-handler-id={handlerId}
      >
        {/* Color button */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-4 h-4 rounded flex-shrink-0 border-2 transition-all hover:scale-110"
              style={{
                backgroundColor: newCategoryColor,
                borderColor: newCategoryColor,
              }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setNewCategoryColor(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-md transition-all ${
                    newCategoryColor === color
                      ? "ring-2 ring-offset-2 ring-[#0C8CE9] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Name input */}
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateCategory();
            } else if (e.key === "Escape") {
              handleCancelAddCategory();
            }
          }}
          placeholder={language === "ko" ? "카테고리 이름" : "Category name"}
          className="h-7 text-sm flex-1 min-w-0 border-0 bg-transparent outline-none px-0 placeholder:text-muted-foreground"
          autoFocus
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleCreateCategory}
            disabled={!newCategoryName.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#0C8CE9] rounded-md hover:bg-[#0A7BC9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t("common.save", "저장")}
          </button>
        </div>
      </div>
    );
  }

  // Normal category item
  return (
    <div
      ref={ref}
      key={cat.id}
      className="group relative flex items-center gap-3 cursor-pointer select-none rounded-md px-3 h-[40px] transition-colors hover:bg-muted/30"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-handler-id={handlerId}
    >
      <div
        onClick={() => onSelectCategory(cat.id)}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div
          className="w-4 h-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
          style={{
            backgroundColor: cat.color,
            borderColor: cat.color,
          }}
        >
          {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
        </div>
        <span className="text-sm truncate">{cat.name}</span>
      </div>

      {/* More menu */}
      {onUpdateCategory && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted transition-opacity flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[100px] w-[100px]">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEditStart(cat.id, cat.name, cat.color);
              }}
              className="cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              {language === "ko" ? "수정" : "Edit"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDeleteStart(cat.id);
              }}
              className="cursor-pointer text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {language === "ko" ? "삭제" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ---- Sidebar variant component ----

function SidebarDraggableCategoryItem(props: SidebarDraggableCategoryItemProps) {
  const {
    cat,
    index,
    isChecked,
    isEditing,
    showColorPicker,
    newCategoryName,
    newCategoryColor,
    colorPalette,
    language,
    onToggleSelect,
    onMove,
    onDragEnd,
    onEditStart,
    setShowColorPicker,
    setNewCategoryName,
    setNewCategoryColor,
    handleSaveCategory,
    handleCancelCategory,
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: "CATEGORY",
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect =
        ref.current?.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY =
        clientOffset!.y - hoverBoundingRect.top;

      if (
        dragIndex < hoverIndex &&
        hoverClientY < hoverMiddleY
      ) {
        return;
      }
      if (
        dragIndex > hoverIndex &&
        hoverClientY > hoverMiddleY
      ) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: "CATEGORY",
    item: () => {
      return { id: cat.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (monitor.didDrop() && onDragEnd) {
        onDragEnd();
      }
    },
  });

  // Only apply drag to non-Google calendars
  if (!cat.isGoogleCalendar) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  const googleIcon =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuMmgzYTguOCA4LjggMCAwIDAgMi42LTYuNnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDE4YzIuNCAwIDQuNS0uOCA2LTIuMmwtMy0yLjJhNS40IDUuNCAwIDAgMS04LTIuOUgxVjEzYTkgOSAwIDAgMCA4IDV6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YTUuNCA1LjQgMCAwIDEgMC0zLjRWNUgxYTkgOSAwIDAgMCAwIDhsMy0yLjN6IiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNOSAzLjZjMS4zIDAgMi41LjQgMy40IDEuM0wxNSAyLjNBOSA5IDAgMCAwIDEgNWwzIDIuNGE1LjQgNS40IDAgMCAxIDUtMy43eiIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTAgMGgxOHYxOEgweiIvPjwvZz48L3N2Zz4=";

  // Edit mode
  if (isEditing) {
    return (
      <div
        key={cat.id}
        className="px-2 flex items-center gap-2 border-2 border-[#0C8CE9] rounded-sm h-[40px]"
      >
        {/* Color picker */}
        <Popover
          open={showColorPicker}
          onOpenChange={setShowColorPicker}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110"
              style={{
                backgroundColor: newCategoryColor,
              }}
            ></button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setNewCategoryColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Name input */}
        <input
          value={newCategoryName}
          onChange={(e) =>
            setNewCategoryName(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSaveCategory();
            } else if (e.key === "Escape") {
              handleCancelCategory();
            }
          }}
          placeholder={
            language === "ko"
              ? "카테고리 이름"
              : "Category name"
          }
          className="h-7 text-sm flex-1 min-w-0 border-0 bg-transparent outline-none px-0 placeholder:text-muted-foreground"
          autoFocus
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleSaveCategory}
            disabled={!newCategoryName.trim()}
            className="px-2.5 py-1.5 font-medium text-white bg-[#0C8CE9] rounded-sm hover:bg-[#0A7BC9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[12px]"
          >
            {language === "ko" ? "저장" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // Normal mode (draggable)
  return (
    <div
      ref={ref}
      className={`group relative flex w-full items-center rounded-sm px-2 h-[40px] text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
        isDragging ? "opacity-50" : ""
      } ${!cat.isGoogleCalendar ? "cursor-grab active:cursor-grabbing" : ""}`}
      data-handler-id={handlerId}
    >
      <button
        className="flex items-center gap-3 w-full cursor-pointer"
        onClick={onToggleSelect}
      >
        <div
          className="w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0"
          style={{
            backgroundColor: isChecked
              ? cat.color
              : "transparent",
            borderColor: isChecked ? cat.color : "#d1d5db",
          }}
        >
          {isChecked && (
            <Check className="h-3.5 w-3.5 text-white" />
          )}
        </div>
        <span className="flex-1 text-left text-[14px]">
          {cat.name}
        </span>
        {cat.isGoogleCalendar && (
          <img
            src={googleIcon}
            alt="Google"
            className="h-3.5 w-3.5 flex-shrink-0"
          />
        )}
      </button>

      {/* More menu - only for non-Google calendars */}
      {!cat.isGoogleCalendar && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onEditStart();
          }}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ---- Main export ----

export function DraggableCategoryItem(props: DraggableCategoryItemProps) {
  if (props.variant === "popover") {
    return <PopoverDraggableCategoryItem {...props} />;
  }
  return <SidebarDraggableCategoryItem {...props} />;
}
