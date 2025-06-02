import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { 
    CalendarDaysIcon,
    HomeIcon,
    DocumentChartBarIcon,
    CheckBadgeIcon,
    FlagIcon,
    DocumentTextIcon,
    MoonIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import '../styles/Header.css';

const Header = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showRecordDropdown, setShowRecordDropdown] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        }
    };

    const handleMouseEnter = () => {
        // 기존 timeout 클리어
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setShowRecordDropdown(true);
    };

    const handleMouseLeave = () => {
        // 지연시간을 두고 메뉴 숨김
        hoverTimeoutRef.current = setTimeout(() => {
            setShowRecordDropdown(false);
        }, 300); // 300ms 지연
    };

    const recordMenuItems = [
        { 
            path: '/record', 
            label: '통계 개요', 
            description: '전체 통계 보기',
            icon: <ChartBarIcon className="record-menu-icon" />
        },
        { 
            path: '/record/todo', 
            label: 'Todo 기록', 
            description: '완료한 할 일',
            icon: <CheckBadgeIcon className="record-menu-icon" />
        },
        { 
            path: '/record/goal', 
            label: '목표 기록', 
            description: '달성한 목표',
            icon: <FlagIcon className="record-menu-icon" />
        },
        { 
            path: '/record/memo', 
            label: '메모 기록', 
            description: '저장된 메모',
            icon: <DocumentTextIcon className="record-menu-icon" />
        },
        { 
            path: '/record/sleep', 
            label: '수면 기록', 
            description: '수면 패턴',
            icon: <MoonIcon className="record-menu-icon" />
        },
        { 
            path: '/record/counter', 
            label: '카운터 기록', 
            description: '활동 횟수',
            icon: <DocumentChartBarIcon className="record-menu-icon" />
        }
    ];

    return (
        <header className="header">
            {/* 왼쪽 - 캘린더 버튼 */}
            <div className="header-left">
                <button
                    onClick={() => navigate('/calendar')}
                    className="nav-button"
                >
                    <CalendarDaysIcon className="nav-icon" />
                    <span>캘린더</span>
                </button>
            </div>

            {/* 가운데 - 대시보드 버튼 */}
            <div className="header-center">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="dashboard-button"
                >
                    <HomeIcon className="nav-icon" />
                    <span>대시보드</span>
                </button>
            </div>

            {/* 오른쪽 - Record 버튼과 프로필 영역 */}
            <div className="header-right">
                {/* Record 드롭다운 메뉴 */}
                <div 
                    className="record-dropdown-container"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button
                        onClick={() => navigate('/record')}
                        className="nav-button record-button"
                    >
                        <DocumentChartBarIcon className="nav-icon" />
                        <span>Record</span>
                    </button>
                    
                    {showRecordDropdown && (
                        <div 
                            className="record-dropdown"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            {recordMenuItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setShowRecordDropdown(false);
                                        // timeout 클리어
                                        if (hoverTimeoutRef.current) {
                                            clearTimeout(hoverTimeoutRef.current);
                                        }
                                    }}
                                    className="record-dropdown-item"
                                >
                                    <div className="record-item-header">
                                        {item.icon}
                                        <span className="record-item-label">{item.label}</span>
                                    </div>
                                    <span className="record-item-description">{item.description}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

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
                        <Cog6ToothIcon className="header-icon" />
                    </button>

                    {/* 로그아웃 버튼 */}
                    <button
                        onClick={handleLogout}
                        className="icon-button logout-button"
                        title="로그아웃"
                    >
                        <ArrowRightOnRectangleIcon className="header-icon" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
