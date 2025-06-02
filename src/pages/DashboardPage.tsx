import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardBottomBar from '../components/DashboardBottomBar';
import Form from '../components/Form';
import { collection, getDocs, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { initializeMemorySpaces, updateAllProcesses, removeProcessByTodoId, getProcesses, calculateProcessSize } from '../services/memoryService';
import type { Todo, Goal, Memo, MemorySpace, Process } from '../types/models';
import { 
  ClipboardDocumentListIcon, 
  FlagIcon, 
  DocumentTextIcon,
  BoltIcon,
  CalendarIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const [formType, setFormType] = useState<'todo' | 'goal' | 'memo' | 'exercise' | null>(null);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [memorySpaces, setMemorySpaces] = useState<MemorySpace[]>([]);
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);

    // 메모리 공간 초기화
    useEffect(() => {
        const initMemory = async () => {
            if (user?.id) {
                const memorySnapshot = await getDocs(collection(db, 'users', user.id, 'memorySpaces'));
                
                // hwvm과 memory가 모두 존재하는지 확인
                const existingSpaces = memorySnapshot.docs.map(doc => doc.data().name);
                const hasHwvm = existingSpaces.includes('hwvm');
                const hasMemory = existingSpaces.includes('memory');
                
                // 둘 중 하나라도 없거나, 추가 메모리 공간이 있으면 초기화
                if (!hasHwvm || !hasMemory || existingSpaces.length !== 2) {
                    console.log('메모리 공간 초기화 중... 기존:', existingSpaces);
                    
                    // 모든 기존 메모리 공간 삭제
                    for (const doc of memorySnapshot.docs) {
                        await deleteDoc(doc.ref);
                    }
                    
                    // hwvm과 memory 두 개만 생성
                    await initializeMemorySpaces(user.id);
                    console.log('메모리 공간이 초기화되었습니다: hwvm, memory');
                }
            }
        };
        initMemory();
    }, [user]);

    // 시간에 따른 프로세스 업데이트 (1분마다)
    useEffect(() => {
        if (!user?.id) return;

        const updateProcesses = async () => {
            try {
                await updateAllProcesses();
                console.log('프로세스 크기가 업데이트되었습니다.');
            } catch (error) {
                console.error('프로세스 업데이트 오류:', error);
            }
        };

        // 즉시 한 번 실행
        updateProcesses();

        // 1분마다 프로세스 업데이트
        const intervalId = setInterval(updateProcesses, 60000); // 60초

        return () => clearInterval(intervalId);
    }, [user]);

    // 데이터 실시간 구독
    useEffect(() => {
        if (!user?.id) return;

        setLoading(true);

        // Todos 구독
        const todosUnsubscribe = onSnapshot(
            query(collection(db, 'users', user.id, 'todos'), where('status', '!=', 'done')),
            (snapshot) => {
                const todosData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Todo));
                setTodos(todosData);
            }
        );

        // Goals 구독
        const goalsUnsubscribe = onSnapshot(
            query(collection(db, 'users', user.id, 'goals'), where('isAchieved', '==', false)),
            (snapshot) => {
                const goalsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Goal));
                setGoals(goalsData);
            }
        );

        // Memos 구독
        const memosUnsubscribe = onSnapshot(
            collection(db, 'users', user.id, 'memos'),
            (snapshot) => {
                const memosData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Memo));
                setMemos(memosData.slice(0, 5)); // 최근 5개만 표시
            }
        );

        // Memory Spaces 구독
        const memoryUnsubscribe = onSnapshot(
            collection(db, 'users', user.id, 'memorySpaces'),
            (snapshot) => {
                const memoryData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as MemorySpace));
                setMemorySpaces(memoryData);
            }
        );

        // Processes 구독
        const processesUnsubscribe = onSnapshot(
            collection(db, 'users', user.id, 'processes'),
            (snapshot) => {
                const processesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt instanceof Date 
                            ? data.createdAt 
                            : data.createdAt.toDate(),
                        lastUpdated: data.lastUpdated instanceof Date 
                            ? data.lastUpdated 
                            : data.lastUpdated.toDate()
                    } as Process;
                });
                setProcesses(processesData);
            }
        );

        setLoading(false);

        return () => {
            todosUnsubscribe();
            goalsUnsubscribe();
            memosUnsubscribe();
            memoryUnsubscribe();
            processesUnsubscribe();
        };
    }, [user]);

    const handleOpenForm = (type: 'todo' | 'goal' | 'memo' | 'exercise') => {
        setFormType(type);
    };

    // Todo 완료 처리
    const handleTodoComplete = async (todoId: string) => {
        if (!user?.id) return;

        try {
            // Todo 상태를 완료로 업데이트
            await updateDoc(doc(db, 'users', user.id, 'todos', todoId), {
                completed: true,
                status: 'done'
            });

            // 메모리에서 해당 프로세스 제거
            await removeProcessByTodoId(todoId);
            
            console.log('Todo 완료 및 메모리 프로세스 제거 완료');
        } catch (error) {
            console.error('Todo 완료 처리 오류:', error);
        }
    };

    // 프로세스별 색상 생성
    const getProcessColor = (index: number) => {
        const colors = [
            'linear-gradient(135deg, #3b82f6, #2563eb)',
            'linear-gradient(135deg, #16a34a, #15803d)',
            'linear-gradient(135deg, #eab308, #ca8a04)',
            'linear-gradient(135deg, #ef4444, #dc2626)',
            'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            'linear-gradient(135deg, #06b6d4, #0891b2)',
            'linear-gradient(135deg, #f59e0b, #d97706)',
            'linear-gradient(135deg, #ec4899, #db2777)'
        ];
        return colors[index % colors.length];
    };

    // 메모리 공간별 프로세스 렌더링
    const renderMemoryProcesses = (memorySpace: MemorySpace) => {
        const spaceProcesses = processes.filter(p => p.memorySpaceId === memorySpace.id);
        let currentPosition = 0;

        return spaceProcesses.map((process, index) => {
            const processSize = Math.max(calculateProcessSize(process), 1); // 동적 크기 계산
            const processWidth = Math.min((processSize / memorySpace.memory.totalCapacity) * 100, 100 - currentPosition);
            const relatedTodo = todos.find(t => t.id === process.todoId);
            
            // 연속된 막대그래프를 위한 border-radius 설정
            const isFirst = index === 0;
            const isLast = index === spaceProcesses.length - 1;
            const borderRadius = isFirst && isLast 
                ? '0.5rem' // 혼자 있을 때
                : isFirst 
                ? '0.5rem 0 0 0.5rem' // 첫 번째
                : isLast 
                ? '0 0.5rem 0.5rem 0' // 마지막
                : '0'; // 중간
            
            const processElement = (
                <div
                    key={process.id}
                    className="memory-process"
                    style={{
                        left: `${currentPosition}%`,
                        width: `${processWidth}%`,
                        background: getProcessColor(index),
                        borderRadius: borderRadius
                    }}
                >
                    <div className="process-tooltip">
                        {relatedTodo ? relatedTodo.text : `프로세스 ${process.id}`}
                        <br />
                        <small>{Math.round(processSize)}MB 사용 중</small>
                    </div>
                </div>
            );

            currentPosition += processWidth;
            return processElement;
        });
    };

    // Todo 관리
    const handleMoveToHwvm = async (processId: string) => {
        if (!user?.id) return;

        try {
            // 프로세스를 hwvm으로 이동
            await updateDoc(doc(db, 'users', user.id, 'processes', processId), {
                memorySpaceId: 'hwvm'
            });
            
            console.log('프로세스가 hwvm으로 이동되었습니다.');
        } catch (error) {
            console.error('프로세스 이동 오류:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* 헤더 */}
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="dashboard-title">대시보드</h1>
                            {user && (
                                <div className="user-info">
                                    <UserCircleIcon className="user-icon" />
                                    <p className="user-text">환영합니다, {user.displayName}님!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="dashboard-main">
                {/* 메모리 상태 */}
                <div className="card">
                    <h2 className="card-header">
                        <div className="icon-container blue">
                            <BoltIcon className="icon blue" />
                        </div>
                        메모리 상태
                    </h2>
                    <div className="memory-grid">
                        {memorySpaces.map((space) => (
                            <div key={space.id} className="memory-item">
                                <div className="memory-header">
                                    <span className="memory-name">{space.name}</span>
                                    <span className="memory-percentage">
                                        {Math.round((space.memory.usedCapacity / space.memory.totalCapacity) * 100)}%
                                    </span>
                                </div>
                                <div className="memory-bar">
                                    {renderMemoryProcesses(space)}
                                    <span className="memory-text">
                                        {Math.round(space.memory.usedCapacity)} / {space.memory.totalCapacity}
                                    </span>
                                </div>
                                <div className="memory-scale">
                                    <span>0</span>
                                    <span>{space.memory.totalCapacity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Todo 관리 */}
                <div className="card">
                    <h2 className="card-header">
                        <div className="icon-container green">
                            <CheckCircleIcon className="icon green" />
                        </div>
                        할 일 관리
                    </h2>
                    
                    {/* Todo 완료율 그래프 */}
                    <div className="todo-progress-chart">
                        <div className="chart-header">
                            <span>완료율</span>
                            <span className="completion-rate">
                                {todos.length > 0 ? Math.round((todos.filter(t => t.status === 'done').length / todos.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="progress-ring">
                            <svg width="120" height="120">
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    stroke="#e5e7eb"
                                    strokeWidth="8"
                                    fill="transparent"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 50}`}
                                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - (todos.length > 0 ? todos.filter(t => t.status === 'done').length / todos.length : 0))}`}
                                    style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                                />
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#10b981" />
                                        <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="ring-text">
                                <div className="completed-count">{todos.filter(t => t.status === 'done').length}</div>
                                <div className="total-count">/ {todos.length}</div>
                            </div>
                        </div>
                    </div>

                    {todos.length > 0 ? (
                        <div className="todo-management">
                            {todos.slice(0, 5).map((todo) => {
                                const relatedProcess = processes.find(p => p.todoId === todo.id);
                                const currentSpace = relatedProcess?.memorySpaceId || 'memory';
                                
                                return (
                                    <div key={todo.id} className="todo-item-dashboard">
                                        <div className="todo-content">
                                            <div className="todo-status-badge">
                                                {todo.status === 'done' ? (
                                                    <CheckCircleIcon className="status-icon completed" />
                                                ) : (
                                                    <ClockIcon className="status-icon active" />
                                                )}
                                            </div>
                                            <div className="todo-text-container">
                                                <h3 className="todo-text">{todo.text}</h3>
                                                <div className="todo-meta">
                                                    <span className="memory-badge">{currentSpace}</span>
                                                    {relatedProcess && (
                                                        <span className="size-badge">
                                                            {Math.round(calculateProcessSize(relatedProcess))}MB
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {todo.status !== 'done' && relatedProcess && (
                                            <div className="todo-actions">
                                                <button
                                                    onClick={() => handleMoveToHwvm(relatedProcess.id)}
                                                    className={`move-btn ${currentSpace === 'hwvm' ? 'to-memory' : 'to-hwvm'}`}
                                                    disabled={currentSpace === 'hwvm'}
                                                >
                                                    {currentSpace === 'hwvm' ? 'HWVM에 있음' : 'HWVM으로 이동'}
                                                </button>
                                                <button
                                                    onClick={() => handleTodoComplete(todo.id)}
                                                    className="complete-btn"
                                                >
                                                    완료
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {todos.length > 5 && (
                                <div className="item-more">
                                    +{todos.length - 5}개 더
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon-container green">
                                <CheckCircleIcon className="empty-icon green" />
                            </div>
                            <p className="empty-text">할 일이 없습니다.</p>
                        </div>
                    )}
                </div>

                <div className="content-grid">
                    {/* 목표 */}
                    <div className="card">
                        <h2 className="card-header">
                            <div className="icon-container red">
                                <FlagIcon className="icon red" />
                            </div>
                            목표
                        </h2>
                        {goals.length > 0 ? (
                            <div className="item-list">
                                {goals.slice(0, 2).map((goal) => (
                                    <div key={goal.id} className="item">
                                        <h3 className="item-title">{goal.title}</h3>
                                        <p className="item-content">
                                            <CalendarIcon className="small-icon" />
                                            {new Date(goal.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                                {goals.length > 2 && (
                                    <div className="item-more">
                                        +{goals.length - 2}개 더
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon-container red">
                                    <FlagIcon className="empty-icon red" />
                                </div>
                                <p className="empty-text">목표가 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 메모 */}
                    <div className="card">
                        <h2 className="card-header">
                            <div className="icon-container yellow">
                                <DocumentTextIcon className="icon yellow" />
                            </div>
                            최근 메모
                        </h2>
                        {memos.length > 0 ? (
                            <div className="item-list">
                                {memos.slice(0, 2).map((memo) => (
                                    <div key={memo.id} className="item memo">
                                        <h3 className="item-title">{memo.text}</h3>
                                        {memo.content && (
                                            <p className="item-content">{memo.content}</p>
                                        )}
                                    </div>
                                ))}
                                {memos.length > 2 && (
                                    <div className="item-more">
                                        +{memos.length - 2}개 더
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon-container yellow">
                                    <DocumentTextIcon className="empty-icon yellow" />
                                </div>
                                <p className="empty-text">메모가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 하단 바 */}
            <DashboardBottomBar onOpenForm={handleOpenForm} />

            {/* 폼 모달 */}
            {formType && (
                <Form 
                    type={formType} 
                    onClose={() => setFormType(null)}
                    onSuccess={() => {
                        // 데이터는 실시간으로 업데이트되므로 추가 작업 불필요
                    }}
                />
            )}
        </div>
    );
}