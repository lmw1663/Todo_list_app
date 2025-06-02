import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Goal } from '../types/models';
import { 
  TrophyIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import '../styles/Record.css';

const GoalRecordPage: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const goalsQuery = query(
          collection(db, 'users', user.id, 'goals'),
          orderBy('createdAt', 'desc')
        );
        
        const goalsSnapshot = await getDocs(goalsQuery);
        const goalsData = goalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || new Date()
        } as Goal));

        setGoals(goalsData);
      } catch (error) {
        console.error('목표 기록 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [user?.id]);

  const stats = {
    total: goals.length,
    achieved: goals.filter(g => g.isAchieved).length,
    pending: goals.filter(g => !g.isAchieved && new Date(g.dueDate) >= new Date()).length,
    overdue: goals.filter(g => !g.isAchieved && new Date(g.dueDate) < new Date()).length
  };

  if (loading) {
    return (
      <div className="record-loading">
        <div className="loading-spinner"></div>
        <p>목표 기록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="record-container">
      <div className="record-header">
        <h1 className="record-title">목표 기록</h1>
        <p className="record-subtitle">달성한 목표와 진행 상황을 확인하세요</p>
      </div>

      {/* 목표 통계 */}
      <div className="goal-stats">
        <div className="stat-item">
          <TrophyIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">전체</div>
          </div>
        </div>
        <div className="stat-item achieved">
          <CheckCircleIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.achieved}</div>
            <div className="stat-label">달성</div>
          </div>
        </div>
        <div className="stat-item pending">
          <CalendarIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">진행중</div>
          </div>
        </div>
        <div className="stat-item overdue">
          <XCircleIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.overdue}</div>
            <div className="stat-label">지연</div>
          </div>
        </div>
      </div>

      {/* 목표 목록 */}
      <div className="goal-list">
        {goals.length === 0 ? (
          <div className="empty-state">
            <p>목표 기록이 없습니다.</p>
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className={`goal-item ${goal.isAchieved ? 'achieved' : 'pending'}`}>
              <div className="goal-header">
                {goal.isAchieved ? (
                  <CheckCircleIcon className="status-icon completed" />
                ) : (
                  new Date(goal.dueDate) < new Date() ? (
                    <XCircleIcon className="status-icon overdue" />
                  ) : (
                    <CalendarIcon className="status-icon active" />
                  )
                )}
                <h3 className="goal-title">{goal.title}</h3>
              </div>
              
              <div className="goal-details">
                <div className="detail-item">
                  <CalendarIcon className="detail-icon" />
                  <span>목표일: {goal.dueDate.toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="detail-item">
                  <span>생성: {goal.createdAt.toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GoalRecordPage; 