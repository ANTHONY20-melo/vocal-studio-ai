import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import { useStudioStore } from '@store/useStudioStore';

export const Mixer: React.FC = () => {
  const { t } = useLanguage();
  const {
    masterVolume,
    vocalTrackVolume,
    aiTrackVolume,
    setMasterVolume,
    setVocalTrackVolume,
    setAiTrackVolume,
  } = useStudioStore();

  const handleVolumeChange = (setter: (vol: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(parseFloat(e.target.value));
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="text-indigo-500" size={20} />
        <h3 className="font-bold text-slate-800 dark:text-white">{t.sidebar.mixer}</h3>
      </div>

      <div className="space-y-4">
        {/* Master Volume */}
        <div>
          <label htmlFor="masterVolume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.masterVolume} ({Math.round(masterVolume * 100)}%)</label>
          <input
            type="range"
            id="masterVolume"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={handleVolumeChange(setMasterVolume)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          />
        </div>

        {/* Individual Track Volumes (placeholders for now) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vocal Track Volume */}
          <div>
            <label htmlFor="vocalTrackVolume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.vocalTrackVolume} ({Math.round(vocalTrackVolume * 100)}%)</label>
            <input type="range" id="vocalTrackVolume" min="0" max="1" step="0.01" value={vocalTrackVolume} onChange={handleVolumeChange(setVocalTrackVolume)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
          </div>
          {/* AI Music Volume */}
          <div>
            <label htmlFor="aiTrackVolume" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.aiTrackVolume} ({Math.round(aiTrackVolume * 100)}%)</label>
            <input type="range" id="aiTrackVolume" min="0" max="1" step="0.01" value={aiTrackVolume} onChange={handleVolumeChange(setAiTrackVolume)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
};