"use client";
import React, { useEffect, useState } from 'react';
import { useSessionData } from '../hooks/useSessionData';
import { ISession } from '../models/Session';
import HistoricalChart from './HistoricalChart';

interface SessionHistoryProps {
  subjectId: string;
  refreshTrigger?: number; // Optional prop to trigger refresh
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ subjectId, refreshTrigger }) => {
  const [sessions, setSessions] = useState<ISession[]>([]);
  const { fetchSessions, loading, error } = useSessionData();

  useEffect(() => {
    console.log("SessionHistory component received refresh trigger:", refreshTrigger);
    console.log("Current subjectId:", subjectId);
    loadSessions();
  }, [subjectId, refreshTrigger]);

  const loadSessions = async () => {
    console.log("Starting to fetch historical session data...");
    try {
      const data = await fetchSessions(subjectId);
      console.log("Retrieved historical session data:", data);
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch historical session data:", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) return <div className="text-center py-4">Loading historical data...</div>;
  if (error) return <div className="text-red-500 py-4">Error: {error}</div>;
  if (sessions.length === 0) return <div className="text-center py-4">No historical session records found.</div>;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Session History</h2>
        
        {/* Add historical trend chart */}
        {sessions.length > 0 && (
          <HistoricalChart sessions={sessions} />
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heart Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HRV</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Respiratory Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(session.timestamp.toString())}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.meditationType === 'meditation' ? 'Meditation (Static)' : 'Mindfulness (Dynamic)'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.heartRate} bpm</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.hrv} ms</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.respiratoryRate} bpm</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(session.sessionDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;