import React from 'react';
import { Wand2, Waves, Clock } from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import { useStudioStore } from '@store/useStudioStore';

export const EffectsRack: React.FC = () => {
  const { t } = useLanguage();
  const {
    reverbWetDry,
    delayTime,
    delayFeedback,
    setReverbWetDry,
    setDelayTime,
    setDelayFeedback,
  } = useStudioStore();

  const handleEffectChange = (setter: (val: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(parseFloat(e.target.value));
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="text-indigo-500" size={20} />
        <h3 className="font-bold text-slate-800 dark:text-white">{t.sidebar.effects}</h3>
      </div>

      <div className="space-y-4">
        {/* Reverb Control */}
        <div>
          <label htmlFor="reverbWetDry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            <Waves size={14} className="inline-block mr-1" /> {t.reverb} ({Math.round(reverbWetDry * 100)}%)
          </label>
          <input
            type="range"
            id="reverbWetDry"
            min="0"
            max="1"
            step="0.01"
            value={reverbWetDry}
            onChange={handleEffectChange(setReverbWetDry)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          />
        </div>

        {/* Delay Time Control */}
        <div>
          <label htmlFor="delayTime" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            <Clock size={14} className="inline-block mr-1" /> {t.delayTime} ({delayTime.toFixed(2)}s)
          </label>
          <input
            type="range"
            id="delayTime"
            min="0"
            max="2"
            step="0.01"
            value={delayTime}
            onChange={handleEffectChange(setDelayTime)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          />
        </div>

        {/* Delay Feedback Control */}
        <div>
          <label htmlFor="delayFeedback" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            <Waves size={14} className="inline-block mr-1" /> {t.delayFeedback} ({Math.round(delayFeedback * 100)}%)
          </label>
          <input
            type="range"
            id="delayFeedback"
            min="0"
            max="0.9"
            step="0.01"
            value={delayFeedback}
            onChange={handleEffectChange(setDelayFeedback)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
          />
        </div>
      </div>
    </div>
  );
};