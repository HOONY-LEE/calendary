import { useState, useEffect, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Category } from "../types";
import { categoriesAPI, DBCategory } from "../../../../lib/api";
import { supabase } from "../../../../lib/supabase";
import { projectId, publicAnonKey } from "../../../../lib/supabase-info";
import { toast } from "sonner";
import { GOOGLE_CALENDAR_COLOR_MAP, findClosestPresetColor } from "../utils/colorUtils";
import { getGoogleToken } from "../../../../lib/google-token";

interface UseCategoriesParams {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  language: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  formData: { categoryId: string };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

interface UseCategoriesReturn {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  showAddCategoryInDropdown: boolean;
  setShowAddCategoryInDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  newCategoryNameInDropdown: string;
  setNewCategoryNameInDropdown: React.Dispatch<React.SetStateAction<string>>;
  newCategoryColorInDropdown: string;
  setNewCategoryColorInDropdown: React.Dispatch<React.SetStateAction<string>>;
  showColorPickerInDropdown: boolean;
  setShowColorPickerInDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  editingCategoryIdInDropdown: string | null;
  setEditingCategoryIdInDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  deletingCategoryIdInDropdown: string | null;
  setDeletingCategoryIdInDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  handleCreateCategoryInDropdown: () => Promise<void>;
  handleCancelAddCategoryInDropdown: () => void;
  handleUpdateCategoryInDropdown: () => Promise<void>;
  handleDeleteCategoryInDropdown: (categoryId: string) => Promise<void>;
  moveCategory: (dragIndex: number, hoverIndex: number) => void;
  saveCategoryOrder: (reorderedCategories: Category[]) => Promise<void>;
}

export function useCategories({
  session,
  user,
  signOut,
  language,
  setIsLoading,
  formData,
  setFormData,
}: UseCategoriesParams): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<string[]>([]);

  // 카테고리 드롭다운 - 새 카테고리 추가 상태
  const [showAddCategoryInDropdown, setShowAddCategoryInDropdown] =
    useState(false);
  const [newCategoryNameInDropdown, setNewCategoryNameInDropdown] =
    useState("");
  const [newCategoryColorInDropdown, setNewCategoryColorInDropdown] =
    useState("#E30000");
  const [showColorPickerInDropdown, setShowColorPickerInDropdown] =
    useState(false);
  const [editingCategoryIdInDropdown, setEditingCategoryIdInDropdown] =
    useState<string | null>(null);
  const [deletingCategoryIdInDropdown, setDeletingCategoryIdInDropdown] =
    useState<string | null>(null);

  // 🔥 카테고리 드래그 앤 드롭 순서 변경 (UI만 업데이트)
  const moveCategory = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragCategory = categories[dragIndex];
      const newCategories = [...categories];
      newCategories.splice(dragIndex, 1);
      newCategories.splice(hoverIndex, 0, dragCategory);

