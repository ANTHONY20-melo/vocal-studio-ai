import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Song {
  id: string;
  title: string;
  url: string;
  rhythm: string;
  createdAt: string;
}

interface StudioState {
  isRecording: boolean;
  isUploading: boolean;
  audioUrl: string | null;
  audioBlob: Blob | null;
  volumeLevel: number;
  lastFilePath: string | null;
  error: string | null;
  recordingDuration: number;
  selectedRhythm: string | null; // Adicionado para o ritmo selecionado
  selectedVoiceStyle: string | null; // Adicionado para o estilo de voz (homem/mulher, agudo/grave, etc)
  generatedSongUrl: string | null; // Adicionado para a URL da música gerada pela IA
  isMuted: boolean; // Novo: Mute global
  songs: Song[];
  // Mixer States
  masterVolume: number;
  vocalTrackVolume: number;
  aiTrackVolume: number;
  // Effects States
  reverbWetDry: number;
  delayTime: number;
  delayFeedback: number;

  setRecording: (isRecording: boolean) => void;
  setUploading: (isUploading: boolean) => void;
  setAudioUrl: (url: string | null) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setVolumeLevel: (level: number) => void;
  setLastFilePath: (path: string | null) => void;
  setError: (error: string | null) => void;
  clearAudio: () => void;
  setRecordingDuration: (duration: number) => void;
  setSelectedRhythm: (rhythm: string | null) => void; // Setter para o ritmo
  setIsMuted: (muted: boolean) => void; // Novo setter
  setSelectedVoiceStyle: (style: string | null) => void; // Setter para o estilo de voz
  setGeneratedSongUrl: (url: string | null) => void; // Setter para a música gerada
  addSong: (song: Song) => void;
  removeSong: (id: string) => void;
  renameSong: (id: string, newTitle: string) => void;
  // Mixer Actions
  setMasterVolume: (volume: number) => void;
  setVocalTrackVolume: (volume: number) => void;
  setAiTrackVolume: (volume: number) => void;
  // Effects Actions
  setReverbWetDry: (amount: number) => void;
  setDelayTime: (time: number) => void;
  setDelayFeedback: (feedback: number) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      isRecording: false,
      isUploading: false,
      audioUrl: null,
      audioBlob: null,
      volumeLevel: 0,
      lastFilePath: null,
      error: null,
      recordingDuration: 0,
      selectedRhythm: null,
      selectedVoiceStyle: 'Female Pop',
      isMuted: false,
      generatedSongUrl: null,
      songs: [],
      masterVolume: 0.7,
      vocalTrackVolume: 0.8,
      aiTrackVolume: 0.8,
      reverbWetDry: 0.2,
      delayTime: 0.5,
      delayFeedback: 0.3,

      setRecording: (isRecording) => set({ isRecording }),
      setUploading: (isUploading) => set({ isUploading }),
      setAudioUrl: (audioUrl) => set({ audioUrl }),
      setAudioBlob: (audioBlob) => set({ audioBlob }),
      setVolumeLevel: (volumeLevel) => set({ volumeLevel }),
      setLastFilePath: (lastFilePath) => set({ lastFilePath }),
      setError: (error) => set({ error }),
      clearAudio: () => set({ audioUrl: null, audioBlob: null, lastFilePath: null, error: null, recordingDuration: 0, selectedRhythm: null, generatedSongUrl: null }),
      setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
      setSelectedRhythm: (selectedRhythm) => set({ selectedRhythm }),
      setIsMuted: (isMuted) => set({ isMuted }),
      setSelectedVoiceStyle: (selectedVoiceStyle) => set({ selectedVoiceStyle }),
      setGeneratedSongUrl: (generatedSongUrl) => set({ generatedSongUrl }),
      addSong: (song) => set((state) => ({ songs: [song, ...state.songs] })),
      removeSong: (id) => set((state) => ({ songs: state.songs.filter(s => s.id !== id) })),
      renameSong: (id, newTitle) => set((state) => ({
        songs: state.songs.map(s => s.id === id ? { ...s, title: newTitle } : s)
      })),
      setMasterVolume: (masterVolume) => set({ masterVolume }),
      setVocalTrackVolume: (vocalTrackVolume) => set({ vocalTrackVolume }),
      setAiTrackVolume: (aiTrackVolume) => set({ aiTrackVolume }),
      setReverbWetDry: (reverbWetDry) => set({ reverbWetDry }),
      setDelayTime: (delayTime) => set({ delayTime }),
      setDelayFeedback: (delayFeedback) => set({ delayFeedback }),
    }),
    {
      name: 'tomtune-storage', // Nome da chave no localStorage
    }
  )
);