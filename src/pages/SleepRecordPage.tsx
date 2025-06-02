import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSleepCycles } from '../services/sleepCycleService';
import { 
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import '../styles/Record.css';

interface SleepCycle {
  id: string;
  sleepStart: Date;
  sleepEnd: Date;
  duration: number;
  counters: Record<string, number>;
}

const SleepRecordPage: React.FC = () => {
  const { user } = useAuth();
  const [sleepCycles, setSleepCycles] = useState<SleepCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSleepRecords = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const cycles = await getSleepCycles();
        setSleepCycles(cycles as any);
      } catch (error) {
        console.error('수면 기록 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSleepRecords();
  }, [user?.id]);

  const calculateStats = () => {
    if (sleepCycles.length === 0) return { avgDuration: 0, totalCycles: 0, bestSleep: 0, worstSleep: 0 };

    const durations = sleepCycles.map(cycle => cycle.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const bestSleep = Math.max(...durations);
    const worstSleep = Math.min(...durations);

    return {
      avgDuration: Math.round(avgDuration),
      totalCycles: sleepCycles.length,
      bestSleep: Math.round(bestSleep),
      worstSleep: Math.round(worstSleep)
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="record-loading">
        <div className="loading-spinner"></div>
        <p>수면 기록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="record-container">
      <div className="record-header">
        <h1 className="record-title">수면 기록</h1>
        <p className="record-subtitle">당신의 수면 패턴과 품질을 분석해보세요</p>
      </div>

      {/* 수면 통계 */}
      <div className="sleep-stats">
        <div className="stat-item">
          <ChartBarIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.totalCycles}</div>
            <div className="stat-label">총 수면 기록</div>
          </div>
        </div>
        <div className="stat-item avg">
          <ClockIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{formatDuration(stats.avgDuration)}</div>
            <div className="stat-label">평균 수면시간</div>
          </div>
        </div>
        <div className="stat-item best">
          <SunIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{formatDuration(stats.bestSleep)}</div>
            <div className="stat-label">최고 수면시간</div>
          </div>
        </div>
        <div className="stat-item worst">
          <MoonIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{formatDuration(stats.worstSleep)}</div>
            <div className="stat-label">최소 수면시간</div>
          </div>
        </div>
      </div>

      {/* 수면 기록 목록 */}
      <div className="sleep-list">
        <h2 className="section-title">수면 이력</h2>
        {sleepCycles.length === 0 ? (
          <div className="empty-state">
            <p>수면 기록이 없습니다.</p>
          </div>
        ) : (
          sleepCycles.map(cycle => (
            <div key={cycle.id} className="sleep-item">
              <div className="sleep-header">
                <div className="sleep-date">
                  <CalendarDaysIcon className="date-icon" />
                  <span>{cycle.sleepStart.toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="sleep-duration">
                  <ClockIcon className="duration-icon" />
                  <span>{formatDuration(cycle.duration)}</span>
                </div>
              </div>
              
              <div className="sleep-details">
                <div className="sleep-times">
                  <div className="sleep-time">
                    <MoonIcon className="time-icon" />
                    <span>취침: {formatTime(cycle.sleepStart)}</span>
                  </div>
                  <div className="sleep-time">
                    <SunIcon className="time-icon" />
                    <span>기상: {formatTime(cycle.sleepEnd)}</span>
                  </div>
                </div>
                
                {Object.keys(cycle.counters).length > 0 && (
                  <div className="sleep-counters">
                    <h4>활동 기록</h4>
                    <div className="counters-grid">
                      {Object.entries(cycle.counters).map(([name, count]) => (
                        <div key={name} className="counter-item">
                          <span className="counter-name">{name}</span>
                          <span className="counter-value">{count}회</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SleepRecordPage; 