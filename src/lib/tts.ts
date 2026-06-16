export function speakThaiQueue(number: number) {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      
      const numStr = number.toString();
      const digitWords = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
      const spelledNum = numStr.split('').map(d => digitWords[parseInt(d)]).join(' ');
      
      const text = `ขอเชิญคิวที่, ${spelledNum}, รับบริการ, ที่ช่องบริการ 1, ค่ะ`;
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 0.8; 
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.includes('th'));
        if (thaiVoice) {
          utterance.voice = thaiVoice;
        }
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
      } else {
        setVoiceAndSpeak();
      }
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  }
}
