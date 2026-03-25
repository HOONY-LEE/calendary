import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Check, Edit2, Trash2, CornerDownLeft } from 'lucide-react';

interface Task {
  id: number | string;
  title: string;
  completed: boolean;
  isGoogleTask?: boolean;
}

interface DraggableTaskItemProps {
  task: Task;
  index: number;
  isEditing: boolean;
  editingTaskTitle: string;
  isHovered: boolean;
  language: string;
  onMove: (dragIndex: number, hoverIndex: number, dragId?: string | number, hoverId?: string | number) => void;
  onDragEnd: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onHover: (id: number | string | null) => void;
}

const DRAG_TYPE = 'TASK';

export function DraggableTaskItem({
  task,
  index,
  isEditing,
  editingTaskTitle,
  isHovered,
  language,
  onMove,
  onDragEnd,
  onToggle,
  onEdit,
  onDelete,
  onEditChange,
  onEditSave,
  onEditCancel,
  onHover,
}: DraggableTaskItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: DRAG_TYPE,
    collect(monitor) {
      return { handlerId: monitor.getHandlerId() };
    },
    hover(item: { id: string | number; index: number }, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex, item.id, task.id);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ id: task.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      onDragEnd();
    },
  });

  // 아이템 전체를 드래그 가능하게 (Google Tasks 제외)
  if (!task.isGoogleTask) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  return (
    <div
      ref={ref}
      className={`rounded-md border transition-all duration-200 ${
        isEditing
          ? 'border-[#0C8CE9] ring-1 ring-[#0C8CE9]/30'
          : 'border-border hover:border-[#0C8CE9]/30'
      } ${
        task.completed ? 'bg-muted/30 dark:bg-muted/10' : 'bg-card'
      } px-[12px] py-[10px] ${isDragging ? 'opacity-40' : ''} ${
        !task.isGoogleTask ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      data-handler-id={handlerId}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => {
        if (!isEditing) onToggle();
      }}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex-shrink-0 -m-2 p-2 cursor-pointer"
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all"
            style={{
              backgroundColor: task.completed ? '#0C8CE9' : 'transparent',
              borderColor: task.completed ? '#0C8CE9' : '#D1D5DB',
            }}
          >
            {task.completed && (
              <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
            )}
          </div>
        </button>

        {/* Title / Edit input */}
        {isEditing ? (
          <input
            value={editingTaskTitle}
            onChange={(e) => onEditChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSave();
              else if (e.key === 'Escape') onEditCancel();
            }}
            onBlur={onEditSave}
            className="flex-1 min-w-0 font-normal text-[16px] bg-transparent border-none outline-none"
            autoFocus
          />
        ) : (
          <div className="flex-1 min-w-0 text-left">
            <h3
              className={`font-normal ${
                task.completed ? 'text-muted-foreground line-through' : ''
              } text-[16px]`}
            >
              {task.title}
            </h3>
          </div>
        )}

        {/* Edit / Delete buttons or Enter button */}
        {isEditing ? (
          <button
            className="bg-[#0C8CE9] hover:bg-[#0C8CE9]/90 h-7 px-2.5 flex items-center gap-1 rounded-sm transition-colors flex-shrink-0 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onEditSave(); }}
            title={({ ko: '저장', en: 'Save', zh: '保存' } as Record<string, string>)[language] || 'Save'}
          >
            <CornerDownLeft className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-medium text-white">Enter</span>
          </button>
        ) : (
          <div
            className={`flex items-center gap-1 transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-1.5 rounded hover:bg-muted/80 transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title={({ ko: '편집', en: 'Edit', zh: '编辑' } as Record<string, string>)[language] || 'Edit'}
            >
              <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-muted/80 transition-colors cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title={({ ko: '삭제', en: 'Delete', zh: '删除' } as Record<string, string>)[language] || 'Delete'}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
