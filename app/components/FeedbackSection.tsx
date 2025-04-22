import React from 'react';

// Define the interface for the props
interface FeedbackSectionProps {
  heartRate: number | null; // Heart rate value (nullable)
  meditationType: 'meditation' | 'mindfulness'; // Meditation type (static or dynamic)
  isSessionActive: boolean; // Indicates whether the session is active
  sessionStarted: boolean; // Indicates whether the session has started at least once
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ heartRate, meditationType, isSessionActive, sessionStarted }) => {
  const getFeedback = () => {
    if (!sessionStarted) {
      return 'No heart rate data available.';
    }

    if (!isSessionActive) {
      return 'The session has ended. Well done!';
    }

    if (!heartRate) {
      return 'No heart rate data available.';
    }

    if (meditationType === 'meditation') {
      return heartRate < 60 ? 'Great job! Your heart rate is calm.' : 'Try to relax more.';
    } else if (meditationType === 'mindfulness') {
      return heartRate > 80 ? 'Good effort! Keep moving.' : 'Increase your intensity.';
    }

    return 'The session is in progress.';
  };

  return (
    <div className="space-y-4">
      <p className="text-lg text-gray-700">{getFeedback()}</p>
    </div>
  );
};

export default FeedbackSection;