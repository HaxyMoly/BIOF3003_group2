export const playAudio = (audioPath: string) => {
  console.log("Attempting to play audio:", audioPath);
  const audio = new Audio(audioPath);
  audio.play().catch((error) => {
    console.error("Error playing audio:", error);
  });
};