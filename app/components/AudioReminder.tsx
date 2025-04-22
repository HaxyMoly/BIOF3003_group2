"use client";
import React, { useEffect, useState } from "react";
import { playAudio } from "../utils/audioPlayer";

interface AudioReminderProps {
  heartRate: number | null; // Current heart rate
  meditationType: "meditation" | "mindfulness"; // Meditation type
  isSessionActive: boolean; // Indicates if the session is active
}

const AudioReminder: React.FC<AudioReminderProps> = ({ heartRate, meditationType, isSessionActive }) => {
  const [lastReminderTime, setLastReminderTime] = useState<number>(Date.now()); // Track the last reminder time

  // Trigger audio reminders based on heart rate
  useEffect(() => {
    if (!isSessionActive || !heartRate) return;

    const now = Date.now();
    const cooldownPeriod = 30000; // Minimum time between reminders (30 seconds)

    // Check if enough time has passed since the last reminder
    if (now - lastReminderTime < cooldownPeriod) return;

    if (meditationType === "meditation") {
      // Static Meditation Logic
      if (heartRate > 80) {
        // High Heart Rate
        playAudio("/audio/relax_and_breathe.m4a");
        console.log("Reminder: Relax and breathe.");
        setLastReminderTime(now);
      } else if (heartRate < 60) {
        // Low Heart Rate
        playAudio("/audio/focus_on_your_breath.m4a");
        console.log("Reminder: Focus on your breath.");
        setLastReminderTime(now);
      }
    } else if (meditationType === "mindfulness") {
      // Dynamic Mindfulness Logic
      if (heartRate > 110) {
        // High Heart Rate
        playAudio("/audio/stay_calm.m4a");
        console.log("Reminder: Stay calm and centered.");
        setLastReminderTime(now);
      } else if (heartRate < 80) {
        // Low Heart Rate
        playAudio("/audio/increase_intensity.m4a");
        console.log("Reminder: Increase intensity.");
        setLastReminderTime(now);
      }
    }
  }, [heartRate, meditationType, isSessionActive, lastReminderTime]);

  return null; // This component does not render anything visually
};

export default AudioReminder;