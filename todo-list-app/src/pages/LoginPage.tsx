import { useState } from 'react';
import { auth, provider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/LoginPage.css';

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    // 이미 로그인된 경우 대시보드로 리다이렉트
    if (user) {
        navigate('/dashboard');
        return null;
    }

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);

        try {
            await signInWithPopup(auth, provider);
            navigate('/dashboard');
        } catch (err) {
            setError('구글 로그인에 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h1 className="title">투두리스트</h1>
            
            {error && <p className="error-message">{error}</p>}
            
            <button 
                onClick={handleGoogleLogin}
                className={`button google-button ${loading ? 'disabled' : ''}`}
                disabled={loading}
            >
                {loading ? '로그인 중...' : '구글 계정으로 로그인'}
            </button>
        </div>
    );
}