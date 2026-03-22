import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router";
import { Calendar, ListTodo, PanelLeft } from "lucide-react";
import { useSidebarContext } from "../context/SidebarContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { SettingsMenu } from "./SettingsMenu";
import { UserMenu } from "./UserMenu";
import calendaryIcon from "@/assets/e735c8e5404257a8d70b2c1243da5c30fde7a306.png";

const navItems = [
  { path: "/calendar", label: "nav.calendar", icon: Calendar },
  { path: "/tasks", label: "nav.tasks", icon: ListTodo },
  // 🚧 통계 페이지 임시 숨김
  // {
  //   path: "/analytics",
  //   label: "nav.analytics",
  //   icon: BarChart3,
  // },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isCollapsed, toggleSidebar } = useSidebarContext();

  return (
    <aside
      className={`hidden lg:flex flex-col bg-background border-r border-border h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${isCollapsed ? "w-14" : "w-52"}`}
    >
      <div className="h-16 border-b border-border px-[10px] py-[10px] flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 pl-[6px]">
            <img src={calendaryIcon} alt="Calendary" className="w-8 h-8" />
            <span className="text-lg font-normal text-foreground tracking-wide" style={{ fontFamily: "'Product Sans', sans-serif" }}>
              {t("common.appName")}
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`w-10 h-10 flex items-center justify-center rounded-md hover:bg-[#F9FAFB] dark:hover:bg-accent transition-colors ${isCollapsed ? "mx-auto" : ""}`}
        >
          <PanelLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-[10px] flex flex-col">
        {/* 상단 메뉴 (캘린더, 작업) */}
        <div className="flex flex-col gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={`flex h-10 items-center gap-3 rounded-md transition-colors ${
                  isCollapsed
                    ? "w-10 justify-center p-0"
                    : "w-full px-[10px] py-[6px]"
                } ${
                  isActive
                    ? "bg-[#F9FAFB] dark:bg-accent"
                    : "bg-transparent hover:bg-[#F9FAFB] dark:hover:bg-accent"
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 ${isActive ? "text-primary" : "text-foreground/60"}`}
                  strokeWidth={2}
                />
                {!isCollapsed && (
                  <span
                    className={`font-medium tracking-[0.48px] ${ isActive ? "text-primary" : "text-foreground/60" } text-[15px]`}
                  >
                    {t(item.label)}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t(item.label)}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* 하단 설정 메뉴 */}
        <div className="w-full">
          <SettingsMenu isCollapsed={isCollapsed} />
        </div>
      </nav>

      <div className={`p-[10px] border-t border-border flex flex-col gap-1 ${isCollapsed ? "items-center" : ""}`}>
        {/* 유저 프로필 */}
        <UserMenu isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}