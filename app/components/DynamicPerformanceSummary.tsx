import React, { useMemo, useEffect, useState } from 'react';

interface SessionData {
  heartRate: number;
  hrv: number;
  respiratoryRate: number;
  meditationType: 'meditation' | 'mindfulness';
  sessionDuration: number;
}

interface DynamicPerformanceSummaryProps {
  currentSession: SessionData;
  previousSession: SessionData | null;
}

const DynamicPerformanceSummary: React.FC<DynamicPerformanceSummaryProps> = ({ 
  currentSession, 
  previousSession 
}) => {
  // 使用useState和useEffect来固定随机生成的内容
  const [fixedEncouragement, setFixedEncouragement] = useState<string>("");
  const [fixedImprovement, setFixedImprovement] = useState<string>("");
  const [fixedComparisonText, setFixedComparisonText] = useState<string>("");
  const [fixedSessionDuration, setFixedSessionDuration] = useState<string>("");
  
  // Format duration as minutes and seconds
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Generate random encouragement messages
  const getRandomEncouragement = (): string => {
    const encouragements = [
      "Great job on completing your session! Your dedication is inspiring.",
      "Excellent work! Each session brings you closer to your wellness goals.",
      "Fantastic effort today! Your commitment to mindfulness is admirable.",
      "Well done! You're building a powerful meditation practice.",
      "Amazing session! Your consistency is key to long-term benefits.",
      "Impressive work! Your mind and body thank you for this practice.",
      "Wonderful job! You're creating positive habits for better wellbeing.",
      "Excellent session! Your dedication to self-care is paying off."
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  // Generate random improvement suggestions based on meditation type
  const getRandomImprovement = (): string => {
    const meditationImprovements = [
      "Try extending your session length by 2 minutes next time.",
      "Consider practicing at the same time each day for better consistency.",
      "Focus on deeper, slower breathing in your next session.",
      "Try adding a body scan technique to deepen your practice.",
      "Consider using a guided meditation for your next session.",
      "Try meditating in a different environment next time."
    ];
    
    const mindfulnessImprovements = [
      "Try incorporating more movement variations in your next session.",
      "Consider focusing on one specific body part during your next practice.",
      "Try alternating between faster and slower movements.",
      "Consider adding brief pauses between movements to increase awareness.",
      "Try practicing in a different environment next time.",
      "Consider adding breath coordination with your movements."
    ];
    
    const improvements = currentSession.meditationType === 'meditation' 
      ? meditationImprovements 
      : mindfulnessImprovements;
      
    return improvements[Math.floor(Math.random() * improvements.length)];
  };

  // Calculate comparisons with previous session
  const comparisons = useMemo(() => {
    if (!previousSession) return null;
    
    const heartRateDiff = currentSession.heartRate - previousSession.heartRate;
    const hrvDiff = currentSession.hrv - previousSession.hrv;
    const respiratoryRateDiff = currentSession.respiratoryRate - previousSession.respiratoryRate;
    const durationDiff = currentSession.sessionDuration - previousSession.sessionDuration;
    
    return {
      heartRateDiff,
      hrvDiff,
      respiratoryRateDiff,
      durationDiff
    };
  }, [currentSession, previousSession]);

  // Generate comparison text
  const generateComparisonText = () => {
    if (!comparisons) return "This is your first recorded session. Great start!";
    
    const { heartRateDiff, hrvDiff, respiratoryRateDiff, durationDiff } = comparisons;
    
    let comparisonText = "Compared to your last session: ";
    
    // Heart rate comparison
    if (currentSession.meditationType === 'meditation') {
      // For meditation, lower heart rate is better
      comparisonText += heartRateDiff < 0 
        ? `Your heart rate decreased by ${Math.abs(heartRateDiff)} BPM (good for relaxation). `
        : heartRateDiff > 0 
          ? `Your heart rate increased by ${heartRateDiff} BPM. `
          : `Your heart rate remained the same. `;
    } else {
      // For mindfulness, higher heart rate might be better
      comparisonText += heartRateDiff > 0 
        ? `Your heart rate increased by ${heartRateDiff} BPM (good for active mindfulness). `
        : heartRateDiff < 0 
          ? `Your heart rate decreased by ${Math.abs(heartRateDiff)} BPM. `
          : `Your heart rate remained the same. `;
    }
    
    // HRV comparison (higher is generally better)
    comparisonText += hrvDiff > 0 
      ? `Your HRV improved by ${hrvDiff.toFixed(1)} ms (indicating better autonomic balance and lower stress levels). `
      : hrvDiff < 0 
        ? `Your HRV decreased by ${Math.abs(hrvDiff).toFixed(1)} ms (may indicate increased stress or need for recovery). `
        : `Your HRV remained stable (suggesting consistent autonomic nervous system state). `;
    
    // Duration comparison
    if (durationDiff > 0) {
      comparisonText += `You practiced ${formatDuration(durationDiff)} longer this time!`;
    } else if (durationDiff < 0) {
      comparisonText += `Your session was ${formatDuration(Math.abs(durationDiff))} shorter this time.`;
    } else {
      comparisonText += `Your session duration was the same.`;
    }
    
    return comparisonText;
  };

  // 在组件挂载时固定所有随机生成的内容
  useEffect(() => {
    setFixedEncouragement(getRandomEncouragement());
    setFixedImprovement(getRandomImprovement());
    setFixedComparisonText(generateComparisonText());
    setFixedSessionDuration(formatDuration(currentSession.sessionDuration));
  }, []); // 空依赖数组确保只在组件挂载时执行一次

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-700 mb-4">Session Complete! 🎉</h2>
      
      {/* Encouragement */}
      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
        <p className="text-lg font-medium text-green-800">{fixedEncouragement || "Great job on completing your session!"}</p>
      </div>
      
      {/* Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">Session Stats</h3>
          <ul className="space-y-2">
            <li><span className="font-medium">Type:</span> {currentSession.meditationType.charAt(0).toUpperCase() + currentSession.meditationType.slice(1)}</li>
            <li><span className="font-medium">Duration:</span> {fixedSessionDuration || formatDuration(currentSession.sessionDuration)}</li>
            <li><span className="font-medium">Heart Rate:</span> {currentSession.heartRate} BPM</li>
            <li><span className="font-medium">HRV:</span> {currentSession.hrv} ms</li>
            <li><span className="font-medium">Respiratory Rate:</span> {currentSession.respiratoryRate} breaths/min</li>
          </ul>
        </div>
        
        {/* Comparison with Previous Session */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">Progress Tracking</h3>
          <p className="text-sm text-purple-900">{fixedComparisonText || "Analyzing your progress..."}</p>
        </div>
      </div>
      
      {/* Improvement Suggestion */}
      <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
        <h3 className="font-bold text-amber-800 mb-1">For Next Time:</h3>
        <p className="text-amber-900">{fixedImprovement || "Continue your practice consistently."}</p>
      </div>
    </div>
  );
};

export default DynamicPerformanceSummary;