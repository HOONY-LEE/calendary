import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Calendar } from './pages/Calendar';
import { Tasks } from './pages/TasksNew'; // 🔥 캐싱 최적화 버전
// Settings는 이제 SettingsDialog로 모달 표시 (별도 페이지 아님)
// 🚧 통계 페이지 임시 숨김
// import { Analytics } from './pages/Analytics';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        path: '/',
        Component: Layout,
        children: [
          {
            index: true,
            Component: Login,
          },
          {
            path: 'login',
            Component: Login,
          },
          {
            path: 'signup',
            Component: Signup,
          },
          {
            path: 'calendar',
            Component: Calendar,
          },
          {
            path: 'tasks',
            Component: Tasks,
          },
          // settings는 SettingsDialog 모달로 대체됨
          // 🚧 통계 페이지 임시 숨김
          // {
          //   path: 'analytics',
          //   Component: Analytics,
          // },
          {
            path: '*',
            Component: NotFound,
          },
        ],
      },
    ],
  },
]);