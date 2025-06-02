import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getCycleByDate } from '../services/sleepCycleService';
import type { Todo, Goal, Memo, Counter } from '../types/models';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  FlagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import '../styles/Calendar.css';

interface DayData {
  date: Date;
  todos: Todo[];
  completedTodos: Todo[];
  goals: Goal[];
  memos: Memo[];
  sleepData?: {
    sleepStart: Date;
    sleepEnd: Date;
    duration: number;
    counters: Record<string, number>;
  };
}

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);

  // 달력 데이터 로드
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!user?.id) return;

      setLoading(true);
      const data: Record<string, DayData> = {};

      try {
        // 현재 월의 첫날과 마지막날
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // 모든 데이터를 병렬로 로드
        const [todosSnapshot, goalsSnapshot, memosSnapshot] = await Promise.all([
          getDocs(collection(db, 'users', user.id, 'todos')),
          getDocs(collection(db, 'users', user.id, 'goals')),
          getDocs(collection(db, 'users', user.id, 'memos'))
        ]);

        // 데이터 파싱
        const todos = todosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate === 'infinity' ? 'infinity' : doc.data().dueDate?.toDate?.() || new Date()
        } as Todo));

        const goals = goalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || new Date()
        } as Goal));

        const memos = memosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        } as Memo));

        // 달력의 각 날짜에 데이터 할당
        for (let date = new Date(startOfMonth); date <= endOfMonth; date.setDate(date.getDate() + 1)) {
          const dateKey = date.toISOString().split('T')[0];
          const dayStart = new Date(date);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          // 해당 날짜의 수면 사이클 데이터
          const sleepCycle = await getCycleByDate(date);

          data[dateKey] = {
            date: new Date(date),
            todos: todos.filter(todo => {
              if (todo.dueDate === 'infinity') return false;
              const dueDate = new Date(todo.dueDate as Date);
              return dueDate >= dayStart && dueDate <= dayEnd;
            }),
            completedTodos: todos.filter(todo => {
              if (todo.status !== 'done') return false;
              const createdDate = new Date(todo.createdAt);
              return createdDate >= dayStart && createdDate <= dayEnd;
            }),
            goals: goals.filter(goal => {
              const dueDate = new Date(goal.dueDate);
              return dueDate >= dayStart && dueDate <= dayEnd;
            }),
            memos: memos.filter(memo => {
              const createdDate = new Date(memo.createdAt);
              return createdDate >= dayStart && createdDate <= dayEnd;
            }),
            sleepData: sleepCycle ? {
              sleepStart: sleepCycle.sleepStart,
              sleepEnd: sleepCycle.sleepEnd,
              duration: (sleepCycle as any).duration || 0,
              counters: (sleepCycle as any).counters || {}
            } : undefined
          };
        }

        setCalendarData(data);
      } catch (error) {
        console.error('캘린더 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [currentDate, user?.id]);

  // 달력 네비게이션
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // 달력 렌더링
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        // 현재 날짜를 고정하기 위해 새로운 Date 객체 생성
        const cellDate = new Date(currentDay);
        const dateKey = cellDate.toISOString().split('T')[0];
        const dayData = calendarData[dateKey];
        const isCurrentMonth = cellDate.getMonth() === month;
        const isToday = cellDate.toDateString() === new Date().toDateString();
        const isSelected = cellDate.toDateString() === selectedDate.toDateString();

        weekDays.push(
          <div
            key={dateKey}
            className={`calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${
              isToday ? 'today' : ''
            } ${isSelected ? 'selected' : ''}`}
            onClick={() => setSelectedDate(new Date(cellDate))}
          >
            <div className="day-number">{cellDate.getDate()}</div>
            {isCurrentMonth && dayData && (
              <div className="day-indicators">
                {dayData.todos.length > 0 && (
                  <div className="indicator todo-indicator" title={`${dayData.todos.length}개 할 일`}>
                    {dayData.todos.length}
                  </div>
                )}
                {dayData.completedTodos.length > 0 && (
                  <div className="indicator completed-indicator" title={`${dayData.completedTodos.length}개 완료`}>
                    ✓
                  </div>
                )}
                {dayData.sleepData && (
                  <div className="indicator sleep-indicator" title="수면 기록">
                    😴
                  </div>
                )}
              </div>
            )}
          </div>
        );
        currentDay.setDate(currentDay.getDate() + 1);
      }
      days.push(
        <div key={week} className="calendar-week">
          {weekDays}
        </div>
      );
    }

    return days;
  };

  // 선택된 날짜의 상세 정보
  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const selectedDayData = calendarData[selectedDateKey];

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner"></div>
        <p>캘린더를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-navigation">
          <button onClick={() => navigateMonth('prev')} className="nav-button">
            <ChevronLeftIcon className="nav-icon" />
          </button>
          <h1 className="calendar-title">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </h1>
          <button onClick={() => navigateMonth('next')} className="nav-button">
            <ChevronRightIcon className="nav-icon" />
          </button>
        </div>
      </div>

      <div className="calendar-content">
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {renderCalendar()}
          </div>
        </div>

        <div className="day-details">
          <h2 className="details-title">
            {selectedDate.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </h2>

          {selectedDayData ? (
            <div className="details-content">
              {/* 할 일 */}
              {selectedDayData.todos.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <CheckCircleIcon className="section-icon" />
                    할 일 ({selectedDayData.todos.length})
                  </h3>
                  <div className="item-list">
                    {selectedDayData.todos.map(todo => (
                      <div key={todo.id} className="detail-item">
                        <span className="item-text">{todo.text}</span>
                        <span className="item-meta">
                          {todo.dueDate !== 'infinity' && 
                            new Date(todo.dueDate as Date).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 완료한 일 */}
              {selectedDayData.completedTodos.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <CheckCircleIcon className="section-icon completed" />
                    완료한 일 ({selectedDayData.completedTodos.length})
                  </h3>
                  <div className="item-list">
                    {selectedDayData.completedTodos.map(todo => (
                      <div key={todo.id} className="detail-item completed">
                        <span className="item-text">{todo.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 수면 기록 */}
              {selectedDayData.sleepData && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <ClockIcon className="section-icon" />
                    수면 기록
                  </h3>
                  <div className="sleep-info">
                    <div className="sleep-time">
                      <span>취침: {selectedDayData.sleepData.sleepStart.toLocaleTimeString('ko-KR')}</span>
                      <span>기상: {selectedDayData.sleepData.sleepEnd.toLocaleTimeString('ko-KR')}</span>
                      <span>수면시간: {Math.floor(selectedDayData.sleepData.duration / 60)}시간 {selectedDayData.sleepData.duration % 60}분</span>
                    </div>
                    {Object.keys(selectedDayData.sleepData.counters).length > 0 && (
                      <div className="counters-info">
                        <h4>활동 기록</h4>
                        {Object.entries(selectedDayData.sleepData.counters).map(([key, value]) => (
                          <div key={key} className="counter-item">
                            <span>{key}: {value}회</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 메모 */}
              {selectedDayData.memos.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">
                    <DocumentTextIcon className="section-icon" />
                    메모 ({selectedDayData.memos.length})
                  </h3>
                  <div className="item-list">
                    {selectedDayData.memos.map(memo => (
                      <div key={memo.id} className="detail-item memo">
                        <span className="item-text">{memo.text}</span>
                        {memo.content && (
                          <span className="item-meta">{memo.content}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedDayData.todos.length && 
               !selectedDayData.completedTodos.length && 
               !selectedDayData.sleepData && 
               !selectedDayData.memos.length && (
                <div className="empty-day">
                  <p>이 날에는 기록된 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-day">
              <p>이 날에는 기록된 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage; 