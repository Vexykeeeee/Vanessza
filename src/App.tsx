import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Heart } from 'lucide-react';
import { IMAGES } from './images';
import TextHeart from './components/TextHeart';

// ─── Typewriter ───────────────────────────────────────────────────────────────
const Typewriter = ({ text, delay = 50, onComplete }: { text: string; delay?: number; onComplete?: () => void }) => {
  const [currentText, setCurrentText] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index < text.length) {
      const t = setTimeout(() => { setCurrentText(p => p + text[index]); setIndex(p => p + 1); }, delay);
      return () => clearTimeout(t);
    } else if (onComplete) onComplete();
  }, [index, text, delay, onComplete]);
  return <span className="font-mono">{currentText}</span>;
};

// ─── Matrix Rain ──────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?/\\~`';
function randomChar() { return CHARS[Math.floor(Math.random() * CHARS.length)]; }

const MatrixRain = ({ colors }: { colors?: string[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(cols).fill(1);
    const palette = colors ?? ['#00ff41', '#afffaf'];
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.font = `${fontSize}px "Fira Code", monospace`;
        ctx.fillText(randomChar(), i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const iv = setInterval(draw, 40);
    return () => { clearInterval(iv); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// ─── Messenger Screen ─────────────────────────────────────────────────────────
type Msg = { from: 'friend' | 'me'; text: string };

// Shared AudioContext – újrahasználjuk, nem spawnolunk minden betűnél újat
let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
  return _audioCtx;
}

function playKeyClick() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // iPhone-szerű billentyű: rövid, száraz koppanás
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.012);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.02);

    const bufSize = Math.floor(ctx.sampleRate * 0.006);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
    noise.connect(noiseGain); noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch {}
}

// iPhone "sent" hang – mélyebb, puhább whoosh
function playSentSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.value = 0.7;
    filter.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.15);
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain); gain.connect(filter);
    osc.start(now); osc.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(280, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    gain2.gain.setValueAtTime(0.0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2); gain2.connect(filter);
    osc2.start(now + 0.1); osc2.stop(now + 0.27);
  } catch {}
}

// iPhone "received" hang – mélyebb, lágy ding
function playReceivedSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.Q.value = 0.5;
    filter.connect(ctx.destination);

    [0, 0.09].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 330 : 392, now + offset); // E4, G4
      gain.gain.setValueAtTime(0.0, now + offset);
      gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
      osc.connect(gain); gain.connect(filter);
      osc.start(now + offset); osc.stop(now + offset + 0.25);
    });
  } catch {}
}

const SCRIPT: Msg[] = [
  { from: 'me',    text: 'Cső bro.. Asszem bele zúgtam valakibe..' },
  { from: 'friend', text: 'Ahh hell nah bro, megint belefutottál a csapdába..' },
  { from: 'friend', text: 'Össze fogja törni a szíved mint az előző picsa.' },
  { from: 'me',    text: 'Dehogy faszi! Érzem, hogy ő az igazi! Annyira tökéletes...' },
  { from: 'me',    text: 'Cuki, édes, elfogadó, törődő... Viszonozza a szeretetet amit adok.' },
  { from: 'me',    text: 'Szerelmes vagyok...' },
  { from: 'friend', text: 'Mit jelent számodra a szerelem?' },
  { from: 'friend', text: 'Mármint hogy érted azt, hogy szerelmes vagy?' },
  { from: 'friend', text: 'Én csak átmegyek egy nőn és ennyi.. Nem szoktam érezni, de tudod te.. Neked is ezt kellene tenned lehet.' },
  { from: 'me',    text: 'Ez nekem sosem feküdt, tudod jól...' },
  { from: 'me',    text: 'Mit jelent számomra a szerelem?' },
  { from: 'me',    text: 'Mindjárt megmutatom brochaco. 💕' },
];

