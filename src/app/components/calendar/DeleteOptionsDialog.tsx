import React from "react";
import { Button } from "../ui/button";

export interface DeleteOptionsDialogProps {
  language: string;
  selectedDeleteType: "this" | "following" | "all";
  setSelectedDeleteType: (type: "this" | "following" | "all") => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function DeleteOptionsDialog({
  language,
  selectedDeleteType,
  setSelectedDeleteType,
  onCancel,
  onDelete,
}: DeleteOptionsDialogProps) {
  return (
    <div className="space-y-2 pt-2">
      <div className="text-sm font-medium text-center pb-1 border-b">
        {({ ko: "삭제 범위 선택", en: "Select delete range", zh: "选择删除范围" } as Record<string, string>)[language] || "Select delete range"}
      </div>
      <div className="space-y-1.5">
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            selectedDeleteType === "this"
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "hover:bg-muted"
          }`}
          onClick={() =>
            setSelectedDeleteType("this")
          }
        >
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedDeleteType === "this"
                ? "border-red-600 dark:border-red-400"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {selectedDeleteType === "this" && (
              <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
            )}
          </div>
          <span>
            {({ ko: "이 일정만", en: "This event only", zh: "仅此事件" } as Record<string, string>)[language] || "This event only"}
          </span>
        </button>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            selectedDeleteType === "following"
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "hover:bg-muted"
          }`}
          onClick={() =>
            setSelectedDeleteType("following")
          }
        >
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedDeleteType === "following"
                ? "border-red-600 dark:border-red-400"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {selectedDeleteType === "following" && (
              <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
            )}
          </div>
          <span>
            {({ ko: "이후 모든 일정", en: "This and following events", zh: "此事件及后续事件" } as Record<string, string>)[language] || "This and following events"}
          </span>
        </button>
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            selectedDeleteType === "all"
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "hover:bg-muted"
          }`}
          onClick={() => setSelectedDeleteType("all")}
        >
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedDeleteType === "all"
                ? "border-red-600 dark:border-red-400"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {selectedDeleteType === "all" && (
              <div className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
            )}
          </div>
          <span>
            {({ ko: "모든 반복 일정", en: "All recurring events", zh: "所有重复事件" } as Record<string, string>)[language] || "All recurring events"}
          </span>
        </button>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-9 text-sm"
        >
          {({ ko: "취소", en: "Cancel", zh: "取消" } as Record<string, string>)[language] || "Cancel"}
        </Button>
        <Button
          onClick={onDelete}
          className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700 text-white"
        >
          {({ ko: "삭제", en: "Delete", zh: "删除" } as Record<string, string>)[language] || "Delete"}
        </Button>
      </div>
    </div>
  );
}
