"use client";
import React, { useState } from "react";
import { useHeartRateSensor } from "./hooks/useHeartRateSensor";
import { useRespiratoryRate } from "./hooks/useRespiratoryRate";
import HeartRateMonitor from "./components/HeartRateMonitor";
import ECGChart from "./components/ECGChart";
import HRVChart from "./components/HRVChart";
import FeedbackSection from "./components/FeedbackSection";
import PerformanceSummary from "./components/PerformanceSummary";
import AudioReminder from "./components/AudioReminder";
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

  const [finalHeartRate, setFinalHeartRate] = useState<number | null>(null);
  const [currentHRV, setCurrentHRV] = useState<number | null>(null);
  const [finalHRV, setFinalHRV] = useState<number | null>(null);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [selectedMeditationType, setSelectedMeditationType] = useState<'meditation' | 'mindfulness'>('mindfulness');
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null); // State for background music
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false); // Track music state

  const handleStartSession = async () => {
    setSessionStarted(true);
    await startECGStream();
  };

  const handleEndSession = () => {
    setFinalHRV(currentHRV);
    setFinalHeartRate(heartRate);
    stopECGStream();
    stopBackgroundMusic(backgroundMusic); // Stop music when session ends
    setIsMusicPlaying(false);
  };

  const handleDisconnect = () => {
    disconnectSensor();
    setSessionStarted(false);
    setFinalHeartRate(null);
    setFinalHRV(null);
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
  React.useEffect(() => {
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
    </div>
  );
}