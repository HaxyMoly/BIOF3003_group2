"use client";
import React, { useEffect, useState } from "react";

interface PerformanceSummaryProps {
  isSessionActive: boolean; // Indicates if the session is currently active
  showOnlyTimer?: boolean; // Optional prop to display only the live timer
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({
  isSessionActive,
  showOnlyTimer = false,
}) => {
  const [sessionDuration, setSessionDuration] = useState<number>(0); // Duration in seconds
  const [frozenDuration, setFrozenDuration] = useState<number | null>(null); // Frozen duration after session ends
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Start or stop the timer based on session activity
  useEffect(() => {
    if (isSessionActive) {
      // Reset session duration only when transitioning from inactive to active
      if (!isTimerRunning) {
        setSessionDuration(0); // Reset timer for a new session
      }
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      setFrozenDuration(sessionDuration); // Freeze the duration when the session ends
    }
  }, [isSessionActive, sessionDuration, isTimerRunning]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null; // Initialize interval as null

    if (isTimerRunning) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval !== null) {
        clearInterval(interval); // Ensure interval is cleared only if it's not null
      }
    }

    return () => {
      if (interval !== null) {
        clearInterval(interval); // Cleanup interval on unmount
      }
    };
  }, [isTimerRunning]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <div>
      {showOnlyTimer ? (
        // Display only the live timer or frozen duration
        <p className="text-xl font-bold text-gray-800">
          Session Duration:{" "}
          <p className="text-2xl font-bold text-purple-600">
            {isSessionActive
              ? formatDuration(sessionDuration) // Show live timer during the session
              : frozenDuration !== null
              ? formatDuration(frozenDuration) // Show frozen duration after session ends
              : "00:00"}{" "}
            {/* Default fallback */}
          </p>
          
        </p>
      ) : (
        // Full performance summary (for future use)
        <>
          <h2 className="text-xl font-bold text-gray-800">Performance Summary</h2>
          {isSessionActive ? (
            // Show live timer during the session
            <p className="text-2xl font-bold text-purple-600">
              Session Duration: {formatDuration(sessionDuration)}
            </p>
          ) : frozenDuration !== null ? (
            // Show frozen duration after session ends
            <p className="text-2xl font-bold text-green-600">
              Total Duration: {formatDuration(frozenDuration)}
            </p>
          ) : (
            // Fallback for when no session is active
            <p className="text-lg font-semibold text-gray-500">No session data available.</p>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceSummary;