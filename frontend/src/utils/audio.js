const audioCache = {};
const soundsList = [
  'dice_roll', 'token_step', 'token_kill', 'safe_zone', 
  'token_home', 'dude_oorum_blood', 'token_unlock'
];

let audioCtx = null;

// Initialize Web Audio API
const initAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
};

// Preload all sounds as AudioBuffers for zero-latency playback
if (typeof window !== 'undefined') {
  initAudioContext();
  soundsList.forEach(sound => {
    fetch(`/sounds/${sound}.mp3`)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx ? audioCtx.decodeAudioData(arrayBuffer) : null)
      .then(audioBuffer => {
        if (audioBuffer) {
          audioCache[sound] = audioBuffer;
        } else {
          // Fallback if decode fails or audioCtx is missing
          const audio = new Audio(`/sounds/${sound}.mp3`);
          audio.preload = 'auto';
          audioCache[sound] = audio;
        }
      })
      .catch(e => {
        console.warn(`Web Audio fetch failed for ${sound}, falling back to HTML5 Audio`, e);
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.preload = 'auto';
        audioCache[sound] = audio;
      });
  });
}

export const playSound = (soundName) => {
  try {
    initAudioContext();
    const cached = audioCache[soundName];
    
    // Resume AudioContext if it was suspended (browser autoplay policy)
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (cached instanceof AudioBuffer) {
      // Web Audio API playback (Zero Latency)
      const source = audioCtx.createBufferSource();
      source.buffer = cached;
      source.connect(audioCtx.destination);
      source.start(0);
    } else if (cached instanceof Audio) {
      // HTML5 Fallback
      const clone = cached.cloneNode();
      clone.play().catch(e => console.warn(`Audio playback blocked for ${soundName}`, e));
    } else {
      // Not loaded yet, fallback to instant creation
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.play().catch(e => console.warn(`Audio playback blocked for ${soundName}`, e));
    }
  } catch (e) {
    console.error('Audio error', e);
  }
};

export const playSteps = (stepsCount, durationPerStepMs = 200, finalSound = null) => {
  if (stepsCount <= 0) return;

  initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx ? audioCtx.currentTime : 0;
  
  for (let i = 1; i <= stepsCount; i++) {
    const isLast = i === stepsCount;
    const soundName = (isLast && finalSound) ? finalSound : 'token_step';
    const delaySecs = (i * durationPerStepMs) / 1000.0;
    
    if (audioCtx && audioCache[soundName] instanceof AudioBuffer) {
      // Schedule exactly on the hardware clock
      const source = audioCtx.createBufferSource();
      source.buffer = audioCache[soundName];
      source.connect(audioCtx.destination);
      source.start(now + delaySecs);
    } else {
      // Fallback to setTimeout if Web Audio is unavailable or sound is not decoded yet
      setTimeout(() => playSound(soundName), i * durationPerStepMs);
    }
  }
};
