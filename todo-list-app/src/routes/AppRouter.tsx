import { Routes, Route, Navigate} from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import SettingPage from '../pages/SettingPage';
import ProfilePage from '../pages/ProfilePage';
import CallenderPage from '../pages/CallenderPage';

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    console.log('AppRouter.tsx: ProtectedRoute - 사용자 상태:', user);
    if (!user) {
        console.log('AppRouter.tsx: 사용자 미인증, 로그인 페이지로 리다이렉트');
        return <Navigate to="/login" replace />;
    }
    console.log('AppRouter.tsx: 사용자 인증, 보호된 페이지로 이동');
    return <>{children}</>;
};

const AppRouter = () => {
    console.log('AppRouter.tsx: 라우터 렌더링');
    return (
    <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 보호된 라우트 */}
        <Route path="/" element={
        <ProtectedRoute>
            <DashboardPage />
        </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
        <ProtectedRoute>
            <DashboardPage />
        </ProtectedRoute>
        } />
        <Route path="/settings" element={
        <ProtectedRoute>
            <SettingPage />
        </ProtectedRoute>
        } />
        <Route path="/profile" element={
        <ProtectedRoute>
            <ProfilePage />
        </ProtectedRoute>
        } />
        <Route path="/calendar" element={
        <ProtectedRoute>
            <CallenderPage />
        </ProtectedRoute>
        } />
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    );
};

export default AppRouter;