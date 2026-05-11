import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Download, Play, Trash2, Sliders, Radio, Activity, CloudUpload, History as HistoryIcon } from 'lucide-react';
import { useStudioStore } from '@store/useStudioStore';
import { supabase } from '@lib/supabase';
import { saveLocalRecording, getLocalRecordings, deleteLocalRecording, type Recording } from '@lib/db';

export const VocalRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { volumeLevel, setVolumeLevel } = useStudioStore();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getLocalRecordings().then(setLocalHistory);
  }, []);

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

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = isRecording ? '#ef4444' : '#6366f1'; 
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      let sum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
        sum += Math.abs(dataArray[i] - 128);
      }

      const average = sum / bufferLength;
      setVolumeLevel(Math.min(100, average * 2.5));

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    renderFrame();
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const buffer2 = new ArrayBuffer(length);
    const view = new DataView(buffer2);
    const channels = [];
    let sample; let offset = 0; let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16);
    setUint32(0x61746164); setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
        view.setInt16(pos, sample, true); pos += 2;
      }
      offset++;
    }
    return new Blob([buffer2], { type: 'audio/wav' });
  };

  const handleStopRecordingProcess = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      
      const newUrl = URL.createObjectURL(wavBlob);
      setWavUrl(newUrl);

      const newRecording: Recording = {
        id: crypto.randomUUID(),
        name: `Take ${localHistory.length + 1}`,
        blob: wavBlob,
        timestamp: Date.now(),
        duration: audioBuffer.duration
      };

      await saveLocalRecording(newRecording);
      
      getLocalRecordings().then(setLocalHistory);
      // ATIVAÇÃO AUTOMÁTICA DO UPLOAD PARA NUVEM
      await uploadTakeToCloud(newRecording);
    } catch (err) {
      console.error("Erro no processamento:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadTakeToCloud = async (rec: Recording) => {
    if (!supabase) {
      alert("Conexão com o Supabase não configurada.");
      return;
    }

    setUploadingId(rec.id);
    try {
      const fileName = `vocal_take_${Date.now()}.wav`;
      
      const { error: uploadError } = await supabase.storage
        .from('vocal-recordings')
        .upload(fileName, rec.blob, {
          contentType: 'audio/wav',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vocal-recordings')
        .getPublicUrl(fileName);

      alert("Take salvo na nuvem com sucesso!");
      console.log("URL Pública:", publicUrl);

    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao salvar o áudio na nuvem. Verifique a conexão.");
    } finally {
      setUploadingId(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      setWavUrl(null);

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => handleStopRecordingProcess(new Blob(audioChunksRef.current, { type: 'audio/webm' }));

      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      setIsRecording(true);
      mediaRecorderRef.current.start();
      drawWaveform();
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Permissão de microfone negada.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
    setVolumeLevel(0);
  };

  useEffect(() => {
    return () => { if (isRecording) stopRecording(); };
  }, [isRecording]);

  const togglePlay = (rec: Recording) => {
    if (playingId === rec.id && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingId(null);
      return;
    }
    
    if (currentAudioRef.current) currentAudioRef.current.pause();
    
    const audio = new Audio(URL.createObjectURL(rec.blob));
    currentAudioRef.current = audio;
    setPlayingId(rec.id);
    
    audio.onended = () => setPlayingId(null);
    audio.play();
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
      {/* Console Principal - Área de Gravação */}
      <div className="col-span-1 lg:col-span-2 bg-zinc-950 rounded-[2rem] border border-zinc-800 shadow-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-[350px] sm:min-h-[400px]">
        {/* Painel Superior do Console */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 z-10 relative gap-3 sm:gap-0">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <Radio size={20} className={isRecording ? 'text-red-500 animate-pulse' : 'text-zinc-500'} />
              <h2 className="text-zinc-100 font-bold tracking-wide uppercase text-xs sm:text-sm">Vocal Channel Strip</h2>
            </div>
            <span className="text-zinc-500 text-[10px] sm:text-xs font-mono ml-8">PCM 44.1kHz • Studio Quality</span>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 self-end sm:self-auto">
            <Activity size={14} className="text-indigo-400" />
            <div className="w-16 sm:w-24 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${volumeLevel > 80 ? 'bg-red-500' : volumeLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Display da Onda */}
        <div className="relative flex-grow bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex items-center justify-center overflow-hidden mb-6 sm:mb-8 shadow-inner min-h-[120px]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] sm:bg-[size:24px_24px]"></div>
          {!isRecording && !isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-2 sm:gap-3 z-10">
              <Mic size={36} className="opacity-20 sm:w-12 sm:h-12" />
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center px-4">Aguardando Sinal</span>
            </div>
          )}
          <canvas ref={canvasRef} width={800} height={200} className="w-full h-full relative z-10" />
        </div>

        {/* Controles de Transporte */}
        <div className="flex flex-col sm:flex-row items-center justify-between z-10 relative gap-4 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
            <button
              onClick={isRecording ? stopRecording : (isUploading ? undefined : startRecording)}
              disabled={isUploading}
              className={`group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-300 flex-shrink-0 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)] border-4 border-red-950' 
                  : isUploading 
                    ? 'bg-zinc-800 border-4 border-zinc-900' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_25px_rgba(79,70,229,0.2)] border-4 border-indigo-950'
              }`}
            >
              {isUploading ? <Loader2 size={24} className="text-zinc-400 animate-spin sm:w-7 sm:h-7" /> :
               isRecording ? <Square size={24} className="text-white fill-current sm:w-7 sm:h-7" /> : 
               <Mic size={24} className="text-white sm:w-8 sm:h-8" />}
            </button>
            
            <div className="flex flex-col">
              <span className="text-zinc-100 font-bold text-base sm:text-lg">{isRecording ? 'Gravando...' : 'Pronto'}</span>
              <span className="text-zinc-500 text-xs sm:text-sm">{isRecording ? 'Pressione para parar' : 'Pressione para iniciar'}</span>
            </div>
          </div>

          {wavUrl && !isRecording && (
            <a 
              href={wavUrl} 
              download={`vocal_take_${Date.now()}.wav`} 
              className="flex items-center justify-center w-full sm:w-auto gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-3 rounded-full font-semibold transition-all border border-zinc-700 hover:border-zinc-500 text-sm sm:text-base"
            >
              <Download size={18} /> Exportar WAV
            </a>
          )}
        </div>
      </div>

      {/* Rack de Histórico - Takes */}
      <div className="col-span-1 bg-zinc-950 rounded-[2rem] border border-zinc-800 shadow-xl p-4 sm:p-6 flex flex-col h-[350px] sm:h-[400px] lg:h-auto lg:max-h-[600px]">
        <div className="flex items-center gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-zinc-800">
          <Sliders size={18} className="text-indigo-400 sm:w-5 sm:h-5" />
          <h2 className="text-zinc-100 font-bold tracking-wide uppercase text-xs sm:text-sm">Biblioteca de Takes</h2>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-2 sm:space-y-3 custom-scrollbar">
          {localHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
              <Activity size={28} className="opacity-20 sm:w-8 sm:h-8" />
              <p className="text-xs sm:text-sm text-center">Nenhum take gravado ainda.</p>
            </div>
          ) : (
            localHistory.map((rec) => (
              <div key={rec.id} className="group flex flex-row items-center justify-between p-3 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-indigo-500/50 transition-colors gap-2">
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                  <button 
                    onClick={() => togglePlay(rec)} 
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${playingId === rec.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-zinc-800 text-indigo-400 hover:bg-zinc-700'}`}
                  >
                    {playingId === rec.id ? <Square size={14} className="fill-current sm:w-4 sm:h-4" /> : <Play size={14} className="fill-current ml-0.5 sm:ml-1 sm:w-4 sm:h-4" />}
                  </button>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-zinc-200 font-semibold text-xs sm:text-sm truncate">{rec.name}</span>
                    <span className="text-zinc-500 text-[10px] sm:text-xs truncate">{rec.duration.toFixed(2)}s • {new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => uploadTakeToCloud(rec)}
                    disabled={uploadingId === rec.id}
                    title="Salvar na Nuvem"
                    className="p-1.5 sm:p-2 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {uploadingId === rec.id ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : <CloudUpload size={16} />}
                  </button>

                  <button 
                    onClick={() => deleteLocalRecording(rec.id).then(() => getLocalRecordings().then(setLocalHistory))} 
                    className="p-1.5 sm:p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};