const MessengerScreen = ({ onDone }: { onDone: () => void }) => {
  const [sent, setSent] = useState<Msg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTypingMe, setIsTypingMe] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scriptIdx = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sent, inputText, isFriendTyping]);

  useEffect(() => {
    if (running.current) return;
    running.current = true;

    const runNext = async () => {
      if (scriptIdx.current >= SCRIPT.length) {
        setTimeout(() => setShowButton(true), 500);
        return;
      }
      const msg = SCRIPT[scriptIdx.current];
      scriptIdx.current++;

      if (msg.from === 'friend') {
        await new Promise(r => setTimeout(r, 600));
        setIsFriendTyping(true);
        await new Promise(r => setTimeout(r, 900 + msg.text.length * 28));
        setIsFriendTyping(false);
        setSent(p => [...p, msg]);
        playReceivedSound();
        await new Promise(r => setTimeout(r, 500));
      } else {
        await new Promise(r => setTimeout(r, 400));
        setIsTypingMe(true);
        let built = '';
        for (const ch of msg.text) {
          built += ch;
          setInputText(built);
          playKeyClick();
          const d = ch === ' ' ? 80 + Math.random() * 60
                  : ch === '.' ? 130 + Math.random() * 80
                  : 48 + Math.random() * 52;
          await new Promise(r => setTimeout(r, d));
        }
        await new Promise(r => setTimeout(r, 380));
        setIsTypingMe(false);
        setInputText('');
        setSent(p => [...p, msg]);
        playSentSound();
        await new Promise(r => setTimeout(r, 350));
      }
      runNext();
    };

    setTimeout(runNext, 700);
  }, []);

  return (
    <motion.div key="messenger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center bg-[#0a0a0f] overflow-hidden"
      style={{ position: 'fixed', inset: 0 }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-pink-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-60 h-60 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4 flex flex-col gap-1">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-t-2xl border border-white/8 bg-white/4 backdrop-blur-md mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">H</div>
          <div>
            <p className="text-white/80 text-sm font-medium">Haver</p>
            <p className="text-white/30 text-[10px]">{isFriendTyping ? 'ír...' : 'online'}</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2 px-2 min-h-[300px] max-h-[340px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {sent.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.from === 'me'
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white/85 border border-white/8 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {isFriendTyping && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex justify-start">
                <div className="bg-white/10 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(j => (
                    <motion.div key={j} className="w-1.5 h-1.5 rounded-full bg-white/40"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[46px]">
          <svg className="w-5 h-5 text-white/25 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          <div className="flex-1 min-h-[20px] flex items-center">
            {inputText ? (
              <span className="text-sm text-white/90 break-all leading-snug">
                {inputText}
                {isTypingMe && <span className="inline-block w-0.5 h-4 bg-pink-400 ml-0.5 align-middle animate-pulse" />}
              </span>
            ) : (
              <span className="text-sm text-white/20 select-none">Üzenet...</span>
            )}
          </div>
          <motion.div animate={{ scale: inputText ? 1 : 0.85, opacity: inputText ? 1 : 0.25 }}>
            <svg className="w-7 h-7 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </motion.div>
        </div>

        {/* CTA */}
        <AnimatePresence>
          {showButton && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="flex justify-center mt-5">
              <button onClick={onDone}
                className="group flex items-center gap-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-mono text-xs tracking-widest uppercase shadow-lg shadow-pink-500/25 transition-all duration-300 hover:scale-105">
                <Lock size={14} className="group-hover:rotate-12 transition-transform" />
                Decrypt Message
                <span className="terminal-cursor" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


// ─── Floating Photo ───────────────────────────────────────────────────────────
interface FloatingPhotoProps {
  src: string;
  id: number;
}

const FloatingPhoto: React.FC<FloatingPhotoProps> = ({ src, id }) => {
  const [visible, setVisible] = useState(false);
  const [pos] = useState(() => ({
    x: 5 + Math.random() * 82,   // % from left
    y: 5 + Math.random() * 82,   // % from top
    rotate: (Math.random() - 0.5) * 18,
    scale: 0.55 + Math.random() * 0.35,
    dx: (Math.random() - 0.5) * 30,
    dy: (Math.random() - 0.5) * 30,
    duration: 6 + Math.random() * 5,
  }));

  useEffect(() => {
    // show after small random delay
    const showDelay = Math.random() * 1200;
    const t1 = setTimeout(() => setVisible(true), showDelay);
    // hide after display time
    const displayTime = 5000 + Math.random() * 4000;
    const t2 = setTimeout(() => setVisible(false), showDelay + displayTime);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [id]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`fp-${id}`}
          initial={{ opacity: 0, scale: pos.scale * 0.7, rotate: pos.rotate - 5 }}
          animate={{
            opacity: [0, 0.82, 0.82, 0],
            scale: [pos.scale * 0.7, pos.scale, pos.scale, pos.scale * 0.85],
            rotate: [pos.rotate - 5, pos.rotate, pos.rotate + 3, pos.rotate + 3],
            x: [0, pos.dx * 0.4, pos.dx, pos.dx],
            y: [0, pos.dy * 0.4, pos.dy, pos.dy],
          }}
          transition={{ duration: pos.duration, ease: 'easeInOut' }}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          className="absolute pointer-events-none z-20">
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/60 border-2 border-white/15"
            style={{ width: 120, height: 160 }}>
            <img src={src} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.9) saturate(1.1)' }} />
          </div>
          {/* pink glow behind */}
          <div className="absolute inset-0 rounded-xl bg-pink-500/10 blur-lg -z-10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Photo Spawner (manages pool of floating photos) ─────────────────────────
const FloatingPhotos = () => {
  const [pool, setPool] = useState<{ id: number; imgIdx: number }[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const spawn = () => {
      const imgIdx = Math.floor(Math.random() * IMAGES.length);
      const id = counterRef.current++;
      setPool(p => [...p.slice(-8), { id, imgIdx }]); // keep max 8
    };
    spawn(); // immediate first
    const iv = setInterval(spawn, 1800 + Math.random() * 1200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pool.map(({ id, imgIdx }) => (
        <FloatingPhoto key={id} src={IMAGES[imgIdx]} id={id} />
      ))}
    </div>
  );
};

// ─── Hacker Screen 1 ──────────────────────────────────────────────────────────
const LINES_1 = [
  'INITIALIZING SECURE CHANNEL... OK',
  'BYPASSING FIREWALL LAYER 1... DONE',
  'BYPASSING FIREWALL LAYER 2... DONE',
  'INJECTING PAYLOAD: love.exe',
  'DECRYPTING EMOTIONAL_DATA.bin...',
  'SCANNING TARGET... FOUND',
  'UPLOADING: 99999 BYTES OF LOVE',
  'COMPILING FEELINGS... SUCCESS',
  'WARNING: UNRECOVERABLE EMOTION DETECTED',
  'ESTABLISHING ENCRYPTED LOVE TUNNEL...',
  'VULNERABILITY FOUND: extremely_cute.dll',
  'EXPLOITING: smile_attack_vector',
  'ROOT ACCESS: GRANTED',
  'DEPLOYING AFFECTION PACKAGE...',
  'OVERRIDE COMPLETE.',
];

const HackerScreen1 = ({ onDone }: { onDone: () => void }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const total = LINES_1.length;

  useEffect(() => {
    let i = 0;
    const add = () => {
      if (i < total) { setLines(p => [...p, LINES_1[i]]); i++; setTimeout(add, 400 + Math.random() * 350); }
      else setTimeout(() => setDone(true), 700);
    };
    setTimeout(add, 500);
  }, []);

  const progress = Math.min(Math.round((lines.length / total) * 100), 100);

  return (
    <motion.div key="hack1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-black">
      <MatrixRain />
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded border border-green-500/40 bg-black/85 shadow-[0_0_40px_rgba(0,255,65,0.15)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/30 bg-green-950/30">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-green-400/60 text-xs font-mono tracking-widest uppercase">root@love ~ /heart_protocol</span>
        </div>
        <div className="p-5 space-y-1 min-h-[280px] max-h-[280px] overflow-hidden flex flex-col justify-end">
          <AnimatePresence>
            {lines.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }} className="text-green-400 text-xs font-mono flex gap-2">
                <span className="text-green-700 select-none">[{String(i).padStart(2, '0')}]</span>
                <span>{line}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!done && <span className="text-green-300 text-xs font-mono animate-pulse">█</span>}
        </div>
        <div className="px-5 pb-4">
          <div className="flex justify-between text-[10px] font-mono text-green-500/60 mb-1">
            <span>PROGRESS</span><span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-green-950 rounded-full overflow-hidden">
            <motion.div className="h-full bg-green-400 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
          </div>
        </div>
      </div>
      {done && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="relative z-10 mt-8 flex flex-col items-center gap-3">
          <p className="text-green-300 font-mono text-sm tracking-widest uppercase"
            style={{ textShadow: '0 0 20px rgba(0,255,65,0.8)' }}>ACCESS GRANTED ✓</p>
          <button onClick={onDone}
            className="group flex items-center gap-3 px-6 py-3 border border-green-400/40 bg-green-950/30 hover:bg-green-900/40 text-green-300 transition-all duration-300 font-mono text-sm tracking-widest uppercase">
            <Heart size={15} className="group-hover:scale-125 transition-transform" />
            Enter My Heart
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Hacker Screen 2 ──────────────────────────────────────────────────────────
const LINES_2 = [
  'LOADING: feelings_for_you.dat ████████ 100%',
  'MEMORY ALLOCATION: infinite bytes of love',
  'SIGNAL STRENGTH: ❤❤❤❤❤ MAXIMUM',
  'KERNEL: heart.ko loaded successfully',
  'SCANNING: beautiful_human_detected.exe',
  'OVERRIDE: logic.sys replaced by emotion.sys',
  'PROCESS: missing_you_daemon running',
  'UPTIME: since the day we met',
  'CPU TEMP: running hot (you do that)',
  'ENCRYPTION: AES-256-LOVE initialized',
  'PACKET LOSS: 0% (never losing you)',
  'LATENCY: 0ms (always thinking of you)',
  'STATUS: completely, utterly in love',
  'FINAL CHECK: everything is perfect',
  'REDIRECTING TO: /your/heart/forever',
];

const HackerScreen2 = ({ onDone }: { onDone: () => void }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const total = LINES_2.length;

  useEffect(() => {
    let i = 0;
    const add = () => {
      if (i < total) { setLines(p => [...p, LINES_2[i]]); i++; setTimeout(add, 380 + Math.random() * 340); }
      else setTimeout(() => setDone(true), 600);
    };
    setTimeout(add, 300);
  }, []);

  useEffect(() => {
    if (done) { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }
  }, [done, onDone]);

  const progress = Math.min(Math.round((lines.length / total) * 100), 100);

  const lineColor = (i: number) => {
    const colors = ['#ff8fb1', '#67e8f9', '#fde68a', '#c4b5fd', '#6ee7b7'];
    return colors[i % colors.length];
  };

  return (
    <motion.div key="hack2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-black">
      <MatrixRain colors={['#ff4d6d', '#ff8fb1', '#67e8f9', '#c4b5fd', '#fde68a', '#6ee7b7']} />

      {/* ✨ Floating photos */}
      <FloatingPhotos />

      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-30 w-full max-w-2xl mx-4 rounded border border-pink-500/40 bg-black/88 shadow-[0_0_60px_rgba(255,77,109,0.2)] backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-pink-500/30"
          style={{ background: 'linear-gradient(90deg, rgba(255,77,109,0.1), rgba(103,232,249,0.05))' }}>
          <span className="w-3 h-3 rounded-full bg-pink-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-cyan-400/80" />
          <span className="ml-3 text-pink-400/70 text-xs font-mono tracking-widest uppercase">love@protocol ~ /heart/forever</span>
          <span className="ml-auto text-[10px] font-mono text-pink-500/40 animate-pulse">● LIVE</span>
        </div>
        <div className="p-5 space-y-1 min-h-[280px] max-h-[280px] overflow-hidden flex flex-col justify-end">
          <AnimatePresence>
            {lines.map((line, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }} className="text-xs font-mono flex gap-2">
                <span className="text-white/20 select-none">[{String(i).padStart(2, '0')}]</span>
                <span style={{ color: lineColor(i) }}>{line}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!done && <span className="text-pink-300 text-xs font-mono animate-pulse">█</span>}
        </div>
        <div className="px-5 pb-4">
          <div className="flex justify-between text-[10px] font-mono text-pink-500/60 mb-1">
            <span>LOVE TRANSFER</span><span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,77,109,0.1)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #ff4d6d, #67e8f9, #c4b5fd)' }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
          </div>
        </div>
      </div>

      {done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-30 mt-6 text-center space-y-1">
          {['❤', 'LOVE TRANSFER COMPLETE', '❤'].map((t, i) => (
            <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.2 }}
              className="font-mono text-sm tracking-[0.3em]"
              style={{ color: '#ff8fb1', textShadow: '0 0 20px rgba(255,143,177,0.8)' }}>{t}</motion.p>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Slideshow ────────────────────────────────────────────────────────────────
// Shuffles images and shows them one by one with crazy animations + music
type SlideAnim = {
  initial: object;
  animate: object;
  exit: object;
};

function randomSlideAnim(): SlideAnim {
  const anims: SlideAnim[] = [
    { initial: { opacity: 0, scale: 0.6, rotate: -15 }, animate: { opacity: 1, scale: 1, rotate: 0 }, exit: { opacity: 0, scale: 1.3, rotate: 10 } },
    { initial: { opacity: 0, x: -300, rotate: -20 }, animate: { opacity: 1, x: 0, rotate: 0 }, exit: { opacity: 0, x: 300, rotate: 20 } },
    { initial: { opacity: 0, y: -200, scale: 1.4 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 200, scale: 0.6 } },
    { initial: { opacity: 0, scale: 1.8, rotate: 25 }, animate: { opacity: 1, scale: 1, rotate: 0 }, exit: { opacity: 0, scale: 0.5, rotate: -25 } },
    { initial: { opacity: 0, x: 300, y: -150, rotate: 15 }, animate: { opacity: 1, x: 0, y: 0, rotate: 0 }, exit: { opacity: 0, x: -300, y: 150, rotate: -15 } },
    { initial: { opacity: 0, rotateY: 90 }, animate: { opacity: 1, rotateY: 0 }, exit: { opacity: 0, rotateY: -90 } },
  ];
  return anims[Math.floor(Math.random() * anims.length)];
}

const LOVE_QUOTES = [
  '💕 Te vagy a kedvenc helyem a világon.',
  '🌙 Te vagy a biztonságos menedékem.',
  '✨ Te vagy az én „boldogan éltek, amíg meg nem haltak” történetem.',
  '💞 Veled minden szebb',
  '🏠🔑❤️ A mosolyod olyan számomra, mint egy adrenalin löket.',
  '💫 Örökre tiéd vagyok',
  '❤️ Te vagy a válasz minden kérdésemre.',
  '✨💍 Imádom a hajadat. 💞',
  '♾️❤️ Te vagy az én csendem a viharban.',
  '🏠💕 Örökkön örökké szeretni foglak míg a halál el nem választ.',
  '💍❤️ Minden nap gyönyörű vagy.',
  '🌈💕 Sosem hagylak cserben, mindig itt leszek neked.',
  '❤️❤️❤️ Szeretlek életem értelme! ❤️❤️❤️'
];

// ─── ZENE BEÁLLÍTÁS ───────────────────────────────────────────────────────────
// Ha saját zenét akarsz, rakd be: src/assets/song.mp3
// és kommenteld ki a Web Audio részt, kommenteld be az alábbi sort:
// const SONG_SRC = '/src/assets/song.mp3';
const SONG_SRC: string | null = '/song.mp3'

// Globális audio ref – a Slideshow tölti fel, a RevealScreen olvassa
const globalAudioRef = { current: null as HTMLAudioElement | null };

const Slideshow = ({ onDone }: { onDone: () => void }) => {
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState<SlideAnim>(randomSlideAnim());
  const [animDone, setAnimDone] = useState(false); // slideshow animation finished
  const [browseMode, setBrowseMode] = useState(false); // user is scrolling back
  const [showLoveBtn, setShowLoveBtn] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Shuffle images once
  const shuffled = useRef([...IMAGES].sort(() => Math.random() - 0.5));
  const total = shuffled.current.length;

  // ── Music ──
  useEffect(() => {
    if (SONG_SRC) {
      // Use provided audio file
      const audio = new Audio(SONG_SRC);
      audio.loop = true;
      audio.volume = 0.7;
      audioRef.current = audio;
      globalAudioRef.current = audio;
      audio.play().catch(() => {});
      // Keep playing - don't stop on unmount
      return () => {};
    } else {
      // Web Audio API fallback melody
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const notes = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63, 293.66,
                       329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63, 261.63];
        let time = ctx.currentTime + 0.1;
        const noteDur = 0.45;
        const playMelody = () => {
          notes.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + noteDur);
            osc.start(time); osc.stop(time + noteDur + 0.1);
            time += noteDur;
          });
        };
        playMelody();
        const loopDur = notes.length * noteDur * 1000;
        const loopIv = setInterval(playMelody, loopDur);
        // Keep playing - don't stop on unmount
        return () => {};
      } catch {}
    }
  }, []);

  // ── Auto-advance slides ──
  useEffect(() => {
    if (browseMode) return; // user took over
    autoRef.current = setInterval(() => {
      setIdx(p => {
        const next = p + 1;
        if (next >= total) {
          // Animation complete!
          if (autoRef.current) clearInterval(autoRef.current);
          setAnimDone(true);
          setBrowseMode(true);
          setTimeout(() => setShowLoveBtn(true), 600);
          return p;
        }
        setAnim(randomSlideAnim());
        return next;
      });
    }, 3800);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [browseMode, total]);

  // ── Manual navigation ──
  const goTo = (i: number) => {
    if (!browseMode) return;
    setAnim(randomSlideAnim());
    setIdx(Math.max(0, Math.min(total - 1, i)));
  };

  const currentImg = shuffled.current[idx];
  const quote = LOVE_QUOTES[idx % LOVE_QUOTES.length];

  return (
    <motion.div key="slideshow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">

      {/* Blurred bg */}
      <div className="absolute inset-0">
        <img src={currentImg} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Floating hearts */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={i}
          className="absolute text-2xl pointer-events-none"
          initial={{ y: '100vh', x: `${10 + i * 11}%`, opacity: 0 }}
          animate={{ y: '-10vh', opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: 4 + Math.random() * 3, delay: i * 0.4 + Math.random(), repeat: Infinity, ease: 'easeOut' }}>
          {['❤️', '💕', '💗', '💖', '🌹', '✨', '💞', '💫'][i]}
        </motion.div>
      ))}

      {/* ── Main content column: photo + love btn + scrubber ── */}
      <div className="relative z-10 flex flex-col items-center gap-4 w-full px-6">

        {/* Main photo */}
        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.exit}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-4">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/30 border-2 border-white/20"
              style={{ width: 260, height: 340 }}>
              <img src={currentImg} alt="" className="w-full h-full object-cover" />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="font-mono text-sm tracking-widest text-white/90"
              style={{ textShadow: '0 0 20px rgba(255,143,177,0.8)' }}>
              {quote}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* ── BIG LOVE BUTTON – inline, above scrubber ── */}
        <AnimatePresence>
          {showLoveBtn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="flex justify-center w-full">
              <button onClick={onDone}
                className="relative flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
                <svg viewBox="0 0 200 180" className="w-44 h-40 drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 24px rgba(255,77,109,0.7))' }}>
                  <defs>
                    <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff4d6d" />
                      <stop offset="100%" stopColor="#ff8fb1" />
                    </linearGradient>
                  </defs>
                  <path d="M100 160 C60 130 10 100 10 55 C10 25 35 5 65 5 C80 5 92 12 100 22 C108 12 120 5 135 5 C165 5 190 25 190 55 C190 100 140 130 100 160Z"
                    fill="url(#heartGrad)" />
                  <path d="M100 160 C60 130 10 100 10 55 C10 25 35 5 65 5 C80 5 92 12 100 22 C108 12 120 5 135 5 C165 5 190 25 190 55 C190 100 140 130 100 160Z"
                    fill="none" stroke="rgba(255,143,177,0.4)" strokeWidth="4"
                    className="animate-ping" style={{ transformOrigin: 'center' }} />
                  <text x="100" y="80" textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="18" fontWeight="bold" fontFamily="monospace"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>
                    Szeretlek ❤
                  </text>
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress / scrubber bar ── */}
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex justify-center gap-1 flex-wrap">
            {shuffled.current.map((_, i) => (
              <button key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${browseMode ? 'cursor-pointer hover:scale-150' : 'cursor-default'} ${
                  i === idx ? 'w-5 h-2 bg-pink-400' : i < idx ? 'w-2 h-2 bg-pink-400/50' : 'w-2 h-2 bg-white/20'
                }`} />
            ))}
          </div>
          <AnimatePresence>
            {browseMode && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 w-full">
                <button onClick={() => goTo(idx - 1)}
                  className="text-white/50 hover:text-white transition-colors text-lg font-bold">‹</button>
                <input type="range" min={0} max={total - 1} value={idx}
                  onChange={e => goTo(Number(e.target.value))}
                  className="flex-1 h-1 accent-pink-400 cursor-pointer" />
                <button onClick={() => goTo(idx + 1)}
                  className="text-white/50 hover:text-white transition-colors text-lg font-bold">›</button>
                <span className="text-white/30 font-mono text-[10px] min-w-[32px]">{idx+1}/{total}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Skip (only during auto-play) */}
      {!animDone && (
        <button onClick={() => {
          if (autoRef.current) clearInterval(autoRef.current);
          setAnimDone(true); setBrowseMode(true);
          setTimeout(() => setShowLoveBtn(true), 600);
        }}
          className="absolute top-6 right-6 z-20 text-white/30 hover:text-white/70 font-mono text-xs tracking-widest uppercase transition-colors">
          Skip →
        </button>
      )}

      {/* Counter (auto-play) */}
      {!animDone && (
        <div className="absolute top-6 left-6 z-20 font-mono text-xs text-white/20">
          {idx + 1} / {total}
        </div>
      )}

      {/* Browse mode label */}
      {browseMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute top-6 left-0 right-0 z-20 flex justify-center">
          <span className="font-mono text-[10px] text-white/25 tracking-widest uppercase">← görgess vissza →</span>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Reveal Screen (nagy szívecske + zene fade 10mp után) ─────────────────────
const RevealScreen = ({ onDone }: { onDone: () => void }) => {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const fadeStart = 10000;
    const fadeDuration = 2000;

    const t1 = setTimeout(() => {
      // Fade out a zene
      const audio = globalAudioRef.current;
      if (audio) {
        const startVol = audio.volume;
        const steps = 40;
        const stepTime = fadeDuration / steps;
        let step = 0;
        const iv = setInterval(() => {
          step++;
          audio.volume = Math.max(0, startVol * (1 - step / steps));
          if (step >= steps) { clearInterval(iv); audio.pause(); }
        }, stepTime);
      }
    }, fadeStart);

    const t2 = setTimeout(() => onDoneRef.current(), fadeStart + fadeDuration + 300);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <TextHeart />
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 3, duration: 1.5 }} className="z-20 text-center">
        <h2 className="text-pink-deep font-mono text-xl tracking-[0.3em] uppercase glow-text mb-2">Decrypted</h2>
        <div className="w-12 h-px bg-pink-deep/30 mx-auto mb-8" />
      </motion.div>
      <div className="absolute top-8 left-8 text-[10px] font-mono text-white/10 uppercase tracking-widest space-y-1">
        <div>ln: 420</div><div>id: 0xDEADBEEF</div><div>type: organic_emotion</div>
      </div>
      <div className="absolute bottom-8 right-8 text-[10px] font-mono text-white/10 uppercase tracking-widest">
        heart_reveal // success
      </div>
    </motion.div>
  );
};

// ─── Messenger Screen 2 (régi + új párbeszéd) ────────────────────────────────
const SCRIPT_2: Msg[] = [
  // ── Régi üzenetek (szürkítve jelennek meg, mint "előzmény") ──
  ...SCRIPT,
  // ── Új párbeszéd (ezt írd át kedved szerint!) ──
  { from: 'friend', text: 'Heeey... Ez gyönyörű volt. 😭' },
  { from: 'me',    text: 'Ugye?' },
  { from: 'me',    text: 'Szóval. Mit szólsz hozzá? 🥺' },
  { from: 'friend', text: 'Mit szólok?.. Nem tudok mit mondani.' },
  { from: 'friend', text: 'Csak annyit tudok, hogy én is szeretlek. ❤️' },
  { from: 'me',    text: 'Na jól van bro, kopj le. xD' },
];

const HISTORY_COUNT = SCRIPT.length; // ennyi az "előzmény"

const MessengerScreen2 = ({ onDone }: { onDone: () => void }) => {
  const [sent, setSent] = useState<Msg[]>([...SCRIPT]); // rögtön betöltjük a régit
  const [inputText, setInputText] = useState('');
  const [isTypingMe, setIsTypingMe] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scriptIdx = useRef(HISTORY_COUNT); // az új üzenetektől indul
  const running = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sent, inputText, isFriendTyping]);

  useEffect(() => {
    if (running.current) return;
    running.current = true;

    const runNext = async () => {
      if (scriptIdx.current >= SCRIPT_2.length) {
        setTimeout(() => setShowButton(true), 500);
        return;
      }
      const msg = SCRIPT_2[scriptIdx.current];
      scriptIdx.current++;

      if (msg.from === 'friend') {
        await new Promise(r => setTimeout(r, 600));
        setIsFriendTyping(true);
        await new Promise(r => setTimeout(r, 900 + msg.text.length * 28));
        setIsFriendTyping(false);
        setSent(p => [...p, msg]);
        playReceivedSound();
        await new Promise(r => setTimeout(r, 500));
      } else {
        await new Promise(r => setTimeout(r, 400));
        setIsTypingMe(true);
        let built = '';
        for (const ch of msg.text) {
          built += ch;
          setInputText(built);
          playKeyClick();
          const d = ch === ' ' ? 80 + Math.random() * 60
                  : ch === '.' ? 130 + Math.random() * 80
                  : 48 + Math.random() * 52;
          await new Promise(r => setTimeout(r, d));
        }
        await new Promise(r => setTimeout(r, 380));
        setIsTypingMe(false);
        setInputText('');
        setSent(p => [...p, msg]);
        playSentSound();
        await new Promise(r => setTimeout(r, 350));
      }
      runNext();
    };

    setTimeout(runNext, 1200);
  }, []);

  return (
    <motion.div key="messenger2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center bg-[#0a0a0f] overflow-hidden"
      style={{ position: 'fixed', inset: 0 }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-pink-600/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-60 h-60 rounded-full bg-indigo-600/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4 flex flex-col gap-1">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-t-2xl border border-white/8 bg-white/4 backdrop-blur-md mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">H</div>
          <div>
            <p className="text-white/80 text-sm font-medium">Haver</p>
            <p className="text-white/30 text-[10px]">{isFriendTyping ? 'ír...' : 'online'}</p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2 px-2 min-h-[300px] max-h-[340px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {sent.map((msg, i) => {
              const isHistory = i < HISTORY_COUNT;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                    msg.from === 'me'
                      ? isHistory
                        ? 'bg-gradient-to-br from-pink-500/40 to-rose-600/40 text-white/40 rounded-br-sm'
                        : 'bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-br-sm'
                      : isHistory
                        ? 'bg-white/5 text-white/35 border border-white/5 rounded-bl-sm'
                        : 'bg-white/10 text-white/85 border border-white/8 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {/* Elválasztó a régi és új üzenetek között */}
          {sent.length >= HISTORY_COUNT && (
            <div className="flex items-center gap-3 my-1 px-2">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-[10px] font-mono tracking-widest">most</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
          )}
          <AnimatePresence>
            {isFriendTyping && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex justify-start">
                <div className="bg-white/10 border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(j => (
                    <motion.div key={j} className="w-1.5 h-1.5 rounded-full bg-white/40"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15 }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm min-h-[46px]">
          <svg className="w-5 h-5 text-white/25 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          <div className="flex-1 min-h-[20px] flex items-center">
            {inputText ? (
              <span className="text-sm text-white/90 break-all leading-snug">
                {inputText}
                {isTypingMe && <span className="inline-block w-0.5 h-4 bg-pink-400 ml-0.5 align-middle animate-pulse" />}
              </span>
            ) : (
              <span className="text-sm text-white/20 select-none">Üzenet...</span>
            )}
          </div>
          <motion.div animate={{ scale: inputText ? 1 : 0.85, opacity: inputText ? 1 : 0.25 }}>
            <svg className="w-7 h-7 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </motion.div>
        </div>

        {/* CTA */}
        <AnimatePresence>
          {showButton && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="flex justify-center mt-5">
              <button onClick={onDone}
                className="group flex items-center gap-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-mono text-xs tracking-widest uppercase shadow-lg shadow-pink-500/25 transition-all duration-300 hover:scale-105">
                <Heart size={14} className="group-hover:scale-125 transition-transform" />
                ← Vissza
                <span className="terminal-cursor" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


export default function App() {
  const [stage, setStage] = useState<'console' | 'messenger' | 'hack1' | 'hack2' | 'slideshow' | 'reveal' | 'messenger2'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);

  const handleReveal = useCallback(() => {
    if (stage === 'console' && consoleFinished) setStage('messenger');
  }, [stage, consoleFinished]);

  return (
    <div onClick={handleReveal}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${stage === 'console' && consoleFinished ? 'cursor-pointer' : ''}`}>
      <div className="scanline" />
      <AnimatePresence mode="wait">

        {/* Console */}
        {stage === 'console' && (
          <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl p-8 font-mono text-sm md:text-base text-white/80">
            <div className="space-y-2">
              <div className="flex gap-2 text-pink-soft/60">
                <span>[system]</span>
                <Typewriter text="Initializing heart.PROTOCOL_v2.0..." delay={30} onComplete={() => setConsoleFinished(true)} />
              </div>
              <div className="flex gap-2 h-6">
                <span>[status]</span>
                {consoleFinished && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400">READY</motion.span>
                )}
              </div>
              {consoleFinished && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="pt-8 flex flex-col items-start gap-6">
                  <p className="text-white/40 italic">{'>'} One encrypted package found for you.</p>
                  <button id="decrypt-button"
                    onClick={e => { e.stopPropagation(); setStage('messenger'); }}
                    className="group flex items-center gap-3 px-6 py-3 border border-pink-deep/30 bg-pink-deep/5 hover:bg-pink-deep/10 text-pink-soft transition-all duration-300 pointer-events-auto">
                    <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-mono tracking-widest uppercase text-xs">Decrypt Message</span>
                    <span className="terminal-cursor" />
                  </button>
                  <p className="text-[10px] text-white/20 animate-pulse">(or just click anywhere)</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Messenger */}
        {stage === 'messenger' && (
          <MessengerScreen key="messenger" onDone={() => setStage('hack1')} />
        )}

        {/* Hack 1 */}
        {stage === 'hack1' && <HackerScreen1 key="hack1" onDone={() => setStage('hack2')} />}

        {/* Hack 2 */}
        {stage === 'hack2' && <HackerScreen2 key="hack2" onDone={() => setStage('slideshow')} />}

        {/* Slideshow */}
        {stage === 'slideshow' && <Slideshow key="slideshow" onDone={() => setStage('reveal')} />}

        {/* Reveal */}
        {stage === 'reveal' && (
          <RevealScreen key="reveal" onDone={() => setStage('messenger2')} />
        )}

        {/* Messenger 2 */}
        {stage === 'messenger2' && (
          <MessengerScreen2 key="messenger2" onDone={() => setStage('reveal')} />
        )}

      </AnimatePresence>
    </div>
  );
}