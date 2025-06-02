import { useNavigate } from 'react-router-dom';
import { auth, provider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

const LoginPage = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('로그인 실패:', error);
        }
    };

    if (loading) {
        return <div>로딩 중...</div>;
    }

    return (
        <div className="login-page" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh' 
        }}>
            <h1>로그인</h1>
            <button 
                onClick={handleLogin}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#4285f4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Google로 로그인
            </button>
        </div>
    );
};

export default LoginPage;