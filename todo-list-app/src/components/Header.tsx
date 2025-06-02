import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import './Header.css';

const Header = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        }
    };

    return (
        <header className="header">
            {/* 왼쪽 - 캘린더 버튼 */}
            <div className="header-left">
                <button
                    onClick={() => navigate('/calendar')}
                    className="nav-button"
                >
                    📅 캘린더
                </button>
            </div>

            {/* 가운데 - 대시보드 버튼 */}
            <div className="header-center">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="dashboard-button"
                >
                    🏠 대시보드
                </button>
            </div>

            {/* 오른쪽 - Record 버튼과 프로필 영역 */}
            <div className="header-right">
                {/* Record 버튼 */}
                <button
                    onClick={() => navigate('/record')}
                    className="nav-button"
                >
                    📝 Record
                </button>

                {/* 프로필 영역 */}
                <div className="profile-area">
                    {/* 프로필 사진 */}
                    <div
                        onClick={() => navigate('/profile')}
                        className="profile-picture"
                        title={user?.displayName || '프로필'}
                    >
                        {user?.displayName?.charAt(0).toUpperCase() || '👤'}
                    </div>

                    {/* 설정 버튼 */}
                    <button
                        onClick={() => navigate('/settings')}
                        className="icon-button settings-button"
                        title="설정"
                    >
                        ⚙️
                    </button>

                    {/* 로그아웃 버튼 */}
                    <button
                        onClick={handleLogout}
                        className="icon-button logout-button"
                        title="로그아웃"
                    >
                        🚪
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
