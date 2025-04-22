"use client";
import React, { useState, useEffect } from "react";

// Meditation Types
type MeditationType = "mindfulness" | "meditation";

interface MonitorControlsProps {
  isConnected: boolean;
  isECGStreaming: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  startECGStream: () => Promise<void>;
  stopECGStream: () => void;
  error: string | null;
  heartRate: number | null;
  onMeditationTypeChange: (type: MeditationType) => void;
  onSubjectIdChange?: (id: string) => void; // 添加这个属性
  onSessionEnd?: (sessionData: {
    subjectId: string;
    meditationType: MeditationType;
    sessionDuration: number;
  }) => void; // Callback for session end
}

const HeartRateMonitor: React.FC<MonitorControlsProps> = ({
  isConnected,
  isECGStreaming,
  connect,
  disconnect,
  startECGStream,
  stopECGStream,
  error,
  heartRate,
  onMeditationTypeChange,
  onSubjectIdChange, // 添加这个参数
  onSessionEnd,
}) => {
  const [subjectId, setSubjectId] = useState<string>("");
  const [meditationType, setMeditationType] = useState<MeditationType>("mindfulness");
  const [formValid, setFormValid] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // 新增：当subjectId变化时，通知父组件
  useEffect(() => {
    if (onSubjectIdChange && subjectId) {
      onSubjectIdChange(subjectId);
    }
  }, [subjectId, onSubjectIdChange]);

  const validateForm = () => {
    setFormValid(subjectId.trim() !== "");
  };

  const handleSubjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubjectId = e.target.value;
    setSubjectId(newSubjectId);
    validateForm();
    
    // 添加这段代码，当subjectId变化时通知父组件
    if (onSubjectIdChange) {
      onSubjectIdChange(newSubjectId);
      console.log("HeartRateMonitor: 已更新subjectId:", newSubjectId);
    }
  };

  const handleMeditationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMeditationType = e.target.value as MeditationType;
    setMeditationType(newMeditationType);
    onMeditationTypeChange(newMeditationType); // Call the callback to update the parent
  };

  const handleConnect = async () => {
    if (formValid) {
      console.log("Subject ID:", subjectId);
      console.log("Meditation Type:", meditationType);
      
      // 添加这段代码，确保在连接时也传递subjectId
      if (onSubjectIdChange) {
        onSubjectIdChange(subjectId);
        console.log("HeartRateMonitor: 连接时传递subjectId:", subjectId);
      }
      
      await connect();
    }
  };

  const handleStartSession = async () => {
    setSessionStartTime(Date.now());
    await startECGStream();
  };

  const handleEndSession = async () => {
    if (sessionStartTime && onSessionEnd) {
      const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000); // Duration in seconds
      onSessionEnd({
        subjectId,
        meditationType,
        sessionDuration,
      });
    }
    await stopECGStream();
    setSessionStartTime(null);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Heart Rate & ECG Monitor</h1>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="subjectId" className="text-gray-700 font-medium">
                Subject ID:
              </label>
              <input
                id="subjectId"
                type="text"
                value={subjectId}
                onChange={handleSubjectIdChange}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subject ID"
                required
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="meditationType" className="text-gray-700 font-medium">
                Meditation:
              </label>
              <select
                id="meditationType"
                value={meditationType}
                onChange={handleMeditationTypeChange} // Call the handler to update meditation type
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mindfulness">Mindful Practice yoga (dynamic)</option>
                <option value="meditation">Meditation (static)</option>
              </select>
            </div>

            <button
              onClick={handleConnect}
              disabled={!formValid}
              className={`${formValid ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"} text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 w-full mt-4`}
            >
              Connect to Polar H10
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex space-x-4">
              <button
                onClick={disconnect}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
              >
                Disconnect
              </button>

              {!isECGStreaming ? (
                <button
                  onClick={handleStartSession}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Start Session
                </button>
              ) : (
                <button
                  onClick={handleEndSession}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeartRateMonitor;