import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getSleepCycles } from '../services/sleepCycleService';
import type { Todo, Goal, Memo, Counter } from '../types/models';
import { 
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  DocumentTextIcon,
  FireIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import '../styles/Record.css';

interface Statistics {
  totalTodos: number;
  completedTodos: number;
  totalGoals: number;
  achievedGoals: number;
  totalMemos: number;
  totalSleepCycles: number;
  avgSleepDuration: number;
  totalCounters: Record<string, number>;
  weeklyActivity: number[];
}

const RecordPage: React.FC = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<Statistics>({
    totalTodos: 0,
    completedTodos: 0,
    totalGoals: 0,
    achievedGoals: 0,
    totalMemos: 0,
    totalSleepCycles: 0,
    avgSleepDuration: 0,
    totalCounters: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatistics = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        // 모든 데이터를 병렬로 로드
        const [todosSnapshot, goalsSnapshot, memosSnapshot, countersSnapshot, sleepCycles] = await Promise.all([
          getDocs(collection(db, 'users', user.id, 'todos')),
          getDocs(collection(db, 'users', user.id, 'goals')),
          getDocs(collection(db, 'users', user.id, 'memos')),
          getDocs(collection(db, 'users', user.id, 'counters')),
          getSleepCycles()
        ]);

        // Todo 통계
        const todos = todosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        } as Todo));
        
        const completedTodos = todos.filter(todo => todo.status === 'done');

        // Goal 통계
        const goals = goalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Goal));
        
        const achievedGoals = goals.filter(goal => goal.isAchieved);

        // 메모 통계
        const memos = memosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Memo));

        // 카운터 통계
        const counters = countersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Counter));

        const totalCounters: Record<string, number> = {};
        counters.forEach(counter => {
          totalCounters[counter.sort] = counter.count;
        });

        // 수면 통계
        const avgSleepDuration = sleepCycles.length > 0 
          ? sleepCycles.reduce((sum, cycle) => sum + ((cycle as any).duration || 0), 0) / sleepCycles.length
          : 0;

        // 주간 활동 통계 (최근 7일)
        const now = new Date();
        const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          const dayActivity = completedTodos.filter(todo => {
            const completedDate = new Date(todo.createdAt);
            return completedDate >= dayStart && completedDate <= dayEnd;
          }).length;

          weeklyActivity[6 - i] = dayActivity;
        }

        setStatistics({
          totalTodos: todos.length,
          completedTodos: completedTodos.length,
          totalGoals: goals.length,
          achievedGoals: achievedGoals.length,
          totalMemos: memos.length,
          totalSleepCycles: sleepCycles.length,
          avgSleepDuration: Math.round(avgSleepDuration),
          totalCounters,
          weeklyActivity
        });

      } catch (error) {
        console.error('통계 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="record-loading">
        <div className="loading-spinner"></div>
        <p>통계를 불러오는 중...</p>
      </div>
    );
  }

  const completionRate = statistics.totalTodos > 0 
    ? Math.round((statistics.completedTodos / statistics.totalTodos) * 100) 
    : 0;

  const goalAchievementRate = statistics.totalGoals > 0 
    ? Math.round((statistics.achievedGoals / statistics.totalGoals) * 100) 
    : 0;

  return (
    <div className="record-container">
      <div className="record-header">
        <h1 className="record-title">활동 통계</h1>
        <p className="record-subtitle">당신의 생산성과 활동을 한눈에 확인하세요</p>
      </div>

      <div className="statistics-grid">
        {/* Todo 통계 */}
        <div className="stat-card todo-card">
          <div className="stat-header">
            <CheckCircleIcon className="stat-icon" />
            <h3>할 일 관리</h3>
          </div>
          <div className="stat-content">
            <div className="stat-number">{statistics.completedTodos}/{statistics.totalTodos}</div>
            <div className="stat-label">완료된 할 일</div>
            <div className="progress-bar">
              <div 
                className="progress-fill todo-progress" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="stat-percentage">{completionRate}% 완료</div>
          </div>
        </div>

        {/* Goal 통계 */}
        <div className="stat-card goal-card">
          <div className="stat-header">
            <TrophyIcon className="stat-icon" />
            <h3>목표 달성</h3>
          </div>
          <div className="stat-content">
            <div className="stat-number">{statistics.achievedGoals}/{statistics.totalGoals}</div>
            <div className="stat-label">달성된 목표</div>
            <div className="progress-bar">
              <div 
                className="progress-fill goal-progress" 
                style={{ width: `${goalAchievementRate}%` }}
              ></div>
            </div>
            <div className="stat-percentage">{goalAchievementRate}% 달성</div>
          </div>
        </div>

        {/* 메모 통계 */}
        <div className="stat-card memo-card">
          <div className="stat-header">
            <DocumentTextIcon className="stat-icon" />
            <h3>메모 작성</h3>
          </div>
          <div className="stat-content">
            <div className="stat-number">{statistics.totalMemos}</div>
            <div className="stat-label">작성된 메모</div>
            <div className="stat-detail">지식과 아이디어 기록</div>
          </div>
        </div>

        {/* 수면 통계 */}
        <div className="stat-card sleep-card">
          <div className="stat-header">
            <ClockIcon className="stat-icon" />
            <h3>수면 관리</h3>
          </div>
          <div className="stat-content">
            <div className="stat-number">{statistics.totalSleepCycles}</div>
            <div className="stat-label">수면 사이클</div>
            <div className="stat-detail">
              평균 {Math.floor(statistics.avgSleepDuration / 60)}시간 {statistics.avgSleepDuration % 60}분
            </div>
          </div>
        </div>
      </div>

      {/* 활동 카운터 */}
      {Object.keys(statistics.totalCounters).length > 0 && (
        <div className="counters-section">
          <h2 className="section-title">🔢 활동 카운터</h2>
          <div className="counters-grid">
            {Object.entries(statistics.totalCounters).map(([name, count]) => (
              <div key={name} className="counter-stat">
                <div className="counter-name">{name}</div>
                <div className="counter-count">{count}회</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주간 활동 그래프 */}
      <div className="weekly-section">
        <h2 className="section-title">📈 주간 활동</h2>
        <div className="weekly-chart">
          {statistics.weeklyActivity.map((activity, index) => {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const maxActivity = Math.max(...statistics.weeklyActivity, 1);
            const height = (activity / maxActivity) * 100;
            
            return (
              <div key={index} className="weekly-bar">
                <div 
                  className="bar-fill" 
                  style={{ height: `${height}%` }}
                  title={`${activity}개 완료`}
                ></div>
                <div className="bar-label">{days[index]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 성취 배지 */}
      <div className="achievements-section">
        <h2 className="section-title">🏆 성취 배지</h2>
        <div className="achievements-grid">
          {statistics.completedTodos >= 10 && (
            <div className="achievement-badge">
              <FireIcon className="badge-icon" />
              <span>할 일 마스터</span>
            </div>
          )}
          {statistics.achievedGoals >= 5 && (
            <div className="achievement-badge">
              <TrophyIcon className="badge-icon" />
              <span>목표 달성자</span>
            </div>
          )}
          {statistics.totalSleepCycles >= 7 && (
            <div className="achievement-badge">
              <ClockIcon className="badge-icon" />
              <span>수면 관리자</span>
            </div>
          )}
          {statistics.totalMemos >= 20 && (
            <div className="achievement-badge">
              <DocumentTextIcon className="badge-icon" />
              <span>메모 수집가</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordPage; 