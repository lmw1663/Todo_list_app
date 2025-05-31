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
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { MemorySpace, Process, Todo } from '../types/models';

// ID 생성 헬퍼
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 메모리 공간 초기화
export const initializeMemorySpaces = async (userId: string) => {
  const memorySpaces = [
    {
      id: 'hwvm_' + generateId(),
      name: "hwvm",
      memory: {
        totalCapacity: 500,
        usedCapacity: 0,
        isFull: false,
        lastUpdated: new Date()
      }
    },
    {
      id: 'memory_' + generateId(),
      name: "memory",
      memory: {
        totalCapacity: 1000,
        usedCapacity: 0,
        isFull: false,
        lastUpdated: new Date()
      }
    }
  ];

  for (const space of memorySpaces) {
    await setDoc(doc(db, 'users', userId, 'memorySpaces', space.id), {
      ...space,
      memory: {
        ...space.memory,
        lastUpdated: Timestamp.fromDate(space.memory.lastUpdated)
      }
    });
  }
};

// 새 프로세스 생성
export const createProcess = async (todoId: string, memorySpaceName: string = 'memory') => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  // 메모리 공간 ID 찾기
  const memorySpacesSnapshot = await getDocs(collection(db, 'users', userId, 'memorySpaces'));
  let targetSpaceId = '';
  
  memorySpacesSnapshot.forEach((doc) => {
    if (doc.data().name === memorySpaceName) {
      targetSpaceId = doc.id;
    }
  });

  if (!targetSpaceId) {
    throw new Error(`Memory space ${memorySpaceName} not found`);
  }

  const processId = generateId();
  const process: Process = {
    id: processId,
    todoId,
    memorySpaceId: targetSpaceId, // 실제 메모리 공간 ID 사용
    createdAt: new Date(),
    size: 10, // 초기 크기
    growthRate: 0.5, // 시간당 증가율
    lastUpdated: new Date()
  };

  await setDoc(doc(db, 'users', userId, 'processes', processId), {
    ...process,
    createdAt: Timestamp.fromDate(process.createdAt),
    lastUpdated: Timestamp.fromDate(process.lastUpdated)
  });

  // 메모리 공간 업데이트
  await updateMemorySpaceCapacity(userId, targetSpaceId);

  return process;
};

// 프로세스 크기 계산
export const calculateProcessSize = (process: Process): number => {
  const now = new Date();
  const hoursSinceLastUpdate = (now.getTime() - process.lastUpdated.getTime()) / (1000 * 60 * 60);
  const sizeIncrease = hoursSinceLastUpdate * process.growthRate;
  return process.size + sizeIncrease;
};

// 프로세스 업데이트
export const updateProcess = async (processId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const processDoc = await getDoc(doc(db, 'users', userId, 'processes', processId));
  if (!processDoc.exists()) return;

  const process = processDoc.data() as Process;
  const newSize = calculateProcessSize(process);

  await updateDoc(doc(db, 'users', userId, 'processes', processId), {
    size: newSize,
    lastUpdated: Timestamp.now()
  });

  // 메모리 공간 업데이트
  await updateMemorySpaceCapacity(userId, process.memorySpaceId);
};

// 메모리 공간 용량 업데이트
export const updateMemorySpaceCapacity = async (userId: string, memorySpaceId: string) => {
  // 해당 메모리 공간의 모든 프로세스 가져오기
  const processesQuery = query(
    collection(db, 'users', userId, 'processes'),
    where('memorySpaceId', '==', memorySpaceId)
  );
  
  const processesSnapshot = await getDocs(processesQuery);
  let totalSize = 0;

  processesSnapshot.forEach((doc) => {
    const process = doc.data() as Process;
    totalSize += calculateProcessSize(process);
  });

  // 메모리 공간 직접 업데이트
  const memorySpaceDoc = await getDoc(doc(db, 'users', userId, 'memorySpaces', memorySpaceId));
  
  if (memorySpaceDoc.exists()) {
    const memorySpace = memorySpaceDoc.data() as MemorySpace;

    await updateDoc(doc(db, 'users', userId, 'memorySpaces', memorySpaceId), {
      'memory.usedCapacity': totalSize,
      'memory.isFull': totalSize >= memorySpace.memory.totalCapacity,
      'memory.lastUpdated': Timestamp.now()
    });
  }
};

// Todo 완료 시 프로세스 제거
export const removeProcessByTodoId = async (todoId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  // 해당 Todo의 프로세스 찾기
  const processesQuery = query(
    collection(db, 'users', userId, 'processes'),
    where('todoId', '==', todoId)
  );
  
  const processesSnapshot = await getDocs(processesQuery);
  
  for (const processDoc of processesSnapshot.docs) {
    const process = processDoc.data() as Process;
    
    // 프로세스 삭제
    await deleteDoc(doc(db, 'users', userId, 'processes', processDoc.id));
    
    // 메모리 공간 업데이트
    await updateMemorySpaceCapacity(userId, process.memorySpaceId);
  }
};

// 모든 프로세스 업데이트 (주기적으로 실행)
export const updateAllProcesses = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const processesSnapshot = await getDocs(collection(db, 'users', userId, 'processes'));
  
  for (const processDoc of processesSnapshot.docs) {
    await updateProcess(processDoc.id);
  }
};

// 메모리 공간 정보 가져오기
export const getMemorySpaces = async (): Promise<MemorySpace[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const memorySpacesSnapshot = await getDocs(collection(db, 'users', userId, 'memorySpaces'));
  
  return memorySpacesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as MemorySpace));
};

// 프로세스 목록 가져오기
export const getProcesses = async (): Promise<Process[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const processesSnapshot = await getDocs(collection(db, 'users', userId, 'processes'));
  
  return processesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Process));
}; 