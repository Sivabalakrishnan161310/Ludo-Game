const audioCache = {};
const soundsList = [
  'dice_roll', 'token_step', 'token_kill', 'safe_zone', 
  'token_home', 'dude_oorum_blood', 'token_unlock'
];

// Preload all sounds immediately into memory when the app loads
if (typeof window !== 'undefined') {
  soundsList.forEach(sound => {
    const audio = new Audio(`/sounds/${sound}.mp3`);
    audio.preload = 'auto';
    audioCache[sound] = audio;
  });
}

export const playSound = (soundName) => {
  try {
    let audio = audioCache[soundName];
    if (!audio) {
      audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.preload = 'auto';
      audioCache[soundName] = audio;
    }
    
    // Clone the preloaded node so it plays instantly without waiting for a new network request
    // Cloning also allows the exact same sound to overlap itself (like rapid steps)
    const clone = audio.cloneNode();
    clone.play().catch(e => console.warn(`Audio playback blocked for ${soundName}`, e));
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
