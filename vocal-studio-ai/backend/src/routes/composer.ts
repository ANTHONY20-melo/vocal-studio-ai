import { Router } from 'express';
import axios from 'axios'; 

const composerRoutes = Router();

// Mantemos um cache local temporário para gerenciar as chamadas
const jobs = new Map<string, { status: 'processing' | 'completed' | 'failed', audioUrl?: string, rhythm: string, externalId?: string }>();

// Rota 1: Envia a letra para a IA gerar a música
composerRoutes.post('/generate', async (req, res) => {
  const { lyrics, rhythm, voiceStyle, userId } = req.body;

  if (!lyrics || !rhythm) {
    return res.status(400).json({ error: 'Letra e ritmo são obrigatórios.' });
  }

  console.log(`[Composer AI] Iniciando composição Real para ${userId || 'Anônimo'}...`);

  try {
    const taskId = Math.random().toString(36).substring(7);
    jobs.set(taskId, { status: 'processing', rhythm });

    // === INTEGRAÇÃO COM A API REAL DA IA ===
    // Exemplo usando uma API comum de wrapper do Suno v3.5
    // Você precisa ter a variável SUNO_API_KEY no seu .env do Render
    
    if (!process.env.SUNO_API_KEY) {
        console.warn("⚠️ CHAVE DA API NÃO ENCONTRADA! Usando modo de simulação.");
        // Fallback de segurança caso você não tenha colocado a chave no Render ainda
        setTimeout(() => {
          jobs.set(taskId, { status: 'completed', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', rhythm });
        }, 5000);
        return res.json({ taskId, message: 'Simulação iniciada (Chave ausente)' });
    }

    const response = await axios.post('https://suno-api-url-aqui.com/api/custom_generate', {
      prompt: lyrics,
      tags: `${rhythm}, ${voiceStyle}`,
      title: "Take VocalStudio",
      make_instrumental: false,
      wait_audio: false // Retorna o ID imediatamente para não dar timeout no servidor
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Salva o ID que a IA externa devolveu para consultarmos depois
    const externalId = response.data[0].id;
    jobs.set(taskId, { status: 'processing', rhythm, externalId });

    return res.json({ taskId, message: 'Composição enviada para os servidores da IA!' });

  } catch (error) {
    console.error('Erro ao chamar API de IA:', error);
    return res.status(500).json({ error: 'Erro de comunicação com o motor de IA.' });
  }
});

// Rota 2: O Frontend fica perguntando "Já ficou pronto?"
composerRoutes.get('/status/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const job = jobs.get(taskId);

  if (!job) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  // Se já terminou ou falhou, devolve o que tem
  if (job.status !== 'processing' || !job.externalId) {
    return res.json(job);
  }

  try {
    // Se está processando e tem chave da API, pergunta pra IA se a música já renderizou
    const response = await axios.get(`https://suno-api-url-aqui.com/api/get?ids=${job.externalId}`, {
      headers: { 'Authorization': `Bearer ${process.env.SUNO_API_KEY}` }
    });

    const aiTrack = response.data[0];

    if (aiTrack.status === 'streaming' || aiTrack.status === 'complete') {
      // A música ficou pronta! Salva a URL do áudio (geralmente mp3 ou wav)
      job.status = 'completed';
      job.audioUrl = aiTrack.audio_url;
      jobs.set(taskId, job);
    } else if (aiTrack.status === 'error') {
      job.status = 'failed';
      jobs.set(taskId, job);
    }

    return res.json(job);
  } catch (error) {
    console.error('Erro ao verificar status na IA:', error);
    return res.json(job); // Retorna processando se der erro temporário de rede
  }
});

export default composerRoutes;