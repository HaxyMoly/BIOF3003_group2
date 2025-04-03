"use client"
import React, { useState } from 'react';

// Mediation Types
type MeditationType = 'mindfulness' | 'meditation';

interface MonitorControlsProps {
  isConnected: boolean;
  isECGStreaming: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  startECGStream: () => Promise<void>;
  stopECGStream: () => void;
  error: string | null;
  heartRate: number | null;
}

const HeartRateMonitor: React.FC<MonitorControlsProps> = ({
  isConnected, isECGStreaming, connect, disconnect,
  startECGStream, stopECGStream, error, heartRate
}) => {
  const [subjectId, setSubjectId] = useState<string>('');
  const [meditationType, setMeditationType] = useState<MeditationType>('mindfulness');
  const [formValid, setFormValid] = useState<boolean>(false);

  const validateForm = () => {
    setFormValid(subjectId.trim() !== '');
  };

  const handleSubjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubjectId(e.target.value);
    validateForm();
  };

  const handleMeditationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMeditationType(e.target.value as MeditationType);
  };

  const handleConnect = async () => {
    if (formValid) {
      console.log('Subject ID:', subjectId);
      console.log('Meditation Type:', meditationType);
      await connect();
    }
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
              <label htmlFor="subjectId" className="text-gray-700 font-medium">Subject ID:</label>
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
              <label htmlFor="meditationType" className="text-gray-700 font-medium">Meditation:</label>
              <select
                id="meditationType"
                value={meditationType}
                onChange={handleMeditationTypeChange}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mindfulness">Mindful Practice yoga (dynamic)</option>
                <option value="meditation">Meditation (static)</option>
              </select>
            </div>
            
            <button 
              onClick={handleConnect}
              disabled={!formValid}
              className={`${formValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 w-full mt-4`}
            >
              Connect to Polar H10
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-700">Heart Rate:</span>
              <span className="text-2xl font-bold text-blue-600">
                {heartRate ? `${heartRate} BPM` : 'Waiting for data...'}
              </span>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={disconnect}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
              >
                Disconnect
              </button>
              
              {!isECGStreaming ? (
                <button 
                  onClick={startECGStream}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Start ECG Stream
                </button>
              ) : (
                <button 
                  onClick={stopECGStream}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Stop ECG Stream
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