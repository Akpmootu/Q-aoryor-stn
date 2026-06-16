import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import { QueueState } from '../types';
import { speakThaiQueue } from '../lib/tts';

export default function DisplayScreen() {
  const [queue, setQueue] = useState<QueueState>({ currentNumber: 1, lastCalledNumber: 0, counter: "1" });
  const [time, setTime] = useState(new Date());
  const [isSoundActivated, setIsSoundActivated] = useState(false);
  const [manualQueue, setManualQueue] = useState("");
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io();
    socketRef.current = socket;

    socket.on("queue:state", (state: QueueState) => {
      setQueue(state);
    });

    socket.on("queue:play", (state: QueueState) => {
      setQueue(state);
      // Ensure we hit play queue text only if sound is activated by user interaction
      if (isSoundActivated) {
        speakThaiQueue(state.currentNumber);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isSoundActivated]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActivateSound = () => {
    setIsSoundActivated(true);
    // Speak welcome/test voice to trigger initial speech audio synthesis queue
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const startUtterance = new SpeechSynthesisUtterance("ระบบเสียงเรียกคิวเปิดใช้งานแล้วค่ะ");
        startUtterance.lang = "th-TH";
        window.speechSynthesis.speak(startUtterance);
      } catch (e) {
        console.error("Welcome speech failed", e);
      }
    }
  };

  const handleNextQueue = () => {
    if (socketRef.current) {
      socketRef.current.emit("queue:next", { counter: "1" });
      Swal.fire({
        icon: 'success',
        title: 'เรียกคิวถัดไปสำเร็จ 🎉',
        text: `คิวเลขที่ ${queue.currentNumber + 1} ไปที่ช่องบริการ 1`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const handleCallCurrent = () => {
    if (socketRef.current) {
      socketRef.current.emit("queue:call", { counter: "1" });
      Swal.fire({
        icon: 'info',
        title: 'ประกาศเรียกคิว 📢',
        text: `กำลังเรียกคิว ${queue.currentNumber} ซ้ำตัวเตือน`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const handleRecall = () => {
    if (socketRef.current) {
      socketRef.current.emit("queue:recall");
      Swal.fire({
        icon: 'warning',
        title: 'เรียกคิวซ้ำ 🔄',
        text: `เพลย์เสียงเรียกคิวปัจจุบันอีกครั้ง`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
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
        if (socketRef.current) {
          socketRef.current.emit("queue:reset");
        }
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
    if (socketRef.current) {
      socketRef.current.emit("queue:set", { number: Number(manualQueue), counter: "1" });
      Swal.fire({
        icon: 'success',
        title: 'แทรกคิวสำเร็จ ✅',
        text: `เปลี่ยนไปที่หมายเลข ${manualQueue}`,
        timer: 1500,
        showConfirmButton: false
      });
      setManualQueue("");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] font-sans text-[#1E293B] overflow-hidden relative">
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
      <header className="flex items-center justify-between px-10 py-5 bg-white border-b-2 border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <div className="w-[88px] h-[88px] bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 overflow-hidden shrink-0">
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
        <div className="text-right flex flex-col justify-center items-end">
          <div className="text-lg md:text-xl font-bold text-slate-600 mb-1">
            {time.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <div className="text-4xl md:text-5xl font-mono font-black text-blue-600 drop-shadow-sm tracking-tight leading-none">
            {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        
        {/* Left Pane: Queue Display */}
        <section className="w-full lg:w-[60%] flex flex-col p-8 border-b lg:border-b-0 lg:border-r border-slate-200 justify-between bg-[#F8FAFC]">
          <div className="flex-1 flex flex-col justify-center items-center">
            <span className="px-6 py-2 bg-blue-100 text-blue-700 rounded-full text-lg font-bold tracking-widest mb-4 shadow-sm">
              กำลังเรียกคิว / NOW SERVING
            </span>
            <h2 className="text-[160px] sm:text-[220px] lg:text-[280px] font-black leading-none tracking-tighter text-slate-900 mb-0 drop-shadow-md">
              {queue.currentNumber}
            </h2>
            <div className="h-2 w-48 bg-blue-600 rounded-full mb-8 mt-4 shadow-sm"></div>
            <div className="text-3xl sm:text-4xl font-bold text-slate-700 flex items-center gap-4 bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-blue-800">ช่องบริการที่ 1</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">COUNTER 1</span>
            </div>
          </div>

          {/* Scrolling Ticker at base of left column */}
          <div className="bg-blue-600 text-white rounded-2xl p-4 flex items-center overflow-hidden relative shadow-md">
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

        {/* Right Pane: Video + Backoffice Sidebar controls in a beautiful scrollable layout */}
        <section className="w-full lg:w-[40%] flex flex-col bg-white overflow-y-auto">
          
          {/* Top of Sidebar: Video Area (Now Facebook Embed) */}
          <div className="p-6 pb-2">
            <div className="relative aspect-[4/5] bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <iframe 
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fsatunfda&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId" 
                width="100%" 
                height="100%" 
                style={{ border: 'none', overflow: 'hidden' }} 
                scrolling="no" 
                frameBorder="0" 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              ></iframe>
            </div>
          </div>

          {/* Bottom of Sidebar: Integrated Staff controls */}
          <div className="flex-1 p-6 flex flex-col gap-4">
            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-user-gear text-emerald-400"></i>
                  <h4 className="text-white font-bold tracking-tight text-sm">แผงควบคุมฝ่ายพนักงาน</h4>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  ระบบเชื่อมต่อแล้ว
                </span>
              </div>

              {/* Core Call Action button */}
              <div className="flex gap-2">
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
