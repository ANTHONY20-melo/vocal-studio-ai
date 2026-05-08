import React, { useRef, useEffect, useState } from 'react'; // Adicionado useState
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Trash2, Wand2, Music } from 'lucide-react'; // Removido Play
import { useStudioStore } from '../store/useStudioStore'; // Importa o store
import { useLanguage } from '../context/LanguageContext'; // Corrigido

export const VocalRecorder: React.FC = () => {
  const { t } = useLanguage();
  const { 
    isRecording, 
    isUploading, 
    audioUrl, 
    audioBlob,
    volumeLevel, // Adicionado
    lastFilePath, 
    error, 
    setRecording, 
    setUploading, 
    setAudioUrl,
    setAudioBlob,
    setLastFilePath, 
    setError,
    clearAudio,
    setRecordingDuration, // Adicionado
    setVolumeLevel, // Adicionado
    setSelectedRhythm, // Adicionado para atualizar o ritmo selecionado globalmente
    selectedRhythm, // Adicionado para ler o ritmo selecionado globalmente
  } = useStudioStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Local state for recording timer
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [suggestedRhythms, setSuggestedRhythms] = useState<string[]>([]); // Mantido local para as sugestões
  const [customRhythm, setCustomRhythm] = useState('');

  // Referências para o Analisador Visual
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  const visualizeAudio = () => {
    if (!canvasRef.current || !analyserRef.current || !audioContextRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    analyser.fftSize = 2048; // Ensure fftSize is set for analyser
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(24, 24, 27)'; // Fundo zinc-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(34, 197, 94)'; // Verde estilo monitor cardíaco
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (canvas.height / 2);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // --- VU Meter Calculation (RMS from time domain data) ---
      let sumSquares = 0;
      for (const amplitude of dataArray) {
          const normalized = amplitude / 128.0 - 1.0; // Normalize to -1 to 1
          sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      // Convert RMS to dB for a more perceptual scale, then normalize to 0-100 for display
      // A common range for audio is -60dB (silence) to 0dB (max).
      // Let's map -60dB to 0 and 0dB to 100.
      let db = 20 * Math.log10(rms);
      if (db < -60) db = -60; // Clamp minimum dB
      const normalizedVolume = Math.min(100, Math.max(0, (db + 60) * (100 / 60))); // Normalize -60dB to 0dB to 0-100
      setVolumeLevel(normalizedVolume);
    };
    draw();
  };

  useEffect(() => {
    let timerInterval: number;
    if (isRecording && recordingStartTime !== null) {
      timerInterval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timerInterval);
  }, [isRecording, recordingStartTime]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, sampleRate: 44100 }
      });

      // Setup AudioContext for visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // Good balance for frequency/time domain data
      sourceNode.connect(analyserRef.current);

      visualizeAudio(); // Start visualization

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        setAudioBlob(recordedBlob); // Store the blob for potential upload
        
        stream.getTracks().forEach(track => track.stop());
        cancelAnimationFrame(animationRef.current);
        if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();

        setVolumeLevel(0); // Reset VU meter
        setRecording(false); // Set recording to false here, after cleanup
        setRecordingStartTime(null); // Reset timer start
        setRecordingDuration(elapsedTime); // Save final duration to store

        // Automatically upload after stopping recording
        // This can be changed to a manual trigger if desired
        await uploadAudio(recordedBlob); // Pass recordedBlob directly
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingStartTime(Date.now()); // Start timer
    } catch (err) {
      setError('Não foi possível acessar o microfone.');
      console.error("Erro ao acessar o microfone:", err);
      setRecording(false); // Ensure recording state is false on error
      setRecordingStartTime(null); // Reset timer start
      setVolumeLevel(0); // Reset VU meter
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // Limpa animações ao desmontar o componente
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      // Also clear timer and reset volume/duration on unmount
      setRecordingDuration(0);
      setVolumeLevel(0);
    };
  }, []);

  const uploadAudio = async (blob: Blob | null) => {
    if (!blob) return; // Should not happen if called after recording

    setUploading(true);
    const formData = new FormData();
    formData.append('audio', blob, 'take.webm');
    formData.append('userId', 'user-123'); // Exemplo de ID

    try {
      const response = await fetch('http://localhost:3333/api/studio/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Falha no upload');

      const data = await response.json();
      setLastFilePath(data.filePath);

      // Simulação: Após o processamento, a IA sugere ritmos baseados no timbre
      // Para uma análise real de BPM, você precisaria de um backend que processasse o áudio.
      // Aqui, vamos simular um BPM aleatório e sugerir ritmos com base nele.
      if (data.filePath) {
        const mockBPM = Math.floor(Math.random() * (160 - 60 + 1)) + 60; // BPM entre 60 e 160
        let rhythms: string[] = [];
        if (mockBPM < 80) {
          rhythms = ['Lofi', 'Bolero', 'Gospel Lento', 'Blues', 'Jazz'];
        } else if (mockBPM < 100) {
          rhythms = ['R&B', 'Bossa Nova', 'Pagode Suave', 'Soul', 'Gospel'];
        } else if (mockBPM < 120) {
          rhythms = ['Pop Rock', 'Pagode', 'Axé Bahia', 'Funk', 'Disco'];
        } else if (mockBPM < 140) {
          rhythms = ['Trap', 'Reggaeton', 'Axé', 'Forró IA', 'House'];
        } else {
          rhythms = ['Drum & Bass', 'Metal', 'Hardcore', 'Fast Pop', 'Techno Core'];
        }
        setSuggestedRhythms(rhythms);
        setSelectedRhythm(rhythms[0]); // Seleciona o primeiro sugerido por padrão
      }
    } catch (err) {
      setError('Erro ao enviar áudio para o servidor.');
    } finally {
      setUploading(false);
    }
  };

  const handleRhythmSelect = (rhythm: string) => { // Atualiza o estado global
    setSelectedRhythm(rhythm);
    setCustomRhythm(''); // Limpa o customizado se escolher uma sugestão
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-6">
      <div className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">{t.recorderTitle}</div>

      {/* Timer */}
      {isRecording && (
        <div className="text-white text-sm font-mono">
          {formatTime(elapsedTime)}
        </div>
      )}

      {/* Analog VU Meter */}
      {isRecording && (
        <div className="relative w-48 h-24 overflow-hidden border-b border-slate-700 pb-2 mb-4">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            {/* Escala */}
            <path 
              d="M10,45 A40,40 0 0,1 90,45" 
              fill="none" 
              stroke="#334155" 
              strokeWidth="2" 
              strokeDasharray="1,2"
            />
            <text x="5" y="48" fontSize="4" fill="#64748b">-20</text>
            <text x="45" y="8" fontSize="4" fill="#64748b">0</text>
            <text x="88" y="48" fontSize="4" fill="#ef4444">+3</text>
            
            {/* Agulha */}
            <line 
              x1="50" y1="50" 
              x2="50" y2="10" 
              stroke="#ef4444" 
              strokeWidth="1.5"
              style={{ 
                transformOrigin: '50px 50px',
                transform: `rotate(${((volumeLevel / 100) * 120) - 60}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            />
            {/* Eixo da agulha */}
            <circle cx="50" cy="50" r="3" fill="#1e293b" />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 tracking-tighter">VU METER</div>
        </div>
      )}

      {/* Waveform Visualizer / Placeholder */}
      <div className="h-32 w-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800/50 shadow-2xl flex items-center justify-center">
        {isRecording ? (
          <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
        ) : (
          <span className="text-zinc-500 text-sm">Aguardando gravação...</span>
        )}
      </div>

      {!audioUrl ? ( // Show record/stop button if no audio is recorded yet
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`flex items-center justify-center w-20 h-20 rounded-full transition-all shadow-2xl ${
            isRecording ? 'bg-red-500 animate-pulse text-white scale-110' : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
          } disabled:opacity-50`}
        >
          {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
        </button>
      ) : ( // Show audio player and action buttons if audio is recorded
        <div className="flex flex-col items-center gap-6 w-full animate-in fade-in slide-in-from-top-4">
          <audio src={audioUrl} controls className="w-full h-12 rounded-lg" />
          <div className="flex gap-4 w-full justify-center">
            <button onClick={clearAudio} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
              <Trash2 size={18} /> Descartar
            </button>
            <button onClick={() => uploadAudio(audioBlob)} disabled={isUploading} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20">
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />} Masterizar (IA)
            </button>
          </div>
        </div>
      )}

      {/* Seção de Ritmos Sugeridos e Personalizados */}
      {audioUrl && suggestedRhythms.length > 0 && (
        <div className="w-full mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-4 animate-in fade-in slide-in-from-bottom-2 text-center">
          <div className="flex items-center gap-2 text-indigo-400">
            <Music size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">{t.recorderRhythmPrompt}</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestedRhythms.map(r => (
              <button
                key={r}
                onClick={() => handleRhythmSelect(r)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedRhythm === r 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-indigo-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customRhythm}
            onChange={(e) => {
              const val = e.target.value;
              setCustomRhythm(val); 
              setSelectedRhythm(val); // Sincroniza com o estado global
            }}
            placeholder={t.customRhythmPlaceholder}
            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-blue-400">
          <Loader2 className="animate-spin" size={18} />
          <span>Enviando para IA...</span>
        </div>
      )}

      {lastFilePath && !isUploading && (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 size={18} />
          <span>Áudio processado!</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};