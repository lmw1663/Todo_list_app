// 사용자 프로필
export interface UserProfile {
  name: string;
  createdAt: Date;
}

// 메모리 관련 타입
export interface Memory {
  totalCapacity: number;  // 총 메모리 용량
  usedCapacity: number;   // 현재 사용 중인 용량
  isFull: boolean;        // 메모리가 가득 찼는지 여부
  lastUpdated: Date;      // 마지막 업데이트 시간
}

export interface MemorySpace {
  id: string;             // 메모리 공간 ID
  name: string;           // 메모리 이름 (예: "Todo_memory", "Hwvm")
  memory: Memory;         // 메모리 정보
}

export interface Process {
  id: string;             // 프로세스 ID
  todoId: string;         // 연결된 Todo의 ID
  memorySpaceId: string;  // 소속된 메모리 공간 ID
  createdAt: Date;        // 프로세스 생성 시간
  size: number;           // 현재 프로세스 크기
  growthRate: number;     // 시간당 크기 증가율
  lastUpdated: Date;      // 마지막 업데이트 시간
}

// Todo 관련 타입
export type TodoStatus = "process" | "virtual" | "done";
export type TodoType = "deadline" | "nodeadline" | "recurring";

export interface Todo {
  id: string;
  text: string;
  dueDate: Date | "infinity";
  status: TodoStatus;
  type: TodoType;
  recurring: number;      // 0이면 반복 없음, 숫자면 일주일에 몇 번 반복
  stackCount: number;
  overDueDate: boolean;
  createdAt: Date;
  completed?: boolean;    // UI를 위한 필드
}

// 메모 관련 타입
export interface Memo {
  id: string;
  text: string;
  content?: string;       // 세부사항
  createdAt: Date;
}

// 목표 관련 타입
export interface Goal {
  id: string;
  title: string;
  isAchieved: boolean;
  dueDate: Date;
  createdAt: Date;
}

// 수면 기록 관련 타입
export interface SleepLog {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;  // 분 단위로 계산
  isActive?: boolean; // 현재 수면 중인지
}

// 카운터 관련 타입
export interface Counter {
  id: string;
  sort: string;      // 예: "cigarette", "coffee", "exercise" 등
  count: number;
  createdAt: Date;
}

// 페널티 관련 타입
export interface Penalty {
  isLocked: boolean;
  reason: string;
}

// 메타 설정 관련 타입
export interface Meta {
  sleepTrackingEnabled: boolean;
}

// 기존 User 인터페이스 업데이트
export interface User {
  id: string;
  email: string;
  displayName: string;
}