export function speakThaiQueue(number: number, counter: string) {
  if ('speechSynthesis' in window) {
    try {
      // Cancel previous speaking to prevent overlapping or delays
      window.speechSynthesis.cancel();
      
      const text = `ขอเชิญหมายเลข ${number} ที่ช่องบริการ ${counter} ค่ะ`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 0.8; // Slightly slower for clarity
      utterance.pitch = 1;
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech Synthesis error caught:", error);
    }
  } else {
    console.warn("Text-to-speech not supported in this browser.");
  }
}
