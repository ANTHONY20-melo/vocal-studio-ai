import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, BarChart3, Music as MusicIcon, Trash2, Edit2 } from 'lucide-react';
import { useStudioStore } from '@store/useStudioStore';
import { useLanguage } from '@context/LanguageContext';

export const AIDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { songs, removeSong, renameSong, masterVolume, aiTrackVolume, isMuted, volumeLevel, isRecording } = useStudioStore();

  // Sincroniza o volume do hardware virtual com o elemento de áudio real
  useEffect(() => {
    if (audioRef.current) {
      // Lógica de Smart Ducking: Se estiver gravando e detectando voz (> 10%), abaixa a música em 70%
      const duckingFactor = (isRecording && volumeLevel > 10) ? 0.3 : 1.0;
      audioRef.current.volume = isMuted ? 0 : (masterVolume * aiTrackVolume * duckingFactor);
    }
  }, [masterVolume, aiTrackVolume, playingId, isMuted, volumeLevel, isRecording]);

  const togglePlay = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      setPlayingId(id);
    }
  };

  const downloadSong = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.mp3`;
    link.click();
  };

  const handleRename = (id: string, oldTitle: string) => {
    const newTitle = prompt("Novo nome para a trilha:", oldTitle);
    if (newTitle) renameSong(id, newTitle);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="text-indigo-500" size={20} />
          {t.dashboardTitle}
        </h3>
      </div>
      
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {songs.length === 0 && (
          <p className="text-center text-slate-500 text-xs py-8 italic">Crie sua primeira música com a IA acima!</p>
        )}

        {songs.map(song => (
          <div key={song.id} className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded">
                <MusicIcon size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate w-32">{song.title}</p>
                <p className="text-[10px] text-slate-500 uppercase">{song.rhythm} • {song.createdAt}</p>
              </div>
            </div>
            <div className="flex gap-1 items-center relative z-30">
              <button 
                onClick={() => handleRename(song.id, song.title)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer">
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => togglePlay(song.id, song.url)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer">
                {playingId === song.id ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button 
                onClick={() => downloadSong(song.url, song.title)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer">
                <Download size={18} />
              </button>
              <button 
                onClick={() => removeSong(song.id)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};