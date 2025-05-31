import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MoonIcon, 
  SunIcon,
  PlusCircleIcon,
  CalendarIcon,
  PencilSquareIcon,
  HeartIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { collection, doc, setDoc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import type { SleepLog, Counter } from '../types/models';
import '../styles/BottomBar.css';

interface DashboardBottomBarProps {
  onOpenForm: (type: 'todo' | 'goal' | 'memo' | 'exercise') => void;
}

const DashboardBottomBar: React.FC<DashboardBottomBarProps> = ({ onOpenForm }) => {
  const [isSleeping, setIsSleeping] = useState(false);
  const [currentSleepLog, setCurrentSleepLog] = useState<SleepLog | null>(null);
  const [showAddButtons, setShowAddButtons] = useState(false);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);

  const userId = auth.currentUser?.uid;

  // 수면 상태 확인
  useEffect(() => {
    const checkSleepStatus = async () => {
      if (!userId) return;

      const sleepLogsQuery = query(
        collection(db, 'users', userId, 'sleepLogs'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(sleepLogsQuery);
      if (!snapshot.empty) {
        const sleepLog = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SleepLog;
        setCurrentSleepLog(sleepLog);
        setIsSleeping(true);
      }
    };

    checkSleepStatus();
  }, [userId]);

  // 카운터 가져오기
  useEffect(() => {
    const fetchCounters = async () => {
      if (!userId) return;

      const countersSnapshot = await getDocs(collection(db, 'users', userId, 'counters'));
      const countersData = countersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Counter));
      
      setCounters(countersData);
      if (countersData.length > 0) {
        setSelectedCounter(countersData[0]);
      }
    };

    fetchCounters();
  }, [userId]);

  // 수면 토글
  const toggleSleep = async () => {
    if (!userId) return;

    if (isSleeping && currentSleepLog) {
      // 수면 종료
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentSleepLog.startTime.getTime()) / (1000 * 60));
      
      await updateDoc(doc(db, 'users', userId, 'sleepLogs', currentSleepLog.id), {
        endTime: Timestamp.fromDate(endTime),
        duration: duration,
        isActive: false
      });
      
      setIsSleeping(false);
      setCurrentSleepLog(null);
    } else {
      // 수면 시작
      const sleepId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const startTime = new Date();
      
      await setDoc(doc(db, 'users', userId, 'sleepLogs', sleepId), {
        startTime: Timestamp.fromDate(startTime),
        isActive: true
      });
      
      setCurrentSleepLog({
        id: sleepId,
        startTime: startTime,
        isActive: true
      });
      setIsSleeping(true);
    }
  };

  // 카운터 증가
  const incrementCounter = async () => {
    if (!userId || !selectedCounter) return;

    const newCount = selectedCounter.count + 1;
    
    await updateDoc(doc(db, 'users', userId, 'counters', selectedCounter.id), {
      count: newCount
    });
    
    setSelectedCounter({ ...selectedCounter, count: newCount });
    setCounters(counters.map(c => 
      c.id === selectedCounter.id ? { ...c, count: newCount } : c
    ));
  };

  const handleAddButtonClick = (type: 'todo' | 'goal' | 'memo' | 'exercise') => {
    setShowAddButtons(false);
    onOpenForm(type);
  };

  return (
    <>
      {/* 하단 바 */}
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          {!showAddButtons ? (
            <>
              {/* 수면 버튼 */}
              <button
                onClick={toggleSleep}
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
                onClick={() => setShowAddButtons(true)}
                className="main-add-button inactive"
              >
                <PlusIcon className="main-add-icon" />
              </button>

              {/* 카운터 버튼 */}
              {selectedCounter && (
                <div className="counter-section">
                  <select
                    value={selectedCounter.id}
                    onChange={(e) => {
                      const counter = counters.find(c => c.id === e.target.value);
                      if (counter) setSelectedCounter(counter);
                    }}
                    className="counter-select"
                  >
                    {counters.map(counter => (
                      <option key={counter.id} value={counter.id}>
                        {counter.sort}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={incrementCounter}
                    className="counter-button"
                  >
                    <PlusCircleIcon className="counter-icon" />
                    <span>{selectedCounter.count}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Todo 버튼 */}
              <button
                onClick={() => handleAddButtonClick('todo')}
                className="inline-add-button todo"
              >
                <CheckCircleIcon className="inline-add-icon" />
                <span>할 일</span>
              </button>
              
              {/* Goal 버튼 */}
              <button
                onClick={() => handleAddButtonClick('goal')}
                className="inline-add-button goal"
              >
                <CalendarIcon className="inline-add-icon" />
                <span>목표</span>
              </button>
              
              {/* 중앙 X 버튼 */}
              <button
                onClick={() => setShowAddButtons(false)}
                className="main-add-button active"
              >
                <PlusIcon className="main-add-icon" />
              </button>
              
              {/* Memo 버튼 */}
              <button
                onClick={() => handleAddButtonClick('memo')}
                className="inline-add-button memo"
              >
                <PencilSquareIcon className="inline-add-icon" />
                <span>메모</span>
              </button>
              
              {/* Exercise 버튼 */}
              <button
                onClick={() => handleAddButtonClick('exercise')}
                className="inline-add-button exercise"
              >
                <HeartIcon className="inline-add-icon" />
                <span>운동</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardBottomBar; 