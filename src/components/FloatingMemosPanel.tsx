import React from 'react';
import { DocumentTextIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Memo } from '../types/models';
import '../styles/FloatingPanel.css';

interface FloatingMemosPanelProps {
    memos: Memo[];
    isOpen: boolean;
    onClose: () => void;
}

export default function FloatingMemosPanel({ memos, isOpen, onClose }: FloatingMemosPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="floating-panel-overlay" onClick={onClose}>
            <div className="floating-panel memos-panel" onClick={(e) => e.stopPropagation()}>
                <div className="panel-header">
                    <div className="panel-title">
                        <DocumentTextIcon className="panel-icon" />
                        <h2>최근 메모</h2>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <XMarkIcon className="close-icon" />
                    </button>
                </div>
                
                <div className="panel-content">
                    {memos.length > 0 ? (
                        <div className="memos-list">
                            {memos.map((memo) => (
                                <div key={memo.id} className="memo-item">
                                    <div className="memo-header">
                                        <h3 className="memo-title">{memo.text}</h3>
                                        <div className="memo-date">
                                            <ClockIcon className="meta-icon" />
                                            {new Date(memo.createdAt).toLocaleDateString('ko-KR')}
                                        </div>
                                    </div>
                                    {memo.content && (
                                        <p className="memo-content">{memo.content}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-panel">
                            <DocumentTextIcon className="empty-icon" />
                            <p>메모가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 