import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MoonIcon, 
  SunIcon,
  PlusCircleIcon,
  CalendarIcon,
  PencilSquareIcon,
  HeartIcon,
  CheckCircleIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { startSleep, endSleep, getCurrentSleepStatus } from '../services/sleepCycleService';
import type { SleepLog, Counter } from '../types/models';
import '../styles/BottomBar.css';

interface DashboardBottomBarProps {
  onOpenForm: (type: 'todo' | 'goal' | 'memo' | 'counter') => void;
}

const DashboardBottomBar: React.FC<DashboardBottomBarProps> = ({ onOpenForm }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [currentSleep, setCurrentSleep] = useState<SleepLog | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);

  // 수면 상태 및 카운터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 수면 상태 확인
        const sleepStatus = await getCurrentSleepStatus();
        setCurrentSleep(sleepStatus);
        setIsSleeping(!!sleepStatus);

        // 카운터 로드
        const userId = auth.currentUser?.uid;
        if (userId) {
          const countersSnapshot = await getDocs(collection(db, 'users', userId, 'counters'));
          const countersData = countersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Counter));
          setCounters(countersData);
          if (countersData.length > 0 && !selectedCounter) {
            setSelectedCounter(countersData[0]);
          }
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      }
    };

    loadData();
  }, []);

  const handleSleepToggle = async () => {
    try {
      if (isSleeping) {
        // 수면 종료 - 카운터들 저장하고 초기화
        const result = await endSleep();
        setIsSleeping(false);
        setCurrentSleep(null);
        
        // 카운터들 초기화 (UI 즉시 반영)
        setCounters(prev => prev.map(counter => ({ ...counter, count: 0 })));
        
        // selectedCounter도 초기화
        setSelectedCounter(prev => prev ? { ...prev, count: 0 } : null);
        
        // 데이터베이스에서 업데이트된 카운터 정보 다시 로드
        setTimeout(async () => {
          try {
            const userId = auth.currentUser?.uid;
            if (userId) {
              const countersSnapshot = await getDocs(collection(db, 'users', userId, 'counters'));
              const countersData = countersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              } as Counter));
              setCounters(countersData);
              
              // 현재 선택된 카운터 업데이트
              if (selectedCounter) {
                const updatedSelectedCounter = countersData.find(c => c.id === selectedCounter.id);
                if (updatedSelectedCounter) {
                  setSelectedCounter(updatedSelectedCounter);
                }
              }
            }
          } catch (error) {
            console.error('카운터 재로드 오류:', error);
          }
        }, 500);
        
        alert(`수면 종료! ${Math.floor(result.duration / 60)}시간 ${result.duration % 60}분 잤습니다. 카운터가 저장되고 초기화되었습니다.`);
      } else {
        // 수면 시작
        const sleepId = await startSleep();
        setIsSleeping(true);
        
        const sleepStatus = await getCurrentSleepStatus();
        setCurrentSleep(sleepStatus);
        
        alert('수면을 시작합니다. 좋은 꿈 꾸세요! 😴');
      }
    } catch (error) {
      console.error('수면 상태 변경 오류:', error);
      alert('수면 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const incrementCounter = async () => {
    if (!selectedCounter) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const newCount = selectedCounter.count + 1;
      
      await updateDoc(doc(db, 'users', userId, 'counters', selectedCounter.id), {
        count: newCount
      });

      // UI 즉시 업데이트
      setCounters(prev => prev.map(counter => 
        counter.id === selectedCounter.id 
          ? { ...counter, count: newCount }
          : counter
      ));
      
      setSelectedCounter(prev => prev ? { ...prev, count: newCount } : null);
    } catch (error) {
      console.error('카운터 증가 오류:', error);
    }
  };

  const deleteCounter = async () => {
    if (!selectedCounter || counters.length <= 1) {
      alert('최소 하나의 카운터는 유지되어야 합니다.');
      return;
    }

    if (!confirm(`"${selectedCounter.sort}" 카운터를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await deleteDoc(doc(db, 'users', userId, 'counters', selectedCounter.id));

      // UI에서 카운터 제거
      const updatedCounters = counters.filter(c => c.id !== selectedCounter.id);
      setCounters(updatedCounters);
      
      // 새로운 카운터 선택
      if (updatedCounters.length > 0) {
        setSelectedCounter(updatedCounters[0]);
      } else {
        setSelectedCounter(null);
      }
      
      alert('카운터가 삭제되었습니다.');
    } catch (error) {
      console.error('카운터 삭제 오류:', error);
      alert('카운터 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddButtonClick = (type: 'todo' | 'goal' | 'memo' | 'counter') => {
    setIsMenuOpen(false);
    onOpenForm(type);
  };

  return (
    <>
      {/* 플로팅 메뉴 */}
      {isMenuOpen && (
        <div className="bottom-bar-overlay">
          <div className="add-buttons-container">
            <button
              onClick={() => handleAddButtonClick('todo')}
              className="add-button todo"
            >
              <CheckCircleIcon className="add-button-icon" />
            </button>
            
            <button
              onClick={() => handleAddButtonClick('goal')}
              className="add-button goal"
            >
              <CalendarIcon className="add-button-icon" />
            </button>
            
            <button
              onClick={() => handleAddButtonClick('memo')}
              className="add-button memo"
            >
              <PencilSquareIcon className="add-button-icon" />
            </button>
            
            <button
              onClick={() => handleAddButtonClick('counter')}
              className="add-button counter"
            >
              <PlusCircleIcon className="add-button-icon" />
            </button>
          </div>
        </div>
      )}

      {/* 하단 바 */}
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          {/* 수면 버튼 */}
          <button
            onClick={handleSleepToggle}
            className={`sleep-button ${isSleeping ? 'active' : 'inactive'}`}
          >
            {isSleeping ? (
              <>
                <SunIcon className="sleep-icon" />
                <span>Wake Up</span>
              </>
            ) : (
              <>
                <MoonIcon className="sleep-icon" />
                <span>Sleep</span>
              </>
            )}
          </button>

          {/* 중앙 + 버튼 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`main-add-button ${isMenuOpen ? 'active' : 'inactive'}`}
          >
            <PlusIcon className="main-add-icon" />
          </button>

          {/* 카운터 섹션 */}
          {selectedCounter && (
            <div className="counter-section">
              <div className="counter-display-card">
                <div className="counter-header">
                  <select
                    value={selectedCounter.id}
                    onChange={(e) => {
                      const counter = counters.find(c => c.id === e.target.value);
                      if (counter) setSelectedCounter(counter);
                    }}
                    className="counter-select-modern"
                  >
                    {counters.map(counter => (
                      <option key={counter.id} value={counter.id}>
                        {counter.sort}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={deleteCounter}
                    className="counter-delete-btn"
                    title="카운터 삭제"
                    disabled={counters.length <= 1}
                  >
                    <TrashIcon className="delete-icon" />
                  </button>
                </div>
                <div className="counter-value-display">
                  <span className="counter-number">{selectedCounter.count}</span>
                  <span className="counter-label">횟수</span>
                </div>
              </div>
              <button
                onClick={incrementCounter}
                className="counter-increment-btn"
                title="카운터 증가"
              >
                <PlusCircleIcon className="increment-icon" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardBottomBar; 