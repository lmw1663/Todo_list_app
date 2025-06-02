import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { SleepLog, Counter } from '../types/models';

// ID 생성 헬퍼
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 현재 수면 사이클 ID 생성 (수면 시작 시간 기준)
const generateSleepCycleId = (sleepStartTime: Date) => {
  return `cycle_${sleepStartTime.getFullYear()}_${sleepStartTime.getMonth()}_${sleepStartTime.getDate()}_${sleepStartTime.getTime()}`;
};

// 수면 시작
export const startSleep = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const now = new Date();
  const sleepId = generateId();
  
  const sleepLog: Partial<SleepLog> = {
    id: sleepId,
    startTime: now,
    isActive: true
  };

  await setDoc(doc(db, 'users', userId, 'sleepLogs', sleepId), {
    ...sleepLog,
    startTime: Timestamp.fromDate(now)
  });

  return sleepId;
};

// 수면 종료 및 카운터 저장
export const endSleep = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  // 활성화된 수면 로그 찾기 - 인덱스 오류 해결을 위해 단순화
  const sleepQuery = query(
    collection(db, 'users', userId, 'sleepLogs'),
    where('isActive', '==', true),
    limit(1)
  );

  const sleepSnapshot = await getDocs(sleepQuery);
  
  if (sleepSnapshot.empty) {
    throw new Error('활성화된 수면 로그가 없습니다.');
  }

  const sleepDoc = sleepSnapshot.docs[0];
  const sleepData = sleepDoc.data() as SleepLog;
  const now = new Date();
  
  // startTime을 Date로 변환
  const startTime = sleepData.startTime instanceof Date 
    ? sleepData.startTime 
    : (sleepData.startTime as any).toDate();
    
  const duration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60)); // 분 단위

  // 수면 로그 업데이트
  await updateDoc(doc(db, 'users', userId, 'sleepLogs', sleepDoc.id), {
    endTime: Timestamp.fromDate(now),
    duration: duration,
    isActive: false
  });

  // 현재 사이클의 카운터들을 저장하고 초기화
  await saveCycleCountersAndReset(startTime, now);

  return {
    sleepId: sleepDoc.id,
    duration: duration
  };
};

// 사이클 카운터 저장 및 초기화
export const saveCycleCountersAndReset = async (sleepStart: Date, sleepEnd: Date) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const cycleId = generateSleepCycleId(sleepStart);

  // 현재 카운터들 가져오기
  const countersSnapshot = await getDocs(collection(db, 'users', userId, 'counters'));
  
  // 사이클 기록으로 저장
  const cycleRecord = {
    id: cycleId,
    sleepStart: sleepStart,
    sleepEnd: sleepEnd,
    duration: Math.round((sleepEnd.getTime() - sleepStart.getTime()) / (1000 * 60)),
    counters: {} as Record<string, number>,
    createdAt: new Date()
  };

  // 각 카운터의 값을 사이클 기록에 저장하고 카운터 초기화
  for (const counterDoc of countersSnapshot.docs) {
    const counterData = counterDoc.data() as Counter;
    cycleRecord.counters[counterData.sort] = counterData.count;
    
    // 카운터 초기화
    await updateDoc(doc(db, 'users', userId, 'counters', counterDoc.id), {
      count: 0
    });
  }

  // 사이클 기록 저장
  await setDoc(doc(db, 'users', userId, 'sleepCycles', cycleId), {
    ...cycleRecord,
    sleepStart: Timestamp.fromDate(sleepStart),
    sleepEnd: Timestamp.fromDate(sleepEnd),
    createdAt: Timestamp.fromDate(cycleRecord.createdAt)
  });

  return cycleId;
};

// 현재 활성 수면 상태 확인
export const getCurrentSleepStatus = async (): Promise<SleepLog | null> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;

  const sleepQuery = query(
    collection(db, 'users', userId, 'sleepLogs'),
    where('isActive', '==', true),
    limit(1)
  );

  const sleepSnapshot = await getDocs(sleepQuery);
  
  if (sleepSnapshot.empty) return null;

  const sleepData = sleepSnapshot.docs[0].data();
  return {
    id: sleepSnapshot.docs[0].id,
    ...sleepData,
    startTime: sleepData.startTime.toDate(),
    endTime: sleepData.endTime ? sleepData.endTime.toDate() : undefined
  } as SleepLog;
};

// 수면 사이클 기록들 가져오기
export const getSleepCycles = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const cyclesQuery = query(
    collection(db, 'users', userId, 'sleepCycles'),
    orderBy('sleepStart', 'desc')
  );

  const cyclesSnapshot = await getDocs(cyclesQuery);
  
  return cyclesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      sleepStart: data.sleepStart.toDate(),
      sleepEnd: data.sleepEnd.toDate(),
      createdAt: data.createdAt.toDate()
    };
  });
};

// 특정 날짜의 사이클 가져오기 - 인덱스 오류 해결을 위해 단순화
export const getCycleByDate = async (date: Date) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 복합 쿼리 대신 단순한 쿼리 사용
  const cyclesQuery = query(
    collection(db, 'users', userId, 'sleepCycles'),
    where('sleepStart', '>=', Timestamp.fromDate(startOfDay)),
    where('sleepStart', '<=', Timestamp.fromDate(endOfDay))
  );

  const cyclesSnapshot = await getDocs(cyclesQuery);
  
  if (cyclesSnapshot.empty) return null;

  // 클라이언트 사이드에서 정렬하여 가장 최근 것 선택
  const cycles = cyclesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      sleepStart: data.sleepStart.toDate(),
      sleepEnd: data.sleepEnd.toDate(),
      createdAt: data.createdAt.toDate()
    };
  });

  // 가장 최근 사이클 반환
  return cycles.sort((a, b) => b.sleepStart.getTime() - a.sleepStart.getTime())[0] || null;
}; 