import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Mic, Square, Volume2, Loader2, Download, History, Trash2, PlayCircle } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { saveLocalRecording, getLocalRecordings, deleteLocalRecording, type Recording } from '../lib/db';

export const VocalRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<Recording[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { t } = useLanguage();
  const { setVolumeLevel } = useStudioStore();
  
  // Referências para Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Referências para Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lineRef = useRef<THREE.Line | null>(null);

  // Carrega histórico inicial
  useEffect(() => {
    getLocalRecordings().then(setLocalHistory);
  }, []);

  // Função para desenhar a forma de onda
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    // Inicialização do Three.js se ainda não existir
    if (!rendererRef.current) {
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;

      sceneRef.current = new THREE.Scene();
      cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      cameraRef.current.position.z = 5;

      rendererRef.current = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current, 
        alpha: true, 
        antialias: true 
      });
      rendererRef.current.setSize(width, height, false);

      // Criar a geometria da linha circular
      const segments = 128;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(segments * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({ color: 0x00f2ff, linewidth: 2 });
      lineRef.current = new THREE.Line(geometry, material);
      sceneRef.current.add(lineRef.current);
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      
      analyserRef.current!.getByteTimeDomainData(dataArray);
      analyserRef.current!.getByteFrequencyData(freqData);

      if (lineRef.current && sceneRef.current && cameraRef.current) {
        const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
        const segments = 128;
        let sum = 0;

        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const v = dataArray[i] / 128.0;
          // Inovação: O raio do círculo muda com a amplitude
          const radius = 2 + (v - 1) * 2; 
          
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 1] = Math.sin(angle) * radius;
          positions[i * 3 + 2] = (freqData[i] / 255) * 3; 
          
          sum += Math.abs(dataArray[i] - 128);
        }

        lineRef.current.geometry.attributes.position.needsUpdate = true;
        lineRef.current.rotation.z += 0.02;
        lineRef.current.rotation.y += 0.005;
        
        const average = sum / segments;
        setVolumeLevel(Math.min(100, average * 2.5));

        rendererRef.current!.render(sceneRef.current, cameraRef.current);
      }
    };

    renderFrame();
  };

  // Função utilitária para codificar AudioBuffer em formato WAV (PCM 16-bit)
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const buffer2 = new ArrayBuffer(length);
    const view = new DataView(buffer2);
    const channels = [];
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // Cabeçalho RIFF
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // Chunk fmt
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1); // PCM não comprimido
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    // Chunk data
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer2], { type: 'audio/wav' });
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true);

    // Gera o arquivo WAV local para exportação imediata
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      const url = URL.createObjectURL(wavBlob);
      setWavUrl(url);
      
      // SALVAMENTO NO INDEXEDDB
      await saveLocalRecording({
        id: crypto.randomUUID(),
        name: `Take ${localHistory.length + 1}`,
        blob: wavBlob,
        timestamp: Date.now(),
        duration: audioBuffer.duration
      });
      getLocalRecordings().then(setLocalHistory);

      await tempCtx.close();
    } catch (e) {
      console.error("Erro ao converter para WAV:", e);
    }

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
      setWavUrl(null); // Reseta exportação anterior

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
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl bg-slate-950 p-8 rounded-[3rem] border-[12px] border-slate-900 shadow-2xl">
      {/* Status Bar */}
      <div className="w-full flex justify-between items-center mb-2 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />
          <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">
            {isRecording ? t.recordingLive : 'Standby'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          44.1kHz / 24-BIT / WAV
        </div>
      </div>

      {/* Visualizador de Onda */}
      <div className="w-full h-64 bg-black/40 rounded-[2rem] border border-slate-800 flex items-center justify-center relative overflow-hidden group shadow-inner">
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2">
            <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Volume2 size={32} />
              <span className="text-[10px] font-bold uppercase tracking-[0.5em]">Input Monitor</span>
            </div>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={256} 
          className="w-full h-full"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Exportar WAV (visível após gravação) */}
        {wavUrl && !isRecording && (
          <a
            href={wavUrl}
            download={`vocal_studio_${Date.now()}.wav`}
            className="p-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full transition-all shadow-lg hover:scale-110 flex items-center gap-2"
            title={t.exportWav}
          >
            <Download size={24} />
          </a>
        )}

        <button
          onClick={isRecording ? stopRecording : (isUploading ? undefined : startRecording)}
          disabled={isUploading}
          className={`group relative p-10 rounded-full transition-all duration-500 border-8 border-slate-900 ${
          isRecording 
          ? 'bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)]' 
          : isUploading
          ? 'bg-slate-400 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)]'
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

        {/* Toggle Histórico Local */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-4 rounded-full transition-all ${showHistory ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
          title={t.studioHistory}
        >
          <History size={24} />
        </button>
      </div>

      {/* Drawer de Histórico Local (Fitas Master) */}
      {showHistory && (
        <div className="w-full mt-4 space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">{t.studioHistory}</p>
          {localHistory.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl group hover:border-indigo-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all cursor-pointer" onClick={() => {
                  const audio = new Audio(URL.createObjectURL(rec.blob));
                  audio.play();
                }}>
                  <PlayCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">{rec.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{new Date(rec.timestamp).toLocaleString()} • {rec.duration.toFixed(1)}s</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  await deleteLocalRecording(rec.id);
                  getLocalRecordings().then(setLocalHistory);
                }}
                className="p-2 text-slate-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};