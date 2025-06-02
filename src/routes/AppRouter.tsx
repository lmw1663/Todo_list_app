import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import SettingPage from '../pages/SettingPage';
import ProfilePage from '../pages/ProfilePage';
import CalendarPage from '../pages/CalendarPage';
import RecordPage from '../pages/RecordPage';
import TodoRecordPage from '../pages/TodoRecordPage';
import SleepRecordPage from '../pages/SleepRecordPage';
import GoalRecordPage from '../pages/GoalRecordPage';
import MemoRecordPage from '../pages/MemoRecordPage';

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>로딩 중...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <>
            <Header />
            {children}
        </>
    );
};

const AppRouter = () => {
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
            <Route path="/calendar" element={
                <ProtectedRoute>
                    <CalendarPage />
                </ProtectedRoute>
            } />
            <Route path="/record" element={
                <ProtectedRoute>
                    <RecordPage />
                </ProtectedRoute>
            } />
            <Route path="/record/todo" element={
                <ProtectedRoute>
                    <TodoRecordPage />
                </ProtectedRoute>
            } />
            <Route path="/record/sleep" element={
                <ProtectedRoute>
                    <SleepRecordPage />
                </ProtectedRoute>
            } />
            <Route path="/record/goal" element={
                <ProtectedRoute>
                    <GoalRecordPage />
                </ProtectedRoute>
            } />
            <Route path="/record/memo" element={
                <ProtectedRoute>
                    <MemoRecordPage />
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
            
            {/* 404 페이지 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRouter;