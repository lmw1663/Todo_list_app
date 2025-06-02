import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Memo } from '../types/models';
import { 
  DocumentTextIcon,
  CalendarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import '../styles/Record.css';

const MemoRecordPage: React.FC = () => {
  const { user } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filteredMemos, setFilteredMemos] = useState<Memo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMemos = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const memosQuery = query(
          collection(db, 'users', user.id, 'memos'),
          orderBy('createdAt', 'desc')
        );
        
        const memosSnapshot = await getDocs(memosQuery);
        const memosData = memosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        } as Memo));

        setMemos(memosData);
        setFilteredMemos(memosData);
      } catch (error) {
        console.error('메모 기록 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMemos();
  }, [user?.id]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMemos(memos);
    } else {
      const filtered = memos.filter(memo => 
        memo.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (memo.content && memo.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredMemos(filtered);
    }
  }, [memos, searchTerm]);

  if (loading) {
    return (
      <div className="record-loading">
        <div className="loading-spinner"></div>
        <p>메모 기록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="record-container">
      <div className="record-header">
        <h1 className="record-title">📝 메모 기록</h1>
        <p className="record-subtitle">저장된 메모와 아이디어를 검색하고 관리하세요</p>
      </div>

      {/* 검색 */}
      <div className="search-section">
        <div className="search-box">
          <MagnifyingGlassIcon className="search-icon" />
          <input
            type="text"
            placeholder="메모 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* 메모 통계 */}
      <div className="memo-stats">
        <div className="stat-item">
          <DocumentTextIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{memos.length}</div>
            <div className="stat-label">전체 메모</div>
          </div>
        </div>
        <div className="stat-item">
          <MagnifyingGlassIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{filteredMemos.length}</div>
            <div className="stat-label">검색 결과</div>
          </div>
        </div>
      </div>

      {/* 메모 목록 */}
      <div className="memo-list">
        {filteredMemos.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? '검색 결과가 없습니다.' : '메모가 없습니다.'}</p>
          </div>
        ) : (
          filteredMemos.map(memo => (
            <div key={memo.id} className="memo-item">
              <div className="memo-header">
                <h3 className="memo-title">{memo.text}</h3>
                <div className="memo-date">
                  <CalendarIcon className="date-icon" />
                  <span>{memo.createdAt.toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              
              {memo.content && (
                <div className="memo-content">
                  <p>{memo.content}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MemoRecordPage; 