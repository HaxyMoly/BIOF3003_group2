import { useState } from 'react';
import { ISession } from '../models/Session';

interface UseSessionDataReturn {
  saveSession: (sessionData: Omit<ISession, 'timestamp'>) => Promise<void>;
  fetchSessions: (subjectId?: string) => Promise<ISession[]>;
  loading: boolean;
  error: string | null;
}

export function useSessionData(): UseSessionDataReturn {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const saveSession = async (sessionData: Omit<ISession, 'timestamp'>) => {
    setLoading(true);
    setError(null);
    console.log("useSessionData: 开始保存会话数据...");
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      
      const result = await response.json();
      console.log("useSessionData: API响应:", result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save session data');
      }
      
      console.log("useSessionData: 会话数据保存成功");
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("useSessionData: 保存会话数据失败:", errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const fetchSessions = async (subjectId?: string): Promise<ISession[]> => {
    setLoading(true);
    setError(null);
    console.log("useSessionData: 开始获取会话数据...", subjectId ? `subjectId: ${subjectId}` : "获取所有会话");
    
    try {
      const url = subjectId 
        ? `/api/sessions?subjectId=${encodeURIComponent(subjectId)}`
        : '/api/sessions';
        
      const response = await fetch(url);
      const result = await response.json();
      
      console.log("useSessionData: API响应:", result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch session data');
      }
      
      console.log("useSessionData: 会话数据获取成功, 共", result.data.length, "条记录");
      setLoading(false);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("useSessionData: 获取会话数据失败:", errorMessage);
      setError(errorMessage);
      setLoading(false);
      return [];
    }
  };

  return {
    saveSession,
    fetchSessions,
    loading,
    error
  };
}