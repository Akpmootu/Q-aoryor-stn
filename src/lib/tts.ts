export function getThaiVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  
  // 1. Exact match for Thai language code
  let thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang === 'th_TH');
  
  // 2. Fallback to startsWith or name includes "thai"
  if (!thaiVoice) {
    thaiVoice = voices.find(v => v.lang.toLowerCase().startsWith('th') || v.name.toLowerCase().includes('thai'));
  }
  
  return thaiVoice || null;
}

export function speakThaiQueue(prefix: string, number: number, counter: string) {
  const file1 = '/media/please.wav';
  const file2 = `/media/${prefix}${number}.wav`;
  const file3 = `/media/counter${counter}.wav`;

  const playSequence = async () => {
    try {
      const playAudio = (src: string) => {
        return new Promise<void>((resolve, reject) => {
          const audio = new Audio(src);
          audio.onended = () => resolve();
          audio.onerror = (e) => reject(`Failed to load or play ${src}`);
          audio.play().catch(reject);
        });
      };

      await playAudio(file1);
      await playAudio(file2);
      await playAudio(file3);
    } catch (e) {
      console.error("Audio sequence playback failed:", e);
    }
  };

  playSequence();
}

