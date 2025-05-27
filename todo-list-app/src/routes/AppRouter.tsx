import { BrowserRouter, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import SettingPage from '../pages/SettingPage';
import ProfilePage from '../pages/ProfilePage';
import CallenderPage from '../pages/CallenderPage';

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();

    if (!user) {
    return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

const AppRouter = () => {
    return (
    <BrowserRouter>
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
    </BrowserRouter>
    );
};

export default AppRouter;