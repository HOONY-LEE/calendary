import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { SidebarProvider } from '../context/SidebarContext';
import { TasksProvider } from '../context/TasksContext';

export function Root() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <TasksProvider>
          <Outlet />
        </TasksProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}