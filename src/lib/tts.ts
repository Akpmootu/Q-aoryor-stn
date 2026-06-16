export async function speakThaiQueue(number: number) {
  try {
    const numStr = number.toString();
    const digitWords = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const spelledNum = numStr.split('').map(d => digitWords[parseInt(d)]).join(' ');
    
    // Using commas to add natural pauses for the TTS engine
    const text = `ขอเชิญคิวที่, ${spelledNum}, รับบริการ, ที่ช่องบริการ 1, ค่ะ`;
    
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.audio) {
      // Decode base64 to binary and play as 24kHz PCM? 
      // Wait, Gemini TTS returns raw PCM (16-bit little-endian). 
      // It's much easier to decode raw PCM using AudioContext!
      playRawAudioPcm(data.audio);
    }
  } catch (error) {
    console.error("Error with Gemini TTS, falling back to Web Speech API:", error);
    fallbackToWebSpeech(number);
  }
}

// Global audio context
let audioCtx: AudioContext | null = null;

function playRawAudioPcm(base64Data: string) {
  if (!audioCtx) {
    // Gemini 3.1 Flash TTS model outputs 24kHz audio
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass({ sampleRate: 24000 });
  }

  // Convert base64 to Float32Array directly
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Convert 16-bit PCM integer to 32-bit float for Web Audio API
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    // Standard conversion: normalize by max 16-bit int
    float32[i] = pcm16[i] / 32768.0;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
}

function fallbackToWebSpeech(number: number) {
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
