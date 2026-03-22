import { Outlet, Navigate, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { useAuth } from "../context/AuthContext";
import { useSidebarContext } from "../context/SidebarContext";

export function Layout() {
  const { isCollapsed } = useSidebarContext();
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // 공개 페이지 (로그인 불필요)
  const isPublicPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // 인증되지 않은 사용자가 보호된 페이지에 접근하려는 경우
  if (!user && !isPublicPage) {
    return <Navigate to="/login" replace />;
  }

  // 인증된 사용자가 로그인 페이지에 접근하려는 경우
  if (user && (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/signup')) {
    return <Navigate to="/calendar" replace />;
  }

  // 로그인/회원가입 페이지는 사이드바 없이 렌더링
  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  // 보호된 페이지는 사이드바와 함께 렌더링
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileHeader />
      <main
        className={`min-h-screen pb-16 lg:pb-0 transition-all duration-300 ${isCollapsed ? "lg:ml-14" : "lg:ml-52"}`}
      >
        <div className="w-full h-full">
          <Outlet className="w-full h-full" />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}