import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Todo } from '../types/models';
import { 
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import '../styles/Record.css';

const TodoRecordPage: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTodos = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const todosQuery = query(
          collection(db, 'users', user.id, 'todos'),
          orderBy('createdAt', 'desc')
        );
        
        const todosSnapshot = await getDocs(todosQuery);
        const todosData = todosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate === 'infinity' ? 'infinity' : doc.data().dueDate?.toDate?.() || new Date()
        } as Todo));

        setTodos(todosData);
        setFilteredTodos(todosData);
      } catch (error) {
        console.error('Todo 기록 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, [user?.id]);

  useEffect(() => {
    let filtered = [...todos];

    // 필터 적용
    switch (filter) {
      case 'completed':
        filtered = filtered.filter(todo => todo.status === 'done');
        break;
      case 'active':
        filtered = filtered.filter(todo => todo.status === 'process');
        break;
      case 'overdue':
        filtered = filtered.filter(todo => {
          if (todo.dueDate === 'infinity') return false;
          const now = new Date();
          return new Date(todo.dueDate as Date) < now && todo.status !== 'done';
        });
        break;
    }

    // 정렬 적용
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'status':
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'type':
        filtered.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    setFilteredTodos(filtered);
  }, [todos, filter, sortBy]);

  const getStatusIcon = (todo: Todo) => {
    if (todo.status === 'done') {
      return <CheckCircleIcon className="status-icon completed" />;
    }
    
    if (todo.dueDate !== 'infinity') {
      const isOverdue = new Date(todo.dueDate as Date) < new Date();
      if (isOverdue) {
        return <XCircleIcon className="status-icon overdue" />;
      }
    }
    
    return <ClockIcon className="status-icon active" />;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline': return '마감일 있음';
      case 'nodeadline': return '마감일 없음';
      case 'recurring': return '반복';
      default: return type;
    }
  };

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.status === 'done').length,
    active: todos.filter(t => t.status === 'process').length,
    overdue: todos.filter(t => {
      if (t.dueDate === 'infinity') return false;
      return new Date(t.dueDate as Date) < new Date() && t.status !== 'done';
    }).length
  };

  if (loading) {
    return (
      <div className="record-loading">
        <div className="loading-spinner"></div>
        <p>Todo 기록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="record-container">
      <div className="record-header">
        <h1 className="record-title">Todo 기록</h1>
        <p className="record-subtitle">완료한 할 일과 진행 상황을 확인하세요</p>
      </div>

      {/* 통계 요약 */}
      <div className="todo-stats">
        <div className="stat-item">
          <ChartBarIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">전체</div>
          </div>
        </div>
        <div className="stat-item completed">
          <CheckCircleIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.completed}</div>
            <div className="stat-label">완료</div>
          </div>
        </div>
        <div className="stat-item active">
          <ClockIcon className="stat-icon" />
          <div className="stat-content">
            <div className="stat-number">{stats.active}</div>
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

      {/* 필터 및 정렬 */}
      <div className="controls">
        <div className="filter-group">
          <label>필터:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">전체</option>
            <option value="completed">완료된 항목</option>
            <option value="active">진행중인 항목</option>
            <option value="overdue">지연된 항목</option>
          </select>
        </div>
        <div className="sort-group">
          <label>정렬:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="date">생성일순</option>
            <option value="status">상태순</option>
            <option value="type">타입순</option>
          </select>
        </div>
      </div>

      {/* Todo 목록 */}
      <div className="todo-list">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            <p>해당하는 Todo가 없습니다.</p>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div key={todo.id} className={`todo-item ${todo.status}`}>
              <div className="todo-header">
                {getStatusIcon(todo)}
                <h3 className="todo-text">{todo.text}</h3>
                <div className="todo-type">{getTypeLabel(todo.type)}</div>
              </div>
              
              <div className="todo-details">
                <div className="detail-item">
                  <CalendarIcon className="detail-icon" />
                  <span>생성: {todo.createdAt.toLocaleDateString('ko-KR')}</span>
                </div>
                
                {todo.dueDate !== 'infinity' && (
                  <div className="detail-item">
                    <ClockIcon className="detail-icon" />
                    <span>마감: {new Date(todo.dueDate as Date).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                
                {todo.type === 'recurring' && (
                  <div className="detail-item">
                    <span>주 {todo.recurring}회 반복</span>
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

export default TodoRecordPage; 