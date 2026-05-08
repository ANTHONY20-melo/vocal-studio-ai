import { useState, useEffect } from 'react';
import { VocalRecorder } from './components/VocalRecorder';
import { AIComposer } from './components/AIComposer';
import { AIDashboard } from './components/AIDashboard';
import { Music2, Mic2, LayoutDashboard, Library, Sliders, Wand2, Download, VolumeX, Volume2, Activity, ShieldCheck, Share2, Menu, X } from 'lucide-react';
import { Mixer } from './components/Mixer'; // Importar o novo componente Mixer
import { EffectsRack } from './components/EffectsRack'; // Importar o novo componente EffectsRack
import { ThemeToggle } from './components/ThemeToggle';
import { useLanguage } from './context/LanguageContext'; // Corrigido
import { useStudioStore } from './store/useStudioStore';

function App() {
  const { t, setLanguage, language } = useLanguage();
  const { isMuted, setIsMuted, volumeLevel } = useStudioStore();
  const [activeTab, setActiveTab] = useState('studio');
  const [isMobileMenuOpen, setIsSidebarOpen] = useState(false);

  // Fecha o menu mobile ao trocar de aba
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="p-4 md:p-6 border-b border-slate-200 bg-white/50 backdrop-blur-md sticky top-0 z-50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isMobileMenuOpen)}
              className="p-2 lg:hidden text-slate-600 dark:text-slate-300"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <Music2 size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white italic">TOM<span className="text-indigo-500 font-light">TUNE</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Seletor de Idioma */}
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setLanguage('pt')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'pt' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
              >PT</button>
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded ${language === 'en' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
              >EN</button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Lateral Esquerda */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2
          lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <button 
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> <span className="text-sm font-medium">{t.sidebar.studio}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Library size={20} /> <span className="text-sm font-medium">{t.sidebar.library}</span>
          </button>

          <button 
            onClick={() => setActiveTab('mixer')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'mixer' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Sliders size={20} /> <span className="text-sm font-medium">{t.sidebar.mixer}</span>
          </button>

          <button 
            onClick={() => setActiveTab('effects')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'effects' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Wand2 size={20} /> <span className="text-sm font-medium">{t.sidebar.effects}</span>
          </button>

            <button 
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Activity size={20} /> <span className="text-sm font-medium">{t.sidebar.insights}</span>
            </button>

            <button 
              onClick={() => setActiveTab('share')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'share' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Share2 size={20} /> <span className="text-sm font-medium">Sessão ao Vivo</span>
            </button>

          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveTab('export')} className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${activeTab === 'export' ? 'bg-green-600 text-white' : 'hover:bg-green-600/10 text-green-500'}`}>
              <Download size={20} /> <span className="text-sm font-medium">{t.sidebar.export}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'studio' && (
              <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in zoom-in-95">
                {/* Main Recording Console */}
                <div className="flex-1 space-y-6">
                  <div className="min-h-[450px] flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-12 relative overflow-hidden">
                    {/* Detalhes Estéticos de Hardware */}
                    <div className="absolute top-8 left-10 flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    </div>
                    
                    <VocalRecorder />
                    
                    <div className="mt-8 grid grid-cols-2 gap-12 text-center border-t border-slate-100 dark:border-slate-800 pt-8 w-full max-w-xs">
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Input Gain</p>
                         <div className="text-xl font-mono text-indigo-500">+4.5dB</div>
                       </div>
                       <div>
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Sample Rate</p>
                         <div className="text-xl font-mono text-indigo-500">44.1kHz</div>
                       </div>
                    </div>
                  </div>

                  {/* Barra de Status de Hardware do Produtor */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
                    {['Buffer: 256', 'Latency: 2ms', 'AI Engine: V3', 'Cloud: Sync'].map((status) => (
                      <div key={status} className="px-4 py-2 bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        {status}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Control Room / Side Rack */}
                <div className="w-full xl:w-80 space-y-6">
                  <AIComposer />
                  <AIDashboard />
                </div>
              </div>
            )}

            {activeTab === 'mixer' && (
              <div className="lg:col-span-3 animate-in fade-in zoom-in-95">
                <Mixer />
              </div>
            )}

            {activeTab === 'effects' && (
              <div className="lg:col-span-3 animate-in fade-in zoom-in-95">
                <EffectsRack />
              </div>
            )}

            {activeTab === 'library' && (
              <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <Library size={48} className="mx-auto text-indigo-500 opacity-50" />
                <h2 className="text-2xl font-bold">Sua Biblioteca</h2>
                <p className="text-slate-500">Aqui ficarão todos os seus áudios brutos e arquivos importados.</p>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <Activity className="text-indigo-500" />
                  <h2 className="text-xl font-bold">{t.vocalInsights}</h2>
                  <p className="text-sm text-slate-500 italic">Análise em tempo real do seu desempenho vocal usando redes neurais.</p>
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(10, volumeLevel * 1.5))}%` }}></div>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Precisão de Pitch: {Math.round(Math.min(100, 60 + (volumeLevel / 2)))}%</p>
                </div>
                <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center text-center gap-3">
                  <ShieldCheck size={40} className={volumeLevel > 70 ? 'text-red-500' : 'text-green-500'} />
                  <h3 className="font-bold">Vocal Health</h3>
                  <p className="text-xs text-slate-500">{volumeLevel > 70 ? 'Cuidado: Nível de áudio muito alto!' : 'Sua voz está em excelentes condições hoje.'}</p>
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="p-8 bg-indigo-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95">
                <Share2 size={48} />
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Sessão Colaborativa</h2>
                <p className="max-w-md opacity-80">Compartilhe este código para que outros músicos possam acompanhar sua mixagem em tempo real.</p>
                <div className="w-48 h-48 bg-white p-4 rounded-3xl shadow-xl flex items-center justify-center">
                   <div className="w-full h-full bg-slate-200 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-[10px] font-bold">QR CODE IA</div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-6 animate-in zoom-in-95">
                <h2 className="text-2xl font-bold">Finalizar e Exportar</h2>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <button className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500">Baixar Mix Masterizado (MP3)</button>
                  <button className="py-3 px-6 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">Exportar Stems (WAV)</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8">
              <div className="p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center text-center gap-2">
                <Mic2 className="text-indigo-400" size={24} />
                <h3 className="font-medium">{t.features.hd.title}</h3>
                <p className="text-xs text-slate-500">{t.features.hd.desc}</p>
              </div>
              {/* ... manter os outros features cards ... */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;