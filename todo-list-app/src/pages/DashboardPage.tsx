import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardBottomBar from '../components/DashboardBottomBar';
import Form from '../components/Form';
import { collection, getDocs, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { initializeMemorySpaces, updateAllProcesses, removeProcessByTodoId } from '../services/memoryService';
import type { Todo, Goal, Memo, MemorySpace } from '../types/models';
import { 
  ClipboardDocumentListIcon, 
  FlagIcon, 
  DocumentTextIcon,
  BoltIcon,
  CalendarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const [formType, setFormType] = useState<'todo' | 'goal' | 'memo' | 'exercise' | null>(null);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [memorySpaces, setMemorySpaces] = useState<MemorySpace[]>([]);
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

        setLoading(false);

        return () => {
            todosUnsubscribe();
            goalsUnsubscribe();
            memosUnsubscribe();
            memoryUnsubscribe();
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
                                    <div 
                                        className="memory-progress"
                                        style={{ 
                                            width: `${(space.memory.usedCapacity / space.memory.totalCapacity) * 100}%` 
                                        }}
                                    >
                                        <span className="memory-text">
                                            {Math.round(space.memory.usedCapacity)} / {space.memory.totalCapacity}
                                        </span>
                                    </div>
                                </div>
                                <div className="memory-scale">
                                    <span>0</span>
                                    <span>{space.memory.totalCapacity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 할 일 목록 */}
                <div className="card">
                    <h2 className="card-header">
                        <div className="icon-container green">
                            <ClipboardDocumentListIcon className="icon green" />
                        </div>
                        오늘의 할 일
                    </h2>
                    {todos.length > 0 ? (
                        <div className="todo-list">
                            {todos.slice(0, 3).map((todo) => (
                                <div key={todo.id} className="todo-item">
                                    <input 
                                        type="checkbox" 
                                        checked={todo.completed || false}
                                        onChange={() => handleTodoComplete(todo.id)}
                                        className="todo-checkbox"
                                    />
                                    <span className="todo-text">{todo.text}</span>
                                    <span className="todo-badge">
                                        {todo.type === 'deadline' && todo.dueDate !== 'infinity' && 
                                            `마감: ${new Date(todo.dueDate as Date).toLocaleDateString()}`
                                        }
                                    </span>
                                </div>
                            ))}
                            {todos.length > 3 && (
                                <div className="todo-more">
                                    +{todos.length - 3}개 더
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon-container green">
                                <ClipboardDocumentListIcon className="empty-icon green" />
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