export interface Todo {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
}

export interface User {
    id: string;
    email: string;
    displayName: string;
}

export interface Memo {
    id: string;
    content: string;
    createdAt: Date;
}

export interface Goal {
    id: string;
    title: string;
    targetDate: Date;
    progress: number;
}