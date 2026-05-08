import React, { useState, useRef, useEffect } from 'react';
import { Music, Sparkles, Loader2, CheckCircle2, AlertCircle, UserCircle2, Play, Pause } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStudioStore } from '../store/useStudioStore';

export const AIComposer: React.FC = () => {
  const { t } = useLanguage();
  const [lyrics, setLyrics] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Limpa o polling se o componente for desmontado para evitar memory leaks
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Mapeamento de demonstrações (Exemplos reais seriam necessários no futuro)
  const voiceStylePreviews: Record<string, string> = {
    femalePop: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    femaleHigh: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    gospelFemale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    maleDeep: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    maleHigh: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    maleRock: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    gospelMale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    falsetto: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    melismatic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    soulful: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  };

  // Usar o ritmo selecionado globalmente do VocalRecorder, se houver
  const { 
    selectedRhythm, 
    selectedVoiceStyle,
    generatedSongUrl, 
    setGeneratedSongUrl, 
    setSelectedRhythm, 
    setSelectedVoiceStyle,
    addSong 
  } = useStudioStore();

  // Ritmos padrão se nenhum for selecionado no VocalRecorder
  const defaultRhythms = ['Gospel', 'Pagode', 'Axé', 'Bolero', 'Sertanejo', 'Trap'];
  const rhythmsToDisplay = selectedRhythm && selectedRhythm.trim() !== "" 
    ? [selectedRhythm, ...defaultRhythms.filter(r => r !== selectedRhythm)] 
    : defaultRhythms;

  const togglePreview = () => {
    if (previewAudioRef.current) {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
      } else {
        previewAudioRef.current.play();
      }
      setIsPreviewPlaying(!isPreviewPlaying);
    }
  };

  const handleHelpWithLyrics = async () => {
    if (!lyrics) {
      setComposerError("Escreva pelo menos uma frase para eu te ajudar!");
      return;
    }
    
    setIsComposing(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
    
    try {
      const response = await fetch(`${API_URL}/api/composer/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics, rhythm: selectedRhythm }),
      });
      
      const data = await response.json();
      setLyrics(prev => prev + "\n" + data.suggestion);
    } catch (error) {
      setComposerError("Não consegui pensar em rimas agora...");
    } finally {
      setIsComposing(false);
    }
  };

  const handleComposeSong = async () => {
    const rhythmToUse = selectedRhythm || defaultRhythms[0];
    if (!lyrics) {
      setComposerError("Por favor, insira a letra da música.");
      return;
    }

    setIsComposing(true);
    setComposerError(null);
    setGeneratedSongUrl(null); // Limpa a URL anterior

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

    try {
      const response = await fetch(`${API_URL}/api/composer/generate`, { // Usando API_URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics,
          rhythm: rhythmToUse,
          voiceStyle: selectedVoiceStyle,
          userId: 'user-123'
        }),
      });

      if (!response.ok) throw new Error('Falha na geração da música');
      const data = await response.json();
      
      // Inicia o Polling
      const taskId = data.taskId;
      
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      
      pollIntervalRef.current = setInterval(async () => {
        try { // Usando API_URL
          const statusRes = await fetch(`${API_URL}/api/composer/status/${taskId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setGeneratedSongUrl(statusData.audioUrl);
            setIsComposing(false);
            
            // Adiciona automaticamente ao Dashboard
            addSong({
              id: taskId,
              title: `Nova Obra ${statusData.rhythm}`,
              url: statusData.audioUrl,
              rhythm: statusData.rhythm,
              createdAt: new Date().toLocaleTimeString()
            });
          } else if (statusData.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setComposerError("A IA teve um problema ao cantar sua letra.");
            setIsComposing(false);
          }
        } catch (e) {
          console.error("Erro no polling:", e);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setComposerError("Conexão perdida com o servidor de IA.");
          setIsComposing(false);
        }
      }, 3000); // Checa a cada 3 segundos
    } catch (error) {
      setComposerError("Erro ao compor a música com a IA. Tente novamente.");
      console.error("Erro ao compor música:", error);
      setIsComposing(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-indigo-500" size={20} />
        <h3 className="font-bold text-slate-800 dark:text-white">{t.composerTitle}</h3>
      </div>

      <div className="relative">
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={t.composerPlaceholder}
          className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all text-slate-900 dark:text-white"
        />
        <button 
          onClick={handleHelpWithLyrics}
          className="absolute bottom-3 right-3 p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-110 transition-transform"
          title="Pedir ajuda para a IA com a letra"
        >
          <Sparkles size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Voice Style Selector */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
            <UserCircle2 size={12} /> {t.voiceStyleLabel}
          </p>
          <div className="flex gap-2">
            <select 
              value={selectedVoiceStyle || ''} 
              onChange={(e) => setSelectedVoiceStyle(e.target.value)}
              className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="femalePop">{t.voiceStyles?.femalePop}</option>
              <option value="femaleHigh">{t.voiceStyles?.femaleHigh}</option>
              <option value="gospelFemale">{t.voiceStyles?.gospelFemale}</option>
              <option value="maleDeep">{t.voiceStyles?.maleDeep}</option>
              <option value="maleHigh">{t.voiceStyles?.maleHigh}</option>
              <option value="maleRock">{t.voiceStyles?.maleRock}</option>
              <option value="gospelMale">{t.voiceStyles?.gospelMale}</option>
              <option value="falsetto">{t.voiceStyles?.falsetto}</option>
              <option value="melismatic">{t.voiceStyles?.melismatic}</option>
              <option value="soulful">{t.voiceStyles?.soulful}</option>
            </select>
            <button 
              onClick={togglePreview}
              className="px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700"
              title="Ouvir amostra da voz"
            >
              {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </div>
          <audio 
            ref={previewAudioRef} 
            src={voiceStylePreviews[selectedVoiceStyle || 'femalePop']} 
            onEnded={() => setIsPreviewPlaying(false)}
            className="hidden" 
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{t.suggestRhythm}</p>
          <div className="flex flex-wrap gap-2">
            {rhythmsToDisplay.map(r => (
              <button 
                key={r}
                onClick={() => setSelectedRhythm(r)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  selectedRhythm === r
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-indigo-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleComposeSong}
          disabled={!lyrics || !selectedRhythm || isComposing}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20" // Adicionado disabled
        >
          {isComposing ? <Loader2 className="animate-spin" size={18} /> : <Music size={18} />}
          {t.composerButton}
        </button>

        {generatedSongUrl && (
          <div className="mt-4">
            <p className="text-sm font-medium text-green-400 flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} /> Música gerada com sucesso!
            </p>
            <audio src={generatedSongUrl} controls className="w-full h-12 rounded-lg" />
          </div>
        )}

        {composerError && (
          <div className="flex items-center gap-2 text-red-400 mt-4">
            <AlertCircle size={18} />
            <span>{composerError}</span>
          </div>
        )}
      </div>
    </div>
  );
};