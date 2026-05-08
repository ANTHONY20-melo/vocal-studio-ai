import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'pt' | 'en';

interface Translations {
  title: string;
  subtitle: string;
  recorderTitle: string;
  composerTitle: string;
  composerPlaceholder: string;
  composerButton: string;
  dashboardTitle: string;
  recorderRhythmPrompt: string;
  customRhythmPlaceholder: string;
  masterVolume: string;
  vocalTrackVolume: string;
  aiTrackVolume: string;
  reverb: string;
  delayTime: string;
  delayFeedback: string;
  suggestRhythm: string;
  exportWav: string;
  studioHistory: string;
  recordingLive: string;
  voiceStyleLabel: string;
  vocalInsights: string;
  voiceStyles: { [key: string]: string };
  features: {
    hd: { title: string; desc: string };
    ai: { title: string; desc: string };
    mix: { title: string; desc: string };
  };
  sidebar: {
    studio: string;
    library: string;
    mixer: string;
    effects: string;
    insights: string;
    export: string;
  }
}

const translations: Record<Language, Translations> = {
  pt: {
    title: "TOM-TUNE",
    subtitle: "Grave sua voz com IA",
    recorderTitle: "Gravador de Voz",
    composerTitle: "Compositor de Letras",
    composerPlaceholder: "Cole sua letra aqui...",
    composerButton: "IA, Cante minha letra!",
    suggestRhythm: "Sugerir Ritmos",
    dashboardTitle: "Minhas Produções IA",
    recorderRhythmPrompt: "Ritmos sugeridos para sua voz:",
    customRhythmPlaceholder: "Ou digite outro ritmo...",
    masterVolume: "Volume Principal",
    vocalTrackVolume: "Volume Vocal",
    aiTrackVolume: "Volume Música IA",
    reverb: "Reverb",
    delayTime: "Tempo de Delay",
    delayFeedback: "Feedback de Delay",
    vocalInsights: "Análise Vocal IA",
    exportWav: "Exportar WAV",
    studioHistory: "Fitas Master (Local)",
    recordingLive: "GRAVANDO",
    voiceStyleLabel: "Estilo de Voz (IA)",
    voiceStyles: {
      femalePop: "Feminina Pop (Médio)",
      maleRock: "Masculina Rock (Rasgado)",
      maleDeep: "Masculina Grave (Barítono)",
      femaleHigh: "Feminina Aguda (Soprano)",
      maleHigh: "Masculino Agudo (Tenor)",
      falsetto: "Voz com Falsete (Leve)",
      melismatic: "Com Melismas (R&B/Gospel)",
      soulful: "Soul & R&B Profundo",
      gospelFemale: "Gospel Feminino (Potente)",
      gospelMale: "Gospel Masculino (Adoração)"
    },
    features: {
      hd: { title: "Captura HD", desc: "Áudio cru gravado em 44.1kHz." },
      ai: { title: "Masterização IA", desc: "Ajuste de tom automático." },
      mix: { title: "Pronto para Mix", desc: "Arquivo pronto para sua DAW." }
    },
    sidebar: {
      studio: "Estúdio Principal",
      library: "Biblioteca de Samples",
      mixer: "Mixer & Canais",
      effects: "Rack de Efeitos",
      insights: "Insights IA",
      export: "Exportar Projeto"
    }
  },
  en: {
    title: "TOM-TUNE",
    subtitle: "Record your voice with AI",
    recorderTitle: "Voice Recorder",
    composerTitle: "Lyrics Composer",
    composerPlaceholder: "Paste your lyrics here...",
    composerButton: "AI, Sing my lyrics!",
    suggestRhythm: "Suggest Rhythms",
    dashboardTitle: "My AI Productions",
    recorderRhythmPrompt: "Rhythms suggested for your voice:",
    masterVolume: "Master Volume",
    vocalTrackVolume: "Vocal Track Volume",
    aiTrackVolume: "AI Music Volume",
    reverb: "Reverb",
    delayTime: "Delay Time",
    delayFeedback: "Delay Feedback",
    vocalInsights: "AI Vocal Analysis",
    exportWav: "Export WAV",
    studioHistory: "Master Tapes (Local)",
    recordingLive: "ON AIR / REC",
    voiceStyleLabel: "Voice Style (AI)",
    voiceStyles: {
      femalePop: "Female Pop (Mid)",
      maleRock: "Male Rock (Gritty)",
      maleDeep: "Deep Male (Baritone)",
      femaleHigh: "High Female (Soprano)",
      maleHigh: "High Male (Tenor)",
      falsetto: "Falsetto Voice (Light)",
      melismatic: "Melismatic (R&B/Gospel)",
      soulful: "Deep Soul & R&B",
      gospelFemale: "Gospel Female (Powerful)",
      gospelMale: "Gospel Male (Worship)"
    },
    customRhythmPlaceholder: "Or type another rhythm...",
    features: {
      hd: { title: "HD Capture", desc: "Raw audio recorded at 44.1kHz." },
      ai: { title: "AI Mastering", desc: "Automatic pitch correction." },
      mix: { title: "Mix Ready", desc: "Ready for your favorite DAW." }
    },
    sidebar: {
      studio: "Main Studio",
      library: "Sample Library",
      mixer: "Mixer & Channels",
      effects: "Effects Rack",
      insights: "AI Insights",
      export: "Export Project"
    }
  }
};

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};