      // UI 즉시 업데이트 (서버 저장은 드래그 끝날 때)
      setCategories(newCategories);
    },
    [categories],
  );

  // 🔥 드래그 완료 후 순서 저장 (DB + localStorage)
  const saveCategoryOrder = useCallback(
    async (reorderedCategories: Category[]) => {
      try {
        console.log("[Calendar] Saving category order...");

        // localStorage에 전체 카테고리 순서 저장 (Google Calendar 포함)
        const orderMap = reorderedCategories.map((cat, idx) => ({
          id: cat.id,
          order_index: idx + 1,
        }));
        localStorage.setItem("category_order", JSON.stringify(orderMap));

        // DB 카테고리만 서버에 저장
        const dbCategoryOrders = reorderedCategories
          .filter((cat) => !(cat as any).isGoogleCalendar && !String(cat.id).startsWith("gcal-"))
          .map((cat, idx) => ({
            id: cat.id,
            order_index: idx + 1,
          }));

        console.log(
          "[Calendar] Category orders to send:",
          dbCategoryOrders,
        );

        if (
          session?.access_token &&
          dbCategoryOrders.length > 0
        ) {
          await categoriesAPI.reorder(
            dbCategoryOrders,
            session.access_token,
          );
          console.log(
            "[Calendar] ✅ Category order saved successfully",
          );
          toast.success(
            ({ ko: "카테고리 순서가 저장되었습니다", en: "Category order saved", zh: "分类顺序已保存" } as Record<string, string>)[language] || "Category order saved",
          );
        }
      } catch (error) {
        console.error(
          "[Calendar] ❌ Failed to save category order:",
          error,
        );
        toast.error(
          ({ ko: "카테고리 순서 저장에 실패했습니다", en: "Failed to save category order", zh: "保存分类顺序失败" } as Record<string, string>)[language] || "Failed to save category order",
        );
      }
    },
    [session?.access_token, language],
  );

  // 카테고리 드롭다운에서 새 카테고리 생성
  const handleCreateCategoryInDropdown = async () => {
    if (!newCategoryNameInDropdown.trim()) return;

    try {
      if (!session?.access_token) {
        toast.error(
          ({ ko: "로그인이 필요합니다", en: "Login required", zh: "需要登录" } as Record<string, string>)[language] || "Login required",
        );
        return;
      }

      const maxOrderIndex =
        categories.length > 0
          ? Math.max(
              ...categories.map(
                (cat) => (cat as any).order_index ?? 0,
              ),
            )
          : 0;

      const dbCategory = await categoriesAPI.create(
        {
          name: newCategoryNameInDropdown,
          color: newCategoryColorInDropdown,
          type: ["calendar"],
          order_index: maxOrderIndex + 1,
          user_id: user?.id,
        },
        session.access_token,
      );

      const newCategory: Category = {
        id: dbCategory.id,
        name: dbCategory.name,
        color: dbCategory.color,
      };

      setCategories([...categories, newCategory]);
      setSelectedCategoryIds([
        ...selectedCategoryIds,
        newCategory.id,
      ]);

      toast.success(
        ({ ko: "카테고리가 생성되었습니다", en: "Category created", zh: "分类已创建" } as Record<string, string>)[language] || "Category created",
      );

      // 초기화
      setNewCategoryNameInDropdown("");
      setNewCategoryColorInDropdown("#E30000");
      setShowAddCategoryInDropdown(false);
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error(
        ({ ko: "카테고리 생성에 실패했습니다", en: "Failed to create category", zh: "创建分类失败" } as Record<string, string>)[language] || "Failed to create category",
      );
    }
  };

  const handleCancelAddCategoryInDropdown = () => {
    setNewCategoryNameInDropdown("");
    setNewCategoryColorInDropdown("#E30000");
    setShowAddCategoryInDropdown(false);
    setEditingCategoryIdInDropdown(null);
  };

  // 카테고리 드롭다운에서 카테고리 업데이트
  const handleUpdateCategoryInDropdown = async () => {
    if (
      !newCategoryNameInDropdown.trim() ||
      !editingCategoryIdInDropdown
    )
      return;

    try {
      // Google 카테고리인지 확인
      const isGoogleCategory = editingCategoryIdInDropdown.startsWith("gcal-");

      if (isGoogleCategory) {
        // Google 카테고리: Google Calendar API PATCH로 실제 이름+색상 변경
        const googleCalendarId = editingCategoryIdInDropdown.replace("gcal-", "");
        const googleToken = getGoogleToken(session);

        if (googleToken) {
          // 1. 이름 변경: /calendars/{id} PATCH
          const namePatchRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${googleToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ summary: newCategoryNameInDropdown }),
            },
          );
          if (!namePatchRes.ok) {
            const err = await namePatchRes.json();
            console.error("[GoogleCalendar] name PATCH failed:", err);
            throw new Error("Google Calendar 이름 변경 실패");
          }

          // 2. 색상 변경: /users/me/calendarList/{id} PATCH (backgroundColor 사용)
          const colorPatchRes = await fetch(
            `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(googleCalendarId)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${googleToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                backgroundColor: newCategoryColorInDropdown,
                foregroundColor: "#ffffff",
              }),
            },
          );
          if (!colorPatchRes.ok) {
            const err = await colorPatchRes.json();
            console.error("[GoogleCalendar] color PATCH failed:", err);
            // 색상 실패는 경고만 (이름은 이미 변경됨)
            toast.warning(
              ({ ko: "이름은 변경됐지만 색상 동기화에 실패했습니다", en: "Name updated but color sync failed", zh: "名称已更新但颜色同步失败" } as Record<string, string>)[language] || "Name updated but color sync failed",
            );
          }
        }

        // localStorage override도 동기화
        const overrides = JSON.parse(localStorage.getItem("gcal_category_overrides") || "{}");
        overrides[editingCategoryIdInDropdown] = {
          name: newCategoryNameInDropdown,
          color: newCategoryColorInDropdown,
        };
        localStorage.setItem("gcal_category_overrides", JSON.stringify(overrides));
      } else {
        // 로컬 카테고리: DB 업데이트
        if (!session?.access_token) {
          toast.error(
            ({ ko: "로그인이 필요합니다", en: "Login required", zh: "需要登录" } as Record<string, string>)[language] || "Login required",
          );
          return;
        }

        await categoriesAPI.update(
          editingCategoryIdInDropdown,
          {
            name: newCategoryNameInDropdown,
            color: newCategoryColorInDropdown,
          },
          session.access_token,
        );
      }

      // 로컬 상태 업데이트
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategoryIdInDropdown
            ? {
                ...cat,
                name: newCategoryNameInDropdown,
                color: newCategoryColorInDropdown,
              }
            : cat,
        ),
      );

      toast.success(
        ({ ko: "카테고리가 수정되었습니다", en: "Category updated", zh: "分类已更新" } as Record<string, string>)[language] || "Category updated",
      );

      // 초기화
      setNewCategoryNameInDropdown("");
      setNewCategoryColorInDropdown("#E30000");
      setShowAddCategoryInDropdown(false);
      setEditingCategoryIdInDropdown(null);
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error(
        ({ ko: "카테고리 수정에 실패했습니다", en: "Failed to update category", zh: "更新分类失败" } as Record<string, string>)[language] || "Failed to update category",
      );
    }
  };

  // 카테고리 드롭다운에서 카테고리 삭제
  const handleDeleteCategoryInDropdown = async (
    categoryId: string,
  ) => {
    try {
      const isGoogleCategory = categoryId.startsWith("gcal-");

      if (isGoogleCategory) {
        // 구글 캘린더: Google Calendar API로 실제 삭제/구독해제
        const googleCalendarId = categoryId.replace("gcal-", "");
        const googleToken = getGoogleToken(session);

        if (googleToken) {
          // accessRole 확인
          const cat = categories.find((c) => c.id === categoryId);
          const accessRole = (cat as any)?.googleCalendarAccessRole;

          if (accessRole === "owner") {
            // 소유한 캘린더: 영구 삭제
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${googleToken}` },
              },
            );
            if (!res.ok && res.status !== 204) {
              const err = await res.json().catch(() => ({}));
              console.error("[GoogleCalendar] DELETE calendar failed:", err);
              throw new Error("Google Calendar 삭제 실패");
            }
          } else {
            // 구독한 캘린더(reader 등): 구독 해제
            const res = await fetch(
              `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(googleCalendarId)}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${googleToken}` },
              },
            );
            if (!res.ok && res.status !== 204) {
              const err = await res.json().catch(() => ({}));
              console.error("[GoogleCalendar] DELETE calendarList failed:", err);
              throw new Error("Google Calendar 구독 해제 실패");
            }
          }
        }

        // localStorage override 정리
        const overrides = JSON.parse(localStorage.getItem("gcal_category_overrides") || "{}");
        delete overrides[categoryId];
        localStorage.setItem("gcal_category_overrides", JSON.stringify(overrides));
      } else {
        if (!session?.access_token) {
          toast.error(
            ({ ko: "로그인이 필요합니다", en: "Login required", zh: "需要登录" } as Record<string, string>)[language] || "Login required",
          );
          return;
        }
        await categoriesAPI.delete(categoryId, session.access_token);
      }

      // 로컬 상태 업데이트
      setCategories(
        categories.filter((cat) => cat.id !== categoryId),
      );
      setSelectedCategoryIds(
        selectedCategoryIds.filter((id) => id !== categoryId),
      );

      toast.success(
        ({ ko: "카테고리가 삭제되었습니다", en: "Category deleted", zh: "分类已删除" } as Record<string, string>)[language] || "Category deleted",
      );

      setDeletingCategoryIdInDropdown(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error(
        ({ ko: "카테고리 삭제에 실패했습니다", en: "Failed to delete category", zh: "删除分类失败" } as Record<string, string>)[language] || "Failed to delete category",
      );
    }
  };

  // 서버에서 카테고리 로드
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 6; // 🔥 6번까지 재시도 (최대 9초 대기)
    const retryDelay = 1500; // 1.5초

    const loadCategories = async () => {
      if (!session?.access_token) {
        console.log(
          "[Calendar] No session, skipping category load",
        );
        setCategories([]); // 🔥 빈 배열로 설정하여 로딩 완료
        setIsLoading(false); // 🔥 로딩 해제
        return;
      }

      try {
        console.log(
          `[Calendar] Loading categories... (attempt ${retryCount + 1}/${maxRetries})`,
        );

        // 🔥 타임아웃 추가 (10초로 증가)
        const timeoutPromise = new Promise<never>(
          (_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error("Category load timeout after 10s"),
                ),
              10000,
            );
          },
        );

        const categoriesPromise = categoriesAPI.getAll(
          session.access_token,
        );

        const dbCategories = await Promise.race([
          categoriesPromise,
          timeoutPromise,
        ]);

        console.log(
          "[Calendar] Received DB categories:",
          dbCategories,
        );

        // DB 카테고리가 없어도 Google Calendar 카테고리가 있을 수 있으므로 계속 진행
        if (!dbCategories || dbCategories.length === 0) {
          console.log(
            "[Calendar] No DB categories found, continuing to check Google calendars...",
          );
        }

        // DB 카테고리를 Category 형식으로 변환 + order_index 포함
        const mappedCategories: Category[] = (dbCategories || []).map(
          (dbCat) => ({
            id: dbCat.id,
            name: dbCat.name,
            color: dbCat.color,
            order_index: dbCat.order_index,
          }),
        );

        // 메이크 프리뷰 환경 체크 (makeproxy만 해당, figma.site는 배포 환경이므로 제외)
        const hostname = window.location.hostname;
        const isFigmaMakePreview =
          hostname.includes("makeproxy");

        console.log("[Calendar] Category environment check:");
        console.log("  - Current hostname:", hostname);
        console.log(
          "  - Is Figma Make Preview?",
          isFigmaMakePreview,
        );
        console.log(
          "  - Provider token exists?",
          !!getGoogleToken(session),
        );

        // 🔥 order_index로 정렬 (오름차순)
        const sortedCategories = mappedCategories.sort((a, b) => {
          const aOrder = (a as any).order_index ?? 0;
          const bOrder = (b as any).order_index ?? 0;
          return aOrder - bOrder;
        });

        // 🔥 Google Calendar 카테고리 동적 로드
        let allCategories = [...sortedCategories];

        if (getGoogleToken(session)) {
          try {
            console.log("[Calendar] 📡 Loading Google Calendar list...");
            const now = new Date();
            const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-f973dbc1/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
              {
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'X-User-JWT': session.access_token,
                  'X-Google-Access-Token': getGoogleToken(session),
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              const googleCalendars = data.calendars || [];

              // localStorage에서 Google 카테고리 커스텀 오버라이드 + 숨김 목록 가져오기
              const gcalOverrides = JSON.parse(localStorage.getItem("gcal_category_overrides") || "{}");
              const gcalHidden: string[] = JSON.parse(localStorage.getItem("gcal_hidden_calendars") || "[]");

              const googleCategories: Category[] = googleCalendars
                .map((cal: any) => {
                  const catId = `gcal-${cal.id}`;
                  const override = gcalOverrides[catId];
                  return {
                    id: catId,
                    name: override?.name || cal.summary || cal.id,
                    color: override?.color || findClosestPresetColor(cal.backgroundColor || GOOGLE_CALENDAR_COLOR_MAP[cal.colorId] || '#4285F4'),
                    isGoogleCalendar: true,
                    googleCalendarId: cal.id,
                    googleCalendarAccessRole: cal.accessRole,
                  };
                })
                .filter((cat: any) => !gcalHidden.includes(cat.id)); // 숨김 처리된 캘린더 제외

              allCategories = [...sortedCategories, ...googleCategories];
              console.log("[Calendar] ✅ Added", googleCategories.length, "Google Calendar categories");
            }
          } catch (error) {
            console.warn("[Calendar] ⚠️ Failed to load Google Calendars:", error);
          }
        }

        // localStorage에 저장된 순서가 있으면 반영
        const savedOrder = localStorage.getItem("category_order");
        if (savedOrder) {
          try {
            const orderMap = JSON.parse(savedOrder) as { id: string; order_index: number }[];
            const orderLookup = new Map(orderMap.map(o => [o.id, o.order_index]));
            allCategories.sort((a, b) => {
              const aOrder = orderLookup.get(a.id) ?? 999;
              const bOrder = orderLookup.get(b.id) ?? 999;
              return aOrder - bOrder;
            });
          } catch {}
        }

        setCategories(allCategories);

        // localStorage에서 저장된 카테고리 선택 상태 복원
        const savedSelection = localStorage.getItem("selected_category_ids");
        if (savedSelection) {
          try {
            const savedIds = JSON.parse(savedSelection) as string[];
            // 저장된 ID 중 현재 존재하는 카테고리만 복원
            const validIds = savedIds.filter((id) =>
              allCategories.some((c) => c.id === id)
            );
            setSelectedCategoryIds(validIds);
          } catch {
            setSelectedCategoryIds(allCategories.map((c) => c.id));
          }
        } else {
          // 저장된 선택이 없으면 전체 선택 (최초 사용)
          setSelectedCategoryIds(allCategories.map((c) => c.id));
        }

        // 첫 번째 카테고리를 기본값으로 설정 (order_index가 가장 작은 카테고리 = 맨 위)
        if (
          sortedCategories.length > 0 &&
          !formData.categoryId
        ) {
          setFormData((prev: any) => ({
            ...prev,
            categoryId: sortedCategories[0].id,
          }));
        }

        console.log(
          "[Calendar] Successfully loaded",
          mappedCategories.length,
          "categories",
        );
      } catch (error) {
        console.error(
          "[Calendar] Failed to load categories:",
          error,
        );

        // 타임아웃 에러는 재시도
        if (
          error instanceof Error &&
          error.message.includes("timeout")
        ) {
          console.log(
            "[Calendar] Category load timeout, retrying...",
          );
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(loadCategories, retryDelay);
            return;
          } else {
            console.log(
              "[Calendar] Max retries reached after timeout",
            );
            setCategories([]);
            setSelectedCategoryIds([]);
            setIsLoading(false); // 🔥 타임아웃 후에도 로딩 해제
            return;
          }
        }

        // 401 에러 (세션 만료) 처리
        if (error instanceof Error) {
          if (error.message.includes("Authentication failed")) {
            console.log(
              "[Calendar] Session expired, signing out",
            );
            toast.error(
              ({ ko: "세션이 만료되었습니다. 다시 로그인해주세요.", en: "Session expired. Please sign in again.", zh: "会话已过期。请重新登录。" } as Record<string, string>)[language] || "Session expired. Please sign in again.",
            );
            await signOut();
            return;
          }

          // Failed to fetch 에러 처리
          if (error.message === "Failed to fetch") {
            console.error(
              "[Calendar] Network error when loading categories",
            );
            toast.error(
              ({ ko: "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.", en: "Cannot connect to server. Please check your network connection.", zh: "无法连接到服务器。请检查网络连接。" } as Record<string, string>)[language] || "Cannot connect to server. Please check your network connection.",
            );
            setCategories([]);
            setIsLoading(false);
            return;
          }
        }

        toast.error(
          ({ ko: "카테고리를 불러오는데 실패했습니다", en: "Failed to load categories", zh: "加载分类失败" } as Record<string, string>)[language] || "Failed to load categories",
        );
        setCategories([]);
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [session, language]);

  // 🔥 카테고리 생성 완료 이벤트 리스너 (AuthContext에서 발송)
  useEffect(() => {
    const handleCategoriesCreated = () => {
      console.log(
        "[Calendar] 📢 categories-created event received, reloading categories...",
      );

      // 카테고리 재로드 (약간의 지연 후)
      setTimeout(async () => {
        if (session?.access_token) {
          try {
            const dbCategories = await categoriesAPI.getAll(
              session.access_token,
            );
            console.log(
              "[Calendar] ✅ Reloaded categories after creation:",
              dbCategories,
            );

            if (dbCategories && dbCategories.length > 0) {
              const reloadedCategories: Category[] = dbCategories.map(
                (dbCat) => ({
                  id: dbCat.id,
                  name: dbCat.name,
                  color: dbCat.color,
                }),
              );

              setCategories(reloadedCategories);
              // localStorage에서 저장된 선택 상태 복원
              const saved = localStorage.getItem("selected_category_ids");
              if (saved) {
                try {
                  const savedIds = JSON.parse(saved) as string[];
                  const validIds = savedIds.filter((id) =>
                    reloadedCategories.some((c) => c.id === id)
                  );
                  setSelectedCategoryIds(validIds);
                } catch {
                  setSelectedCategoryIds(reloadedCategories.map((c) => c.id));
                }
              } else {
                setSelectedCategoryIds(reloadedCategories.map((c) => c.id));
              }

              // 첫 번째 카테고리를 기본값으로 설정
              if (
                reloadedCategories.length > 0 &&
                !formData.categoryId
              ) {
                setFormData((prev: any) => ({
                  ...prev,
                  categoryId: reloadedCategories[0].id,
                }));
              }
            }
          } catch (error) {
            console.error(
              "[Calendar] Failed to reload categories:",
              error,
            );
          }
        }
      }, 500); // 0.5초 지연
    };

    window.addEventListener(
      "categories-created",
      handleCategoriesCreated,
    );

    return () => {
      window.removeEventListener(
        "categories-created",
        handleCategoriesCreated,
      );
    };
  }, [session]);

  // 개발자용: 카테고리 리셋 함수를 window에 노출
  useEffect(() => {
    if (
      session?.access_token &&
      typeof window !== "undefined"
    ) {
      (window as any).resetCategories = async () => {
        try {
          console.log("🔄 카테고리 리셋 시작...");

          // 클라이언트에서 직접 Supabase DB 사용 (서버 우회)
          const userId = session.user.id;

          // 1. DB에서 모든 카테고리 삭제
          const { error: deleteError } = await supabase
            .from("categories_f973dbc1")
            .delete()
            .eq("user_id", userId);

          if (deleteError) {
            console.error("카테고리 삭제 실패:", deleteError);
            return;
          }

          console.log("✅ 기존 카테고리 삭제 완료");

          // 2. 기본 카테고리 3개 생성
          const defaultCategories = [
            {
              name: "개인",
              color: "#E30000",
              order_index: 1,
              is_default: true,
            },
            {
              name: "업무",
              color: "#007AFF",
              order_index: 2,
              is_default: false,
            },
            {
              name: "휴가",
              color: "#34C759",
              order_index: 3,
              is_default: false,
            },
          ];

          for (const catData of defaultCategories) {
            const createdCat = await categoriesAPI.create(
              {
                name: catData.name,
                color: catData.color,
                type: ["calendar", "task"],
                order_index: catData.order_index,
              },
              session.access_token,
            );
            console.log(
              `✅ 생성됨: ${catData.name}`,
              createdCat,
            );
          }

          console.log("🎉 카테고리 리셋 완료!");

          // 페이지 새로고침
          window.location.reload();
        } catch (error) {
          console.error("❌ 카테고리 리셋 실패:", error);
        }
      };

      console.log("💡 사용법: resetCategories() 를 실행하세요");
    }
  }, [session]);

  // 개발자용: 카테고리 리셋 함수를 window에 노출 (두 번째 버전)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      session?.access_token
    ) {
      (window as any).resetCategories = async () => {
        try {
          console.log("🔄 카테고리 리셋 시작...");

          // 클라이언트에서 직접 Supabase DB 사용 (서버 우회)
          const userId = session.user.id;
          console.log("👤 User ID:", userId);

          // 1. 기존 카테고리 모두 삭제
          console.log("🗑️  기존 카테고리 삭제 중...");
          const { error: deleteError } = await supabase
            .from("categories")
            .delete()
            .eq("user_id", userId);

          if (deleteError) {
            throw new Error(
              "카테고리 삭제 실패: " + deleteError.message,
            );
          }
          console.log("✅ 기존 카테고리 삭제 완료");

          // 2. 기본 3개 카테고리 생성 (개인, 업무, 휴가)
          console.log("➕ 기본 카테고리 3개 생성 중...");
          const defaultCategories = [
            {
              name: "개인",
              color: "#E30000",
              order_index: 1,
              is_default: true,
            },
            {
              name: "업무",
              color: "#007AFF",
              order_index: 2,
              is_default: false,
            },
            {
              name: "휴가",
              color: "#34C759",
              order_index: 3,
              is_default: false,
            },
          ];

          const { data: newCategories, error: insertError } =
            await supabase
              .from("categories")
              .insert(
                defaultCategories.map((cat) => ({
                  user_id: userId,
                  name: cat.name,
                  color: cat.color,
                  icon: "tag",
                  type: ["calendar", "task"],
                  is_default: cat.is_default,
                  order_index: cat.order_index,
                })),
              )
              .select();

          if (insertError) {
            throw new Error(
              "카테고리 생성 실패: " + insertError.message,
            );
          }

          console.log("✅ 카테고리 리셋 완료:", newCategories);
          alert(
            "카테고리가 초기화되었습니다! 페이지를 새로고침합니다.",
          );
          window.location.reload();
        } catch (error) {
          console.error("❌ 카테고리 리셋 실패:", error);
          alert(
            "카테고리 리셋 실패: " +
              (error instanceof Error
                ? error.message
                : "알 수 없는 오류"),
          );
        }
      };
      console.log(
        "💡 콘솔에서 resetCategories() 함수를 호출하면 카테고리를 초기화할 수 있습니다.",
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).resetCategories;
      }
    };
  }, [session]);

  // 외부(유저 토글)에서 호출할 때만 localStorage에 저장하는 래핑 setter
  const setSelectedCategoryIdsAndSave = useCallback((updater: React.SetStateAction<string[]>) => {
    setSelectedCategoryIds((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem("selected_category_ids", JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    categories,
    setCategories,
    selectedCategoryIds,
    setSelectedCategoryIds: setSelectedCategoryIdsAndSave,
    showAddCategoryInDropdown,
    setShowAddCategoryInDropdown,
    newCategoryNameInDropdown,
    setNewCategoryNameInDropdown,
    newCategoryColorInDropdown,
    setNewCategoryColorInDropdown,
    showColorPickerInDropdown,
    setShowColorPickerInDropdown,
    editingCategoryIdInDropdown,
    setEditingCategoryIdInDropdown,
    deletingCategoryIdInDropdown,
    setDeletingCategoryIdInDropdown,
    handleCreateCategoryInDropdown,
    handleCancelAddCategoryInDropdown,
    handleUpdateCategoryInDropdown,
    handleDeleteCategoryInDropdown,
    moveCategory,
    saveCategoryOrder,
  };
}
