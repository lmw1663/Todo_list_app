import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { createProcess } from '../services/memoryService';
import type { Todo, Goal, Memo, Counter } from '../types/models';
import '../styles/Form.css';

interface FormProps {
  type: 'todo' | 'goal' | 'memo' | 'counter';
  onClose: () => void;
  onSuccess?: () => void;
}

const Form: React.FC<FormProps> = ({ type, onClose, onSuccess }) => {
  const [todoText, setTodoText] = useState('');
  const [todoType, setTodoType] = useState<'deadline' | 'nodeadline' | 'recurring'>('deadline');
  const [recurring, setRecurring] = useState(0);
  const [dueDate, setDueDate] = useState('');
  
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDueDate, setGoalDueDate] = useState('');
  
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  
  const [counterTitle, setCounterTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = auth.currentUser?.uid;

  const resetForm = () => {
    setTodoText('');
    setTodoType('deadline');
    setRecurring(0);
    setDueDate('');
    setGoalTitle('');
    setGoalDueDate('');
    setMemoTitle('');
    setMemoContent('');
    setCounterTitle('');
    setError('');
  };

  const validateForm = (): boolean => {
    switch (type) {
      case 'todo':
        if (!todoText.trim()) {
          setError('할 일을 입력해주세요.');
          return false;
        }
        if (todoType === 'deadline' && !dueDate) {
          setError('마감일을 선택해주세요.');
          return false;
        }
        if (todoType === 'recurring' && recurring === 0) {
          setError('반복 횟수를 선택해주세요.');
          return false;
        }
        break;
      case 'goal':
        if (!goalTitle.trim()) {
          setError('목표를 입력해주세요.');
          return false;
        }
        if (!goalDueDate) {
          setError('목표 날짜를 선택해주세요.');
          return false;
        }
        break;
      case 'memo':
        if (!memoTitle.trim()) {
          setError('메모 제목을 입력해주세요.');
          return false;
        }
        break;
      case 'counter':
        if (!counterTitle.trim()) {
          setError('카운터 이름을 입력해주세요.');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      
      switch (type) {
        case 'todo':
          const todo: Partial<Todo> = {
            text: todoText,
            type: todoType,
            recurring: todoType === 'recurring' ? recurring : 0,
            dueDate: todoType === 'nodeadline' ? 'infinity' : new Date(dueDate),
            status: 'process',
            stackCount: 0,
            overDueDate: false,
            createdAt: new Date(),
            completed: false
          };
          
          await setDoc(doc(db, 'users', userId, 'todos', id), {
            ...todo,
            createdAt: Timestamp.now(),
            dueDate: todo.dueDate === 'infinity' ? 'infinity' : Timestamp.fromDate(todo.dueDate as Date)
          });
          
          // Todo를 메모리에 프로세스로 추가
          await createProcess(id, 'memory');
          break;
          
        case 'goal':
          const goal: Partial<Goal> = {
            title: goalTitle,
            dueDate: new Date(goalDueDate),
            isAchieved: false,
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'users', userId, 'goals', id), {
            ...goal,
            createdAt: Timestamp.now(),
            dueDate: Timestamp.fromDate(goal.dueDate!)
          });
          break;
          
        case 'memo':
          const memo: Partial<Memo> = {
            text: memoTitle,
            content: memoContent,
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'users', userId, 'memos', id), {
            ...memo,
            createdAt: Timestamp.now()
          });
          break;
          
        case 'counter':
          const counter: Partial<Counter> = {
            sort: counterTitle,
            count: 0,
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'users', userId, 'counters', id), {
            ...counter,
            createdAt: Timestamp.now()
          });
          break;
      }
      
      resetForm();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError('저장 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    switch (type) {
      case 'todo': return '할 일 추가';
      case 'goal': return '목표 추가';
      case 'memo': return '메모 추가';
      case 'counter': return '카운터 추가';
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <div className="form-header">
          <h2 className="form-title">{getFormTitle()}</h2>
          <button
            onClick={onClose}
            className="form-close-button"
          >
            <XMarkIcon className="form-close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-content">
          {error && (
            <div className="form-error">{error}</div>
          )}

          {type === 'todo' && (
            <>
              <div className="form-field">
                <label className="form-label">
                  할 일
                </label>
                <input
                  type="text"
                  value={todoText}
                  onChange={(e) => setTodoText(e.target.value)}
                  className="form-input"
                  placeholder="할 일을 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  타입
                </label>
                <select
                  value={todoType}
                  onChange={(e) => setTodoType(e.target.value as typeof todoType)}
                  className="form-select"
                >
                  <option value="deadline">마감일 있음</option>
                  <option value="nodeadline">마감일 없음</option>
                  <option value="recurring">반복</option>
                </select>
              </div>

              {todoType === 'recurring' && (
                <div className="form-field">
                  <label className="form-label">
                    일주일에 몇 번
                  </label>
                  <select
                    value={recurring}
                    onChange={(e) => setRecurring(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value={0}>선택하세요</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                      <option key={num} value={num}>{num}번</option>
                    ))}
                  </select>
                </div>
              )}

              {todoType === 'deadline' && (
                <div className="form-field">
                  <label className="form-label">
                    마감일
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </>
          )}

          {type === 'goal' && (
            <>
              <div className="form-field">
                <label className="form-label">
                  목표
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="form-input"
                  placeholder="목표를 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  목표 날짜
                </label>
                <input
                  type="date"
                  value={goalDueDate}
                  onChange={(e) => setGoalDueDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </>
          )}

          {type === 'memo' && (
            <>
              <div className="form-field">
                <label className="form-label">
                  제목
                </label>
                <input
                  type="text"
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  className="form-input"
                  placeholder="메모 제목을 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  내용
                </label>
                <textarea
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  className="form-textarea"
                  placeholder="메모 내용을 입력하세요"
                />
              </div>
            </>
          )}

          {type === 'counter' && (
            <>
              <div className="form-field">
                <label className="form-label">
                  카운터 이름
                </label>
                <input
                  type="text"
                  value={counterTitle}
                  onChange={(e) => setCounterTitle(e.target.value)}
                  className="form-input"
                  placeholder="카운터 이름을 입력하세요"
                />
              </div>
            </>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading}
              className="form-button primary"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="form-button secondary"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Form; 