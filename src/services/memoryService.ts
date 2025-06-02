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
  
  // Firestore Timestamp를 Date로 변환
  const lastUpdated = process.lastUpdated instanceof Date 
    ? process.lastUpdated 
    : (process.lastUpdated as any).toDate();
    
  const hoursSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  const sizeIncrease = hoursSinceLastUpdate * process.growthRate;
  return Math.max(process.size + sizeIncrease, process.size); // 음수 방지
};

// 프로세스 업데이트
export const updateProcess = async (processId: string) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const processDoc = await getDoc(doc(db, 'users', userId, 'processes', processId));
  if (!processDoc.exists()) return;

  const processData = processDoc.data();
  
  // Firestore Timestamp를 Date로 변환
  const process: Process = {
    ...processData,
    createdAt: processData.createdAt instanceof Date 
      ? processData.createdAt 
      : processData.createdAt.toDate(),
    lastUpdated: processData.lastUpdated instanceof Date 
      ? processData.lastUpdated 
      : processData.lastUpdated.toDate()
  } as Process;

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
    const processData = doc.data();
    
    // Firestore Timestamp를 Date로 변환
    const process: Process = {
      ...processData,
      createdAt: processData.createdAt instanceof Date 
        ? processData.createdAt 
        : processData.createdAt.toDate(),
      lastUpdated: processData.lastUpdated instanceof Date 
        ? processData.lastUpdated 
        : processData.lastUpdated.toDate()
    } as Process;
    
    totalSize += calculateProcessSize(process);
  });

  // 메모리 공간 직접 업데이트
  const memorySpaceDoc = await getDoc(doc(db, 'users', userId, 'memorySpaces', memorySpaceId));
  
  if (memorySpaceDoc.exists()) {
    const memorySpaceData = memorySpaceDoc.data();
    
    // Firestore Timestamp를 Date로 변환
    const memorySpace: MemorySpace = {
      ...memorySpaceData,
      memory: {
        ...memorySpaceData.memory,
        lastUpdated: memorySpaceData.memory.lastUpdated instanceof Date 
          ? memorySpaceData.memory.lastUpdated 
          : memorySpaceData.memory.lastUpdated.toDate()
      }
    } as MemorySpace;

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
    const processData = processDoc.data();
    
    // Firestore Timestamp를 Date로 변환
    const process: Process = {
      ...processData,
      createdAt: processData.createdAt instanceof Date 
        ? processData.createdAt 
        : processData.createdAt.toDate(),
      lastUpdated: processData.lastUpdated instanceof Date 
        ? processData.lastUpdated 
        : processData.lastUpdated.toDate()
    } as Process;
    
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
  
  return memorySpacesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      memory: {
        ...data.memory,
        lastUpdated: data.memory.lastUpdated instanceof Date 
          ? data.memory.lastUpdated 
          : data.memory.lastUpdated.toDate()
      }
    } as MemorySpace;
  });
};

// 프로세스 목록 가져오기
export const getProcesses = async (): Promise<Process[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  const processesSnapshot = await getDocs(collection(db, 'users', userId, 'processes'));
  
  return processesSnapshot.docs.map(doc => {
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
};

// Todo를 다른 메모리 공간으로 이동
export const moveProcessToMemorySpace = async (processId: string, targetSpace: 'memory' | 'hwvm') => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  try {
    const processRef = doc(db, 'users', userId, 'processes', processId);
    const processDoc = await getDoc(processRef);
    
    if (!processDoc.exists()) {
      throw new Error('프로세스를 찾을 수 없습니다.');
    }

    const processData = processDoc.data() as Process;
    const currentSpace = processData.memorySpaceId;

    // 현재 메모리 공간에서 프로세스 제거
    const currentSpaceRef = doc(db, 'users', userId, 'memorySpaces', currentSpace);
    const currentSpaceDoc = await getDoc(currentSpaceRef);
    
    if (currentSpaceDoc.exists()) {
      const currentSpaceData = currentSpaceDoc.data() as any;
      const currentUsage = (currentSpaceData.currentUsage || 0) - processData.size;
      
      await updateDoc(currentSpaceRef, {
        currentUsage: Math.max(0, currentUsage)
      });
    }

    // 대상 메모리 공간에 프로세스 추가
    const targetSpaceRef = doc(db, 'users', userId, 'memorySpaces', targetSpace);
    const targetSpaceDoc = await getDoc(targetSpaceRef);
    
    if (targetSpaceDoc.exists()) {
      const targetSpaceData = targetSpaceDoc.data() as any;
      const newUsage = (targetSpaceData.currentUsage || 0) + processData.size;
      
      // 메모리 용량 체크
      if (newUsage > (targetSpaceData.totalCapacity || 1000)) {
        throw new Error(`${targetSpace} 메모리 공간이 부족합니다.`);
      }
      
      await updateDoc(targetSpaceRef, {
        currentUsage: newUsage
      });
    }

    // 프로세스의 메모리 공간 업데이트
    await updateDoc(processRef, {
      memorySpaceId: targetSpace,
      lastUpdated: Timestamp.now()
    });

    return { success: true, message: `프로세스가 ${targetSpace}로 이동되었습니다.` };
  } catch (error) {
    console.error('프로세스 이동 오류:', error);
    throw error;
  }
}; 