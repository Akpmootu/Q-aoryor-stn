import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { QueueState } from '../types';
import { speakThaiQueue, getThaiVoice } from '../lib/tts';

export default function DisplayScreen() {
  const [queue, setQueue] = useState<QueueState>({ prefix: 'W', numbers: { W: 1, O: 1 }, counter: "1" });
  const [time, setTime] = useState(new Date());
  const [isSoundActivated, setIsSoundActivated] = useState(false);
  const [manualQueue, setManualQueue] = useState("");
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const element = document.getElementById('slider-container');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize and sync state via localStorage
  useEffect(() => {
    const saved = localStorage.getItem('queueState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.prefix && parsed.numbers) {
          setQueue(parsed);
        } else {
          localStorage.removeItem('queueState');
        }
      } catch (e) {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'queueState' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.prefix && parsed.numbers) {
            setQueue(parsed);
          }
        } catch (e) {}
      }
      if (e.key === 'queueTrigger' && e.newValue) {
        const trigger = JSON.parse(e.newValue);
        if (trigger.action === 'play' && trigger.state) {
          setQueue(trigger.state);
          // Only play popups and sound if sound is activated on this tab
          if (isSoundActivated) {
            triggerPlayFeedback(trigger.state);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isSoundActivated]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sliderTimer = setInterval(() => {
      setCurrentSlide(prev => (prev % 9) + 1);
    }, 5000);
    return () => clearInterval(sliderTimer);
  }, []);

  const triggerPlayFeedback = (state: QueueState) => {
    const queueNumStr = String(state.numbers[state.prefix as keyof typeof state.numbers]);
    
    // Full screen popup for the called queue with no scrollbars and clear typography
    Swal.fire({
      title: `<div class="text-4xl md:text-5xl font-black text-blue-900 mb-2">ขอเชิญคิวที่</div>`,
      html: `
        <div class="text-[160px] md:text-[240px] font-black leading-none drop-shadow-lg flex items-center justify-center gap-2 select-none overflow-hidden my-2">
          <span class="text-blue-600 font-sans tracking-widest">${state.prefix}</span>
          <span class="text-slate-900 font-mono tracking-tight">${queueNumStr}</span>
        </div>
        <div class="text-4xl md:text-5xl font-bold text-blue-800 mt-4">ช่องบริการที่ ${state.counter}</div>
      `,
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      width: '90%',
      padding: '1.5em',
      backdrop: `rgba(255,255,255,0.95)`,
      customClass: {
        popup: 'rounded-3xl shadow-2xl border-4 border-blue-500 overflow-hidden',
        htmlContainer: 'overflow-hidden m-0'
      }
    });

    speakThaiQueue(state.prefix, state.numbers[state.prefix as keyof typeof state.numbers], state.counter);
  };

  const syncQueue = (newState: QueueState, playFeedback: boolean = false) => {
    setQueue(newState);
    localStorage.setItem('queueState', JSON.stringify(newState));
    
    if (playFeedback) {
      localStorage.setItem('queueTrigger', JSON.stringify({
        action: 'play',
        state: newState,
        timestamp: Date.now()
      }));
      // Also trigger locally for the admin doing it
      if (isSoundActivated) {
        triggerPlayFeedback(newState);
      }
    }
  };

  const handleActivateSound = () => {
    setIsSoundActivated(true);
    // Play a short initial audio from media to unlock browser autoplay context
    try {
      const audio = new Audio('/media/please.wav');
      audio.volume = 0.05;
      audio.play().catch(e => console.error("Autoplay unlock failed", e));
    } catch (e) {
      console.error("Autoplay unlock error", e);
    }
  };

  const handleNextQueue = () => {
    const currentNum = queue.numbers[queue.prefix as keyof typeof queue.numbers];
    syncQueue({ 
      ...queue, 
      numbers: { ...queue.numbers, [queue.prefix]: currentNum + 1 } 
    }, true);
  };

  const handleCallCurrent = () => {
    syncQueue(queue, true);
  };

  const handleRecall = () => {
    syncQueue(queue, true);
  };

  const handleReset = () => {
    Swal.fire({
      title: 'ยืนยันการรีเซ็ตคิว?',
      text: "ระบบจะเริ่มคิวใหม่ตั้งแต่หมายเลข 1 ทันที!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'รีเซ็ตเลย! 🗑️',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        syncQueue({ prefix: 'W', numbers: { W: 1, O: 1 }, counter: "1" }, false);
        Swal.fire({
          icon: 'success',
          title: 'รีเซ็ตคิวเรียบร้อย ✨',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleManualJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQueue || isNaN(Number(manualQueue))) {
      Swal.fire('ข้อผิดพลาด ❌', 'กรุณากรอกหมายเลขคิวเป็นตัวเลข', 'error');
      return;
    }
    syncQueue({ 
      ...queue, 
      numbers: { ...queue.numbers, [queue.prefix]: Number(manualQueue) } 
    }, true);
    setManualQueue("");
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-[#F8FAFC] font-sans text-[#1E293B] lg:overflow-hidden overflow-x-hidden relative">
      {/* Sound Activation overlay wrapper matching Bold Typography style */}
      {!isSoundActivated && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white rounded-3xl p-8 shadow-2xl border-2 border-blue-500 transform transition-all duration-300">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <i className="fa-solid fa-volume-high text-4xl animate-pulse"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 font-sans">เปิดการปฏิสัมพันธ์เสียงขัดข้อง</h3>
            <p className="text-slate-500 mb-6 leading-relaxed text-sm font-sans">
              เนื่องจากมาตรการความปลอดภัยของเบราว์เซอร์ กรุณาเปิดเสียงเพื่อฟังประกาศเรียกหมายเลขสะกดเป็นภาษาไทยและเพลิดเพลินกับสาระบันเทิง
            </p>
            <button 
              onClick={handleActivateSound}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-8 rounded-2xl transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95"
            >
              <i className="fa-solid fa-play"></i>
              เริ่มใช้งานระบบเรียกคิวพร้อมเสียง
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col md:flex-row items-center justify-between px-4 lg:px-10 py-5 bg-white border-b-2 border-slate-200 shadow-sm z-10 gap-4">
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 lg:gap-6">
          <div className="w-[60px] h-[60px] md:w-[88px] md:h-[88px] bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 overflow-hidden shrink-0">
            {/* Added logo placeholder */}
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/blue/white?text=Logo' }} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[22px] md:text-3xl font-black tracking-tight text-blue-900 mb-1 leading-none drop-shadow-sm">
              ระบบเรียกคิว สำหรับผู้เข้ารับบริการ
            </h1>
            <h2 className="text-[17px] md:text-[20px] font-bold text-slate-800 leading-tight">
              ศูนย์บริการผลิตภัณฑ์สุขภาพเบ็ดเสร็จ
            </h2>
            <p className="text-[13px] md:text-[14px] font-medium text-slate-500 tracking-wide mt-1 leading-tight">
              กลุ่มงานคุ้มครองผู้บริโภคและเภสัชสาธารณสุข สำนักงานสาธารณสุขจังหวัดสตูล
            </p>
          </div>
        </div>
        <div className="text-center md:text-right flex flex-col justify-center items-center md:items-end">
          <div className="text-base md:text-xl font-bold text-slate-600 mb-1">
            {time.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <div className="text-3xl md:text-5xl font-mono font-black text-blue-600 drop-shadow-sm tracking-tight leading-none">
            {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 lg:overflow-hidden relative">
        
        {/* Left Pane: Queue Display */}
        <section className="w-full lg:w-[60%] flex flex-col p-4 md:p-8 border-b lg:border-b-0 lg:border-r border-slate-200 justify-between bg-[#F8FAFC] min-h-[60vh] lg:h-full">
          <div className="flex-1 flex flex-col justify-center items-center relative py-10 lg:py-0">
            <span className="px-4 py-2 sm:px-6 sm:py-2 bg-blue-100 text-blue-700 rounded-full text-sm sm:text-lg font-bold tracking-widest mb-4 shadow-sm text-center">
              กำลังเรียกคิว / NOW SERVING
            </span>
            <h2 className="text-[150px] sm:text-[220px] lg:text-[360px] font-black leading-none text-slate-900 mb-0 drop-shadow-md text-center flex items-center justify-center gap-2 lg:gap-4 select-none">
              <span className="text-blue-600 font-sans tracking-widest">{queue.prefix}</span>
              <span className="font-mono tracking-tighter">{queue.numbers[queue.prefix as keyof typeof queue.numbers]}</span>
            </h2>
            <div className="h-2 w-32 sm:w-48 bg-blue-600 rounded-full mb-6 sm:mb-8 mt-2 sm:mt-4 shadow-sm"></div>
            <div className="text-xl sm:text-3xl lg:text-4xl font-bold text-slate-700 flex items-center gap-4 bg-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <span className="text-blue-800">ช่องบริการที่ {queue.counter}</span>
            </div>
          </div>

          {/* Scrolling Ticker at base of left column */}
          <div className="bg-blue-600 text-white rounded-2xl p-4 flex items-center overflow-hidden relative shadow-md shrink-0">
            <div className="bg-blue-700 h-full py-2 px-4 rounded-xl font-bold text-sm uppercase tracking-wider whitespace-nowrap mr-4 shadow-sm">
              ประกาศ / INFO:
            </div>
            <div className="flex-1 overflow-hidden relative h-6">
              <div className="absolute whitespace-nowrap text-white/95 font-medium text-base animate-[marquee_25s_linear_infinite]">
                &nbsp;&nbsp;&nbsp;&nbsp; ขอเชิญผู้รับบริการเตรียมเอกสารแสดงตนให้พร้อมก่อนเข้าสู่เคาน์เตอร์บริการเพื่อความสะดวกรวดเร็ว &nbsp;&nbsp;&bull;&nbsp;&nbsp; ยินดีต้อนรับสู่ระบบเรียกคิวอัจฉริยะ พัฒนาโดยกลุ่มงานสารสนเทศ ไอที &nbsp;&nbsp;&bull;&nbsp;&nbsp; ติดต่อสอบถามรายละเอียดเพิ่มเติมได้ตลอดช่วงเวลาทำการค่ะ &nbsp;&nbsp;&nbsp;&nbsp;
              </div>
            </div>
          </div>
        </section>

        {/* Right Pane: Video + Backoffice Sidebar controls in a beautiful non-scrollable layout */}
        <section className="w-full lg:w-[40%] flex flex-col bg-slate-50 lg:overflow-hidden min-h-[70vh] lg:h-full pb-6 lg:pb-0">
          
          {/* Top of Sidebar: Image Slider Area */}
          <div className="p-4 lg:p-6 pb-2 flex-1 min-h-[400px] lg:min-h-0 flex flex-col">
            <div 
              id="slider-container" 
              className={`flex-1 w-full ${isFullscreen ? 'bg-slate-950' : 'bg-white'} rounded-2xl shadow-sm overflow-hidden border border-slate-200 relative flex items-center justify-center group`}
            >
              <img 
                src={`/slider/${currentSlide}.png`} 
                alt="Slideshow" 
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-1000"
              />
              
              {/* Slider Navigation & Control Buttons */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentSlide(prev => (prev === 1 ? 9 : prev - 1))}
                    className="w-10 h-10 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm"
                    title="ย้อนกลับ"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button 
                    onClick={() => setCurrentSlide(prev => (prev % 9) + 1)}
                    className="w-10 h-10 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm"
                    title="ถัดไป"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                
                <button 
                  onClick={toggleFullscreen}
                  className="w-10 h-10 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm"
                  title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ"}
                >
                  <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom of Sidebar: Integrated Staff controls */}
          <div className="p-4 lg:p-6 pt-4 shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="bg-slate-900 rounded-2xl p-4 lg:p-5 text-white shadow-lg flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-user-gear text-emerald-400"></i>
                  <h4 className="text-white font-bold tracking-tight text-sm">แผงควบคุมฝ่ายพนักงาน</h4>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  ระบบเชื่อมต่อแล้ว
                </span>
              </div>

              {/* Queue Type & Counter Selection */}
              <div className="flex gap-4 mb-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">ชนิดคิว (Queue Type)</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                    value={queue.prefix}
                    onChange={(e) => syncQueue({ ...queue, prefix: e.target.value }, false)}
                  >
                    <option value="W">W - Walk in</option>
                    <option value="O">O - Online</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">จุดบริการ (Counter)</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                    value={queue.counter}
                    onChange={(e) => syncQueue({ ...queue, counter: e.target.value }, false)}
                  >
                    <option value="1">ช่องบริการ 1</option>
                    <option value="2">ช่องบริการ 2</option>
                  </select>
                </div>
              </div>

              {/* Core Call Action button */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button 
                  onClick={handleNextQueue}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg py-2 px-3 font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 active:scale-95 transition-transform"
                >
                  <span className="text-xs uppercase font-medium">เรียกลำดับถัดไป</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
                <button 
                  onClick={handleCallCurrent}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg py-2 px-3 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <span className="text-xs uppercase font-medium">กดเรียกซ้ำ</span>
                  <i className="fa-solid fa-bullhorn"></i>
                </button>
              </div>

              {/* Secondary operations: Recall trigger & System reset */}
              <div className="flex gap-2">
                <button 
                  onClick={handleRecall}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <i className="fa-solid fa-volume-high text-orange-400"></i>
                  ย้ำเสียง
                </button>
                <button 
                  onClick={handleReset}
                  className="flex-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-300 rounded-lg py-1.5 px-2 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                >
                  <i className="fa-solid fa-arrow-rotate-left"></i>
                  รีเซ็ตคิว
                </button>
              </div>

              {/* Form/Custom control jump */}
              <form onSubmit={handleManualJump} className="border-t border-slate-800 pt-2 mt-1">
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    name="manual_queue_sidebar" 
                    className="w-16 bg-slate-800 border border-slate-700 px-2 py-1 text-sm text-center text-white rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    placeholder="คิว" 
                    value={manualQueue}
                    onChange={(e) => setManualQueue(e.target.value)}
                    required 
                  />
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                    แทรกคิว
                  </button>
                </div>
              </form>

            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
