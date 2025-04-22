// utils/backgroundMusic.ts
export const playBackgroundMusic = (audioPath: string) => {
  console.log("Attempting to play background music:", audioPath);
  const audio = new Audio(audioPath);
  audio.loop = true;
  audio.volume = 0.5;

  audio.play().catch((error) => {
    console.error("Error playing background music:", error);
  });

  return audio;
  };
  
  export const stopBackgroundMusic = (audio: HTMLAudioElement | null) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0; // Reset playback position
    }
  };