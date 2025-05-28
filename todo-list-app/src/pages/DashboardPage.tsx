import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div style={{ padding: '20px' }}>
            <h1>대시보드 페이지</h1>
            {user && (
                <div>
                    <p>환영합니다, {user.displayName}님!</p>
                    <div style={{ 
                        marginTop: '20px',
                        padding: '20px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <h3>오늘의 할 일</h3>
                        <p>여기에 할 일 목록이 표시됩니다.</p>
                    </div>
                </div>
            )}
        </div>
    );
}