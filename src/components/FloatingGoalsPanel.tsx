import React from 'react';
import { FlagIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Goal } from '../types/models';
import '../styles/FloatingPanel.css';

interface FloatingGoalsPanelProps {
    goals: Goal[];
    isOpen: boolean;
    onClose: () => void;
}

export default function FloatingGoalsPanel({ goals, isOpen, onClose }: FloatingGoalsPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="floating-panel-overlay" onClick={onClose}>
            <div className="floating-panel goals-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <div className="panel-title">
                        <FlagIcon className="panel-icon" />
                        <h2>목표</h2>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <XMarkIcon className="close-icon" />
                    </button>
                </div>
                
                <div className="panel-content">
                    {goals.length > 0 ? (
                        <div className="goals-list">
                            {goals.map((goal) => (
                                <div key={goal.id} className="goal-item">
                                    <div className="goal-header">
                                        <h3 className="goal-title">{goal.title}</h3>
                                        <span className={`goal-badge ${goal.isAchieved ? 'achieved' : 'pending'}`}>
                                            {goal.isAchieved ? '완료' : '진행중'}
                                        </span>
                                    </div>
                                    <div className="goal-meta">
                                        <div className="goal-date">
                                            <CalendarIcon className="meta-icon" />
                                            {new Date(goal.dueDate).toLocaleDateString('ko-KR')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-panel">
                            <FlagIcon className="empty-icon" />
                            <p>목표가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 