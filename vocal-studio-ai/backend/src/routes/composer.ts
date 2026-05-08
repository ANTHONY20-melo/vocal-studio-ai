import { Router } from 'express';
import axios from 'axios'; // Para fazer requisições HTTP para APIs externas

const composerRoutes = Router();

// Simulação de banco de dados de tarefas na memória
const jobs = new Map<string, { status: 'processing' | 'completed' | 'failed', audioUrl?: string, rhythm: string }>();

composerRoutes.post('/generate', async (req, res) => {
  const { lyrics, rhythm, voiceStyle, userId } = req.body;

  if (!lyrics || !rhythm || !userId) {
    return res.status(400).json({ error: 'Letra, ritmo e ID do usuário são obrigatórios.' });
  }

  console.log(`[Composer AI] Recebida solicitação de composição para o usuário ${userId}:`);
  console.log(`- Letra: "${lyrics.substring(0, 50)}..."`);
  console.log(`- Ritmo: ${rhythm}`);
  console.log(`- Estilo de Voz: ${voiceStyle}`);

  try {
    const taskId = Math.random().toString(36).substring(7);
    
    // Registra a tarefa como processando
    jobs.set(taskId, { status: 'processing', rhythm });

    // Dispara a integração em background (Simulação de processo assíncrono)
    // Aqui você chamaria a API da Suno com wait_audio: false
    setTimeout(() => {
      const mockAudioUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 8) + 1}.mp3`;
      const job = jobs.get(taskId);
      if (job) {
        jobs.set(taskId, { ...job, status: 'completed', audioUrl: mockAudioUrl });
      }
    }, 15000); // Simula 15 segundos de composição

    return res.json({ taskId, message: 'Composição iniciada!' });
  } catch (error) {
    console.error('Erro ao chamar API de IA de composição:', error);
    return res.status(500).json({ error: 'Erro ao gerar música com IA.' });
  }
});

// Nova rota para o Frontend verificar o status
composerRoutes.get('/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const job = jobs.get(taskId);

  if (!job) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  return res.json(job);
});


export default composerRoutes;
