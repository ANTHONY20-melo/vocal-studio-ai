import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, Loader2 } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { supabase } from '../lib/supabase';

export const VocalRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { setVolumeLevel } = useStudioStore();
  
  // Referências para Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Função para desenhar a forma de onda
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      analyserRef.current!.getByteTimeDomainData(dataArray);

      // Limpa o canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Configurações do traço
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#6366f1'; // indigo-500
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      let sum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
        
        // Cálculo de volume para o store global (0-100)
        sum += Math.abs(dataArray[i] - 128);
      }

      const average = sum / bufferLength;
      setVolumeLevel(Math.min(100, average * 2.5));

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    renderFrame();
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const fileName = `vocal_${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from('vocal-recordings') // Certifique-se de que este bucket existe no Supabase
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('vocal-recordings')
        .getPublicUrl(fileName);

      console.log("Upload concluído! URL pública:", publicUrl);
      // Aqui você pode chamar uma função para salvar a publicUrl no seu banco de dados
    } catch (err) {
      console.error("Erro no upload para Supabase:", err);
      alert("Erro ao salvar o áudio no servidor.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configuração do MediaRecorder para salvar o arquivo
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => uploadAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' }));

      analyserRef.current.fftSize = 2048;
      
      source.connect(analyserRef.current);
      
      setIsRecording(true);
      mediaRecorderRef.current.start();
      drawWaveform();
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
    setVolumeLevel(0);
  };

  // Limpeza ao desmontar o componente
  useEffect(() => {
    return () => {
      if (isRecording) stopRecording();
    };
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      {/* Visualizador de Onda */}
      <div className="w-full h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
            <Volume2 size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Pronto para gravar</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={128} 
          className="w-full h-full"
        />
      </div>

      {/* Controle de Gravação */}
      <button
        onClick={isRecording ? stopRecording : (isUploading ? undefined : startRecording)}
        disabled={isUploading}
        className={`group relative p-8 rounded-full transition-all duration-500 ${
          isRecording 
          ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
          : isUploading
          ? 'bg-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-500 shadow-xl'
        }`}
      >
        {isUploading ? (
          <Loader2 size={32} className="text-white animate-spin" />
        ) : isRecording ? (
          <Square size={32} className="text-white fill-current" />
        ) : (
          <Mic size={32} className="text-white" />
        )}
        {isRecording && <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
        </span>}
      </button>
    </div>
  );
};