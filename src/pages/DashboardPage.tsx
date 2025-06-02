import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardBottomBar from '../components/DashboardBottomBar';
import FloatingGoalsPanel from '../components/FloatingGoalsPanel';
import FloatingMemosPanel from '../components/FloatingMemosPanel';
import Form from '../components/Form';
import { collection, getDocs, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { initializeMemorySpaces, updateAllProcesses, removeProcessByTodoId, getProcesses, calculateProcessSize, updateMemorySpaceCapacity } from '../services/memoryService';
import type { Todo, Goal, Memo, MemorySpace, Process } from '../types/models';
import { 
  ClipboardDocumentListIcon, 
  FlagIcon, 
  DocumentTextIcon,
  BoltIcon,
  CalendarIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

export default function DashboardPage() {
    const { user } = useAuth();
    const [formType, setFormType] = useState<'todo' | 'goal' | 'memo' | 'counter' | null>(null);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [allGoals, setAllGoals] = useState<Goal[]>([]);
    const [memos, setMemos] = useState<Memo[]>([]);
    const [allMemos, setAllMemos] = useState<Memo[]>([]);
    const [memorySpaces, setMemorySpaces] = useState<MemorySpace[]>([]);
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGoalsPanel, setShowGoalsPanel] = useState(false);
    const [showMemosPanel, setShowMemosPanel] = useState(false);

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

        // 모든 Goals 구독 (완료된 것 포함)
        const allGoalsUnsubscribe = onSnapshot(
            collection(db, 'users', user.id, 'goals'),
            (snapshot) => {
                const allGoalsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Goal));
                setAllGoals(allGoalsData);
            }
        );

        // 미완료 Goals 구독 (대시보드용)
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

        // 모든 Memos 구독
        const allMemosUnsubscribe = onSnapshot(
            collection(db, 'users', user.id, 'memos'),
            (snapshot) => {
                const allMemosData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Memo));
                setAllMemos(allMemosData);
            }
        );

        // Memos 구독 (대시보드용)
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
            allGoalsUnsubscribe();
            memosUnsubscribe();
            allMemosUnsubscribe();
            memoryUnsubscribe();
            processesUnsubscribe();
        };
    }, [user]);

    const handleOpenForm = (type: 'todo' | 'goal' | 'memo' | 'counter') => {
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

    // 툴팁 위치 계산 함수
    const calculateTooltipPosition = (processElement: HTMLElement) => {
        const rect = processElement.getBoundingClientRect();
        const tooltip = processElement.querySelector('.enhanced-tooltip') as HTMLElement;
        
        if (tooltip) {
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // 기본 위치 (프로세스 바 위쪽)
            let top = rect.top - tooltipRect.height - 10;
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            
            // 상단 경계 체크
            if (top < 10) {
                top = rect.bottom + 10; // 아래쪽으로 이동
            }
            
            // 좌우 경계 체크
            if (left < 10) {
                left = 10;
            } else if (left + tooltipRect.width > viewportWidth - 10) {
                left = viewportWidth - tooltipRect.width - 10;
            }
            
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            tooltip.classList.add('tooltip-positioned');
        }
    };

    // 메모리 공간별 프로세스 렌더링 (개선된 툴팁 위치 계산 포함)
    const renderMemoryProcesses = (memorySpace: MemorySpace) => {
        const spaceProcesses = processes.filter(p => p.memorySpaceId === memorySpace.id);
        let currentPosition = 0;

        return spaceProcesses.map((process, index) => {
            const processSize = Math.max(calculateProcessSize(process), 1);
            const processWidth = Math.min((processSize / memorySpace.memory.totalCapacity) * 100, 100 - currentPosition);
            const relatedTodo = todos.find(t => t.id === process.todoId);
            
            const isFirst = index === 0;
            const isLast = index === spaceProcesses.length - 1;
            const borderRadius = isFirst && isLast 
                ? '0.5rem'
                : isFirst 
                ? '0.5rem 0 0 0.5rem'
                : isLast 
                ? '0 0.5rem 0.5rem 0'
                : '0';
            
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
                    onMouseEnter={(e) => {
                        setTimeout(() => calculateTooltipPosition(e.currentTarget), 50);
                    }}
                >
                    <div className="process-tooltip enhanced-tooltip">
                        <div className="tooltip-content">
                            <div className="tooltip-header">
                                <h4>{relatedTodo ? relatedTodo.text : `프로세스 ${process.id}`}</h4>
                                <span className="size-badge">{Math.round(processSize)}MB</span>
                            </div>
                            {relatedTodo && relatedTodo.status !== 'done' && (
                                <div className="tooltip-actions">
                                    {memorySpace.name !== 'hwvm' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveToHwvm(process.id);
                                            }}
                                            className="tooltip-btn hwvm-btn"
                                        >
                                            <ArrowRightIcon className="btn-icon" />
                                            HWVM으로 이동
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTodoComplete(relatedTodo.id);
                                        }}
                                        className="tooltip-btn complete-btn"
                                    >
                                        <CheckCircleIcon className="btn-icon" />
                                        완료
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );

            currentPosition += processWidth;
            return processElement;
        });
    };

    // Todo hwvm 이동 처리 (메모리 스페이스 업데이트 포함)
    const handleMoveToHwvm = async (processId: string) => {
        if (!user?.id) return;

        try {
            // 현재 프로세스 정보 가져오기
            const currentProcess = processes.find(p => p.id === processId);
            if (!currentProcess) {
                console.error('프로세스를 찾을 수 없습니다.');
                return;
            }

            // hwvm 메모리 스페이스 찾기
            const hwvmSpace = memorySpaces.find(space => space.name === 'hwvm');
            if (!hwvmSpace) {
                console.error('HWVM 메모리 스페이스를 찾을 수 없습니다.');
                return;
            }

            // 이전 메모리 스페이스 ID 저장
            const previousSpaceId = currentProcess.memorySpaceId;

            // 프로세스를 hwvm으로 이동
            await updateDoc(doc(db, 'users', user.id, 'processes', processId), {
                memorySpaceId: hwvmSpace.id,
                lastUpdated: new Date()
            });
            
            // 이전 메모리 공간과 새로운 메모리 공간 모두 업데이트
            await updateMemorySpaceCapacity(user.id, previousSpaceId);
            await updateMemorySpaceCapacity(user.id, hwvmSpace.id);
            
            console.log('프로세스가 hwvm으로 이동되었습니다.');
        } catch (error) {
            console.error('프로세스 이동 오류:', error);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-text">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* 헤더 */}
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <div className="header-row">
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
                <div className="card memory-card">
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
            </div>

            {/* 플로팅 액션 버튼들 */}
            <div className="floating-action-buttons">
                <button
                    onClick={() => setShowGoalsPanel(true)}
                    className="floating-btn goals-btn"
                    title="목표"
                >
                    <FlagIcon className="floating-btn-icon" />
                </button>
                <button
                    onClick={() => setShowMemosPanel(true)}
                    className="floating-btn memos-btn"
                    title="메모"
                >
                    <DocumentTextIcon className="floating-btn-icon" />
                </button>
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

            {/* 플로팅 패널들 */}
            <FloatingGoalsPanel
                goals={allGoals}
                isOpen={showGoalsPanel}
                onClose={() => setShowGoalsPanel(false)}
            />
            <FloatingMemosPanel
                memos={allMemos}
                isOpen={showMemosPanel}
                onClose={() => setShowMemosPanel(false)}
            />
        </div>
    );
}