export const playSound = (soundName) => {
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    // Some browsers block audio before user interaction
    audio.play().catch(e => console.warn(`Audio playback blocked for ${soundName}`, e));
  } catch (e) {
    console.error('Audio error', e);
  }
};

export const playSteps = (stepsCount, durationPerStepMs = 200, finalSound = null) => {
  if (stepsCount <= 0) return;
  let count = 0;

  const interval = setInterval(() => {
    count++;
    
    if (count === stepsCount && finalSound) {
      playSound(finalSound);
    } else {
      playSound('token_step');
    }
    
    if (count >= stepsCount) {
      clearInterval(interval);
    }
  }, durationPerStepMs);
};
