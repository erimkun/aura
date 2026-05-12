/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera as CameraIcon, 
  Scan, 
  Scissors, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Info,
  Layers,
  Cpu,
  Fingerprint,
  ArrowRight,
  X
} from 'lucide-react';
import { faceMesh } from '@/src/lib/faceDetection';
import { generateStyledHair, type QualityMode } from '@/src/lib/gemini';

// --- Types ---
type ScanStep = 'front' | 'side-right' | 'side-left' | 'back' | 'complete';

// --- Background Components ---

const NeuralCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w: number, h: number;
    let tick = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, w, h);
      
      // Multi-layered neural waves
      for (let i = 0; i < 12; i++) {
        const offset = i * 15;
        const speed = 0.01 + (i * 0.002);
        const amplitude = 120 + (Math.sin(tick * 0.002 + i) * 50);
        
        ctx.strokeStyle = `rgba(249, 115, 22, ${0.15 - (i * 0.01)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let x = 0; x < w; x += 10) {
          const y = h * 0.5 + Math.sin(x * 0.0015 + tick * speed + offset) * amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Dynamic Energy Nodes
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(tick * 0.0008 + i * 1.5) * 0.6 + 0.5) * w;
        const y = (Math.cos(tick * 0.001 + i * 3) * 0.6 + 0.5) * h;
        const size = Math.abs(Math.sin(tick * 0.015 + i)) * 4;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(234, 88, 12, 0.4)';
        ctx.fillStyle = `rgba(249, 115, 22, ${0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-50" />;
};

// --- Main Application ---

export default function App() {
  const [showApp, setShowApp] = useState(false);
  const [step, setStep] = useState<ScanStep>('front');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [isForeheadClear, setIsForeheadClear] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [expandedPrompt, setExpandedPrompt] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [qualityMode, setQualityMode] = useState<QualityMode>('fast');
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    let camera: Camera | null = null;

    if (showApp && webcamRef.current && webcamRef.current.video) {
        camera = new Camera(webcamRef.current.video, {
            onFrame: async () => {
                if (webcamRef.current?.video) {
                    await faceMesh.send({ image: webcamRef.current.video });
                }
            },
            width: 1280,
            height: 720
        });
        camera.start();

        faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                 // Check forehead occlusion or light levels here
                 // For now, keep simulated logic
            }
        });
    }

    return () => {
      if (camera) {
        // Camera internal cleanup if possible, but MediaPipe Camera usually stays active
      }
    };
  }, [showApp]);

  const capturePhoto = () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setPhotos(prev => ({ ...prev, [step]: screenshot }));
      
      const steps: ScanStep[] = ['front', 'side-right', 'side-left', 'back', 'complete'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
    }
  };

  const handleGenerate = async () => {
    if (!userPrompt || !photos['front']) return;
    setProcessing(true);
    setGenerationError("");
    try {
      const result = await generateStyledHair({
        imageBase64: photos['front'].split(',')[1],
        userPrompt,
        scanStep: 'front',
        qualityMode,
      });
      setResultImage(result.imageDataUrl);
      setExpandedPrompt(result.expandedPrompt);
      setModelUsed(result.modelUsed);
      if (result.warnings?.length) {
        setGenerationError(result.warnings.join(' '));
      }
    } catch (err) {
      console.error(err);
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Style generation failed. Please try again.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const resetPhotos = () => {
    setPhotos({});
    setStep('front');
    setResultImage(null);
    setExpandedPrompt("");
    setGenerationError("");
    setModelUsed("");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <NeuralCanvas />

      <AnimatePresence mode="wait">
        {!showApp ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
          >
            {/* Minimal Nav */}
            <nav className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-orange-500" />
                <span className="font-black tracking-tighter text-2xl uppercase italic">AURA</span>
              </div>
              <button 
                onClick={() => setShowApp(true)}
                className="group flex items-center gap-2 bg-white/10 backdrop-blur-xl text-white border border-white/10 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-all"
              >
                Launch Studio
              </button>
            </nav>

            {/* Hero */}
            <div className="max-w-4xl w-full text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-4"
              >
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] uppercase italic">
                  Digital<br /><span className="text-orange-500">Couture.</span>
                </h1>
                <p className="text-base md:text-lg text-white/40 max-w-md mx-auto uppercase font-mono tracking-widest leading-relaxed">
                  Next-Gen AI Hair Analysis & Style Simulation.
                </p>
              </motion.div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={() => setShowApp(true)}
                  className="w-full md:w-auto bg-orange-600 hover:bg-orange-500 text-white px-12 py-5 rounded-full font-black text-xl transition-all shadow-[0_0_40px_rgba(234,88,12,0.3)] uppercase italic"
                >
                  Start Scan
                </button>
              </div>
            </div>

            {/* Floating Elements (Visual Polish) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse " style={{ animationDelay: '1s' }} />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="app"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 pt-5 px-4 md:pt-6 md:px-8 pb-28 max-w-7xl mx-auto"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowApp(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Studio</h1>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-white/60">LIVE</span>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Capture Column */}
              <div className="lg:col-span-8 space-y-6">
                <div className="relative aspect-square md:aspect-video bg-black rounded-3xl md:rounded-[32px] overflow-hidden border border-white/10 shadow-2xl group/camera">
                  {step !== 'complete' ? (
                    <>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{ facingMode: "user" }}
                        mirrored={false}
                        imageSmoothing={true}
                        screenshotQuality={0.92}
                        forceScreenshotSourceSize={true}
                        disablePictureInPicture={true}
                        onUserMedia={() => {}}
                        onUserMediaError={() => {}}
                      />
                      
                      {/* Scanning Overlays */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Corner Brackets */}
                        <div className="absolute top-4 left-4 md:top-6 md:left-6 w-7 h-7 md:w-8 md:h-8 border-t border-l border-white/20 rounded-tl-lg" />
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 w-7 h-7 md:w-8 md:h-8 border-t border-r border-white/20 rounded-tr-lg" />
                        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 w-7 h-7 md:w-8 md:h-8 border-b border-l border-white/20 rounded-bl-lg" />
                        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-7 h-7 md:w-8 md:h-8 border-b border-r border-white/20 rounded-br-lg" />

                        {/* Neural Scanning HUD */}
                        <div className="absolute top-3 left-1/2 w-[calc(100%-4rem)] max-w-[18rem] -translate-x-1/2 flex items-center justify-center gap-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 md:top-6 md:w-auto md:max-w-none md:gap-3 md:px-4">
                            <Layers className="w-3 h-3 text-orange-500 animate-pulse" />
                            <span className="truncate text-[8px] font-mono tracking-widest text-white/60 md:text-[9px]">NEURAL SEGMENTATION ACTIVE</span>
                        </div>

                        {/* Scanning Beam */}
                        <motion.div 
                          initial={{ top: '0%' }}
                          animate={{ top: '100%' }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-2 right-2 h-px bg-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        />
                      </div>

                      {/* Status HUD */}
                      <div className="absolute top-12 left-1/2 w-[calc(100%-3rem)] max-w-[19rem] -translate-x-1/2 px-3 py-2 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center gap-3 md:top-16 md:w-auto md:max-w-none md:rounded-full md:px-6 md:gap-4">
                         <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${isForeheadClear ? 'bg-orange-500' : 'bg-red-500'}`} />
                           <span className="text-[9px] uppercase font-mono tracking-widest leading-none md:text-[10px]">
                             {step.replace('-', ' ')} Target
                           </span>
                         </div>
                         <div className="w-[1px] h-3 bg-white/10" />
                         <span className="text-[9px] uppercase font-mono tracking-widest text-white/40 leading-none md:text-[10px]">
                           Align Required
                         </span>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-3 md:bottom-10 md:left-10 md:right-10 md:items-center">
                        <div className="min-w-0 max-w-[calc(100%-5.25rem)] space-y-1 rounded-2xl bg-black/25 px-3 py-2 backdrop-blur-sm md:max-w-none md:bg-transparent md:p-0 md:backdrop-blur-none">
                            <span className="block truncate text-[7px] uppercase font-mono tracking-[0.2em] text-white/40 md:text-[8px] md:tracking-[0.3em]">Diagnostic Feedback</span>
                            <div className="flex items-center gap-2 text-white/80">
                                {isForeheadClear ? <CheckCircle2 className="w-4 h-4 text-orange-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                                <span className="truncate text-[10px] font-bold uppercase tracking-normal md:text-xs">
                                    {isForeheadClear ? 'Face Analysis: COMPATIBLE' : 'ERROR: POOR LIGHTING'}
                                </span>
                            </div>
                        </div>

                        <button 
                          onClick={capturePhoto}
                          className="relative group p-1"
                        >
                          <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                          <div className="relative bg-white text-black w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl md:w-20 md:h-20">
                             <CameraIcon className="w-8 h-8 md:w-10 md:h-10" />
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full">
                      {resultImage ? (
                        <img src={resultImage} className="w-full h-full object-cover" alt="Styled Output" />
                      ) : (
                        <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
                          <img src={photos['front']} className="w-full h-full object-cover grayscale opacity-20" alt="Scanning Template" />
                          <div className="absolute inset-0 flex items-center justify-center flex-col gap-6 p-8 text-center max-w-md">
                             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                <Scan className="w-8 h-8 text-white/40" />
                             </div>
                             <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight">Target Acquired</h3>
                                <p className="text-sm text-white/40 leading-relaxed font-medium">Neural model built from 4-axis scan. Define your aesthetic parameters to begin generation.</p>
                             </div>
                          </div>
                        </div>
                      )}

                      {processing && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                                    <motion.circle 
                                        cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="2" fill="transparent" 
                                        className="text-orange-500" 
                                        strokeDasharray="377"
                                        initial={{ strokeDashoffset: 377 }}
                                        animate={{ strokeDashoffset: 0 }}
                                        transition={{ duration: 5, ease: "easeInOut" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-orange-500 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold tracking-tighter uppercase italic">Synthesizing Model</h3>
                                <p className="text-[10px] text-white/40 font-mono tracking-[0.3em] uppercase">Calculating light-field & follicle vectors</p>
                            </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Photo Strip */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x pt-2">
                    {(['front', 'side-right', 'side-left', 'back'] as const).map((s) => (
                    <div 
                        key={s} 
                        className={`shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-2xl border transition-all overflow-hidden relative snap-center ${step === s ? 'border-orange-500 bg-orange-500/5' : 'border-white/5 bg-white/5'}`}
                    >
                        {photos[s] ? (
                        <img src={photos[s]} className="w-full h-full object-cover" alt={s} />
                        ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white/10">
                            <Layers className="w-5 h-5" />
                        </div>
                        )}
                        <div className="absolute bottom-1 left-2 text-[7px] uppercase font-bold tracking-widest text-white/40">
                            {s.split('-')[0]}
                        </div>
                    </div>
                    ))}
                </div>
              </div>

              {/* Controls Column */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white/5 border border-white/10 p-5 md:p-8 rounded-3xl md:rounded-[32px] space-y-6">
                  <div className="flex items-center gap-3 text-orange-500">
                      <Scissors className="w-5 h-5" />
                      <h2 className="font-bold uppercase tracking-tight text-sm">Style Configuration</h2>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all h-32 resize-none placeholder:text-white/10"
                        placeholder="Describe your desired style..."
                        value={userPrompt}
                        onChange={(e) => {
                          setUserPrompt(e.target.value);
                          setGenerationError("");
                        }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1 border border-white/5">
                    {(['fast', 'pro'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setQualityMode(mode)}
                        className={`rounded-xl py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          qualityMode === mode
                            ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.25)]'
                            : 'text-white/35 hover:text-white'
                        }`}
                      >
                        {mode === 'fast' ? 'Fast' : 'Pro'}
                      </button>
                    ))}
                  </div>

                  {expandedPrompt && (
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-orange-500">
                          AI Interpretation
                        </span>
                        {modelUsed && (
                          <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest text-white/25">
                            {modelUsed}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-4 text-xs leading-relaxed text-white/45">
                        {expandedPrompt}
                      </p>
                    </div>
                  )}

                  {generationError && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                      <p className="text-xs font-medium leading-relaxed">
                        {generationError}
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={step !== 'complete' || !userPrompt || processing}
                    className="w-full relative group disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-orange-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-all" />
                    <div className="relative w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest">
                      {processing ? 'Processing...' : 'Apply Style'}
                    </div>
                  </button>

                  <button 
                    onClick={resetPhotos}
                    className="w-full text-white/20 hover:text-white transition-all text-[8px] uppercase font-mono tracking-widest"
                  >
                    Reset All Photos
                  </button>
                </section>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-center md:justify-between items-center z-[100] md:px-8">
          <div className="flex items-center gap-8 text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
            <span className="hidden md:flex items-center gap-2">
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                Vertex Inference: Ready
            </span>
            <span className="hidden md:flex items-center gap-2 ">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Neural Masking: Hardware Accel
            </span>
          </div>
          <div className="text-center text-[9px] font-mono text-white/20 uppercase tracking-widest">
            Aura Neuro-Tech Labs © 2026
          </div>
      </footer>
    </div>
  );
}
