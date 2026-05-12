import { Router } from 'express';
import axios from 'axios'; 

const composerRoutes = Router();

// Cache avançado: Guarda o ID interno e o ID que a IA do Suno devolver
const jobs = new Map<string, { 
  status: 'processing' | 'completed' | 'failed', 
  audioUrl?: string, 
  rhythm: string, 
  voiceStyle?: string,
  sunoTaskId?: string 
}>();

// 1. ROTA DE ENVIO: Manda a letra e o estilo para a IA compor
composerRoutes.post('/generate', async (req, res) => {
  const { lyrics, rhythm, voiceStyle, userId } = req.body;

  if (!lyrics) {
    return res.status(400).json({ error: 'A letra é obrigatória.' });
  }

  const taskId = Math.random().toString(36).substring(7);
  
  // Avisa o seu frontend (React) que a panela começou a ferver
  jobs.set(taskId, { status: 'processing', rhythm, voiceStyle });
  res.json({ taskId, message: 'Enviando para os estúdios do Suno AI...' });

  try {
    console.log(`[Composer AI] Iniciando composição Musical: ${rhythm} - ${voiceStyle}`);

    // SUA CHAVE DA RAPID API (Recomendo depois colocar isso no .env do Render por segurança)
    const apiKey = process.env.RAPIDAPI_KEY || 'd7b9ab3a34mshd802c430fe6c7b1p11f6e8jsn3d8852a0b276';

    // Dispara a requisição para gerar a música (Ajustado para o endpoint /music)
    const response = await axios.post(
      'https://suno-api.p.rapidapi.com/api/suno/v1/music', // <-- Mudei de /lyrics para /music
      {
        prompt: lyrics,
        // Injetamos o Ritmo e o Estilo de voz para a IA criar o instrumental e cantar no estilo certo
        tags: `${rhythm}, ${voiceStyle}, brazilian portuguese, high quality, studio recording`, 
        make_instrumental: false,
        title: "VocalStudio Take"
      }, 
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'suno-api.p.rapidapi.com', // <-- Seu Host
          'x-rapidapi-key': apiKey                      // <-- Sua Chave
        }
      }
    );

    // O Suno devolve um ID da música que está sendo "renderizada". 
    // Dependendo do wrapper, ele pode voltar como array ou objeto. Cobrimos ambos os casos:
    const sunoTaskId = response.data[0]?.id || response.data?.id || response.data?.task_id;
    
    if (!sunoTaskId) throw new Error("A IA não retornou o ID da música.");

    // Atualiza nosso banco de dados local com o ID da IA
    jobs.set(taskId, { status: 'processing', rhythm, voiceStyle, sunoTaskId });
    console.log(`[Composer AI] Música enviada para renderização! ID do Suno: ${sunoTaskId}`);

  } catch (error: any) {
    console.error('[Composer Error]:', error.response?.data || error.message);
    jobs.set(taskId, { status: 'failed', rhythm, voiceStyle });
  }
});

// 2. ROTA DE CHECAGEM: O seu Frontend fica perguntando aqui a cada 3 segundos
composerRoutes.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const job = jobs.get(taskId);

  if (!job) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  // Se já concluiu ou falhou antes, ou não tem o ID do Suno, só devolve como está
  if (job.status !== 'processing' || !job.sunoTaskId) {
    return res.json(job);
  }

  try {
    const apiKey = process.env.RAPIDAPI_KEY || 'd7b9ab3a34mshd802c430fe6c7b1p11f6e8jsn3d8852a0b276';

    // Pergunta à IA: "A música do ID tal já renderizou?"
    // Ajustado para o endpoint padrão de status da maioria das APIs Suno
    const response = await axios.get(
      `https://suno-api.p.rapidapi.com/api/suno/v1/music?id=${job.sunoTaskId}`,
      {
        headers: {
          'Accept': 'application/json',
          'x-rapidapi-host': 'suno-api.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        }
      }
    );

    // Pega o primeiro áudio retornado
    const track = Array.isArray(response.data) ? response.data[0] : response.data;

    // Se a música ficou pronta, a API devolve o link do MP3/WAV!
    if (track?.status === 'complete' || track?.status === 'success' || track?.audio_url) {
      job.status = 'completed';
      job.audioUrl = track.audio_url; 
      jobs.set(taskId, job);
      console.log(`[Composer AI] 🎵 Música PRONTA! URL: ${job.audioUrl}`);
    } 
    // Se a IA bloqueou por erro
    else if (track?.status === 'failed' || track?.status === 'error') {
      job.status = 'failed';
      jobs.set(taskId, job);
      console.log(`[Composer AI] ❌ Falha na geração da IA.`);
    }

    return res.json(job);

  } catch (error: any) {
    console.error('[Status Check Error]:', error.message);
    // Retorna processing para não quebrar o frontend se der um erro de rede temporário
    return res.json(job); 
  }
});

export default composerRoutes;