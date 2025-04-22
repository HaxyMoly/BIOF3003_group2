"use client";
import React, { useState, useEffect } from "react";
import { useHeartRateSensor } from "./hooks/useHeartRateSensor";
import { useRespiratoryRate } from "./hooks/useRespiratoryRate";
import HeartRateMonitor from "./components/HeartRateMonitor";
import ECGChart from "./components/ECGChart";
import HRVChart from "./components/HRVChart";
import FeedbackSection from "./components/FeedbackSection";
import PerformanceSummary from "./components/PerformanceSummary";
import AudioReminder from "./components/AudioReminder";
import SessionHistory from "./components/SessionHistory";
import { useSessionData } from "./hooks/useSessionData";
import { playBackgroundMusic, stopBackgroundMusic } from "./utils/backgroundMusic";

export default function Home() {
  const {
    connect,
    disconnect: disconnectSensor,
    startECGStream,
    stopECGStream,
    heartRate,
    ecgData,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const { respiratoryRate } = useRespiratoryRate(ecgData);
  const { saveSession } = useSessionData();

  const [finalHeartRate, setFinalHeartRate] = useState<number | null>(null);
  const [currentHRV, setCurrentHRV] = useState<number | null>(null);
  const [finalHRV, setFinalHRV] = useState<number | null>(null);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [selectedMeditationType, setSelectedMeditationType] = useState<'meditation' | 'mindfulness'>('mindfulness');
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null); // State for background music
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false); // Track music state
  const [subjectId, setSubjectId] = useState<string>("");
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState<number>(0);
  // 修改初始状态，默认显示历史记录
  const [showHistory, setShowHistory] = useState<boolean>(true);

  const handleStartSession = async () => {
    setSessionStarted(true);
    setSessionStartTime(Date.now());
    await startECGStream();
  };

  // 在HeartRateMonitor组件中添加onSubjectIdChange属性
  // 删除这段错误放置的代码
  // <HeartRateMonitor
  //   isConnected={isConnected}
  //   isECGStreaming={isECGStreaming}
  //   connect={connect}
  //   disconnect={disconnectSensor}
  //   startECGStream={handleStartSession}
  //   stopECGStream={stopECGStream}
  //   error={error}
  //   heartRate={heartRate}
  //   onMeditationTypeChange={setSelectedMeditationType}
  //   onSubjectIdChange={setSubjectId} // 新增：直接从HeartRateMonitor获取Subject ID
  // />

  const handleEndSession = async () => {
    setFinalHRV(currentHRV);
    setFinalHeartRate(heartRate);
    
    // Calculate session duration in seconds
    if (sessionStartTime) {
      const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
      
      // 不再从DOM获取subjectId，而是直接使用state中的值
      if (subjectId) {
        console.log("Page: 准备保存会话数据", {
          subjectId: subjectId,
          meditationType: selectedMeditationType,
          heartRate: heartRate || 0,
          hrv: currentHRV || 0,
          respiratoryRate: respiratoryRate || 0,
          sessionDuration: sessionDuration,
        });
        
        try {
          // Save session data to MongoDB
          await saveSession({
            subjectId: subjectId,
            meditationType: selectedMeditationType,
            heartRate: heartRate || 0,
            hrv: currentHRV || 0,
            respiratoryRate: respiratoryRate || 0,
            sessionDuration: sessionDuration,
          });
          console.log("Page: 会话数据保存成功");
        } catch (error) {
          console.error("Page: 会话数据保存失败", error);
        }
        
        // Show history after saving and trigger refresh
        setShowHistory(true);
        setHistoryRefreshTrigger(Date.now());
        console.log("Page: 已触发历史数据刷新", Date.now());
      } else {
        console.warn("Page: subjectId为空，无法保存会话数据");
      }
    } else {
      console.warn("Page: sessionStartTime未设置，无法计算会话时长");
    }
    
    stopECGStream();
    stopBackgroundMusic(backgroundMusic); // Stop music when session ends
    setIsMusicPlaying(false);
  };

  // 修改handleDisconnect函数，不再隐藏历史记录
  const handleDisconnect = () => {
    disconnectSensor();
    setSessionStarted(false);
    setFinalHeartRate(null);
    setFinalHRV(null);
    // 移除了setShowHistory(false)这一行
    stopBackgroundMusic(backgroundMusic); // Stop music when disconnected
    setIsMusicPlaying(false);
  };

  // Toggle background music
  const toggleBackgroundMusic = () => {
    if (isMusicPlaying) {
      // Stop the music
      stopBackgroundMusic(backgroundMusic);
      setIsMusicPlaying(false); // Update state to reflect that music is stopped
    } else {
      // Start the music
      const audio = playBackgroundMusic("/audio/background_music.mp3"); // Replace with your file path
      setBackgroundMusic(audio); // Store the Audio object
      setIsMusicPlaying(true); // Update state to reflect that music is playing
    }
  };
  
  // Cleanup function to stop music when the component unmounts
  useEffect(() => {
    return () => {
      stopBackgroundMusic(backgroundMusic);
    };
  }, [backgroundMusic]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100 p-8">
      {/* Heart Rate Monitor Section */}
      <HeartRateMonitor
        isConnected={isConnected}
        isECGStreaming={isECGStreaming}
        connect={connect}
        disconnect={handleDisconnect}
        startECGStream={handleStartSession}
        stopECGStream={handleEndSession}
        error={error}
        heartRate={heartRate}
        onMeditationTypeChange={setSelectedMeditationType}
        onSubjectIdChange={setSubjectId} // 在这里添加onSubjectIdChange属性
      />

      {/* Audio Reminder Component */}
      {isConnected && (
        <AudioReminder
          heartRate={heartRate}
          meditationType={selectedMeditationType}
          isSessionActive={isECGStreaming}
        />
      )}

      {/* Session Timer and Mini Player */}
      {isConnected && (
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner flex justify-between items-center">
          {/* Session Timer (Left) */}
          <div className="flex-1">
            <PerformanceSummary isSessionActive={isECGStreaming} showOnlyTimer />
          </div>

          {/* Mini Player Button (Right) */}
          <button
          onClick={toggleBackgroundMusic}
          className={`px-4 py-2 rounded-full font-bold text-white transition duration-300 ease-in-out transform hover:scale-105 ${
          isMusicPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
          }`}
          >
          {isMusicPlaying ? "Stop Music" : "Play Music"}
          </button>
        </div>
      )}

      {/* Heart Rate, HRV, and Respiratory Rate Display */}
      {isConnected && (
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-8">
            {/* Heart Rate */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">Heart Rate</h2>
              <p className="text-2xl font-bold text-blue-600">
                {isConnected
                  ? isECGStreaming
                    ? heartRate !== null
                      ? `${heartRate} BPM`
                      : "Calculating..."
                    : finalHeartRate !== null
                    ? `${finalHeartRate} BPM`
                    : "Waiting for data..."
                  : "Waiting for data..."}
              </p>
            </div>

            {/* Current HRV */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">Current HRV (SDNN)</h2>
              <p className="text-2xl font-bold text-green-600">
                {isECGStreaming
                  ? currentHRV !== null
                    ? `${currentHRV} ms`
                    : "Calculating..."
                  : finalHRV !== null
                  ? `${finalHRV} ms`
                  : "Waiting for data..."}
              </p>
            </div>

            {/* Respiratory Rate */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">Respiratory Rate</h2>
              <p className="text-2xl font-bold text-purple-600">
                {isECGStreaming
                  ? respiratoryRate !== null
                    ? `${respiratoryRate} breaths/min`
                    : "Calculating..."
                  : "Waiting for data..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {isConnected && (
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Meditation Feedback: {selectedMeditationType.charAt(0).toUpperCase() + selectedMeditationType.slice(1)}
          </h2>
          <FeedbackSection
            heartRate={heartRate}
            meditationType={selectedMeditationType}
            isSessionActive={isECGStreaming}
            sessionStarted={sessionStarted}
          />
        </div>
      )}

      {/* ECG Chart Section */}
      {isConnected && (
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Real-Time ECG Data</h2>
          <ECGChart ecgData={ecgData} />
        </div>
      )}

      {/* HRV Chart Section */}
      {isConnected && (
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Real-Time HRV Chart</h2>
          <HRVChart
            ecgData={ecgData}
            onHRVUpdate={(hrv) => setCurrentHRV(hrv)}
          />
        </div>
      )}
      
      {/* Session History Section - 始终显示，不再有条件判断 */}
      <div className="max-w-4xl mx-auto mt-8">
        <SessionHistory 
          subjectId={subjectId} 
          refreshTrigger={historyRefreshTrigger} 
        />
      </div>
    </div>
  );
}