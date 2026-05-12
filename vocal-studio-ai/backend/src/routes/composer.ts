import { Router } from 'express';
import axios from 'axios'; 

const composerRoutes = Router();

// Cache em memória para gerenciar o status da interface
const jobs = new Map<string, { 
  status: 'processing' | 'completed' | 'failed', 
  audioUrl?: string, 
  rhythm: string, 
  voiceStyle?: string
}>();

composerRoutes.post('/generate', async (req, res) => {
  const { lyrics, rhythm, voiceStyle, userId } = req.body;

  if (!lyrics) {
    return res.status(400).json({ error: 'A letra é obrigatória.' });
  }

  // Identificador interno da tarefa
  const taskId = Math.random().toString(36).substring(7);
  
  // 1. Imediatamente avisa o frontend que começou a processar
  jobs.set(taskId, { status: 'processing', rhythm, voiceStyle });
  res.json({ taskId, message: 'Gerando voz via RapidAPI...' });

  // 2. Faz a chamada real para a RapidAPI em background
  try {
    console.log(`[Composer AI] Enviando letra para MeloTTS...`);

    // Pegamos a chave do .env, ou usamos a sua (cuidado com ela exposta aqui!)
    const apiKey = process.env.RAPIDAPI_KEY || 'd7b9ab3a34mshd802c430fe6c7b1p11f6e8jsn3d8852a0b276';

    const response = await axios.post(
      'https://melotts-api-multilingual-text-to-speech-audio-generator.p.rapidapi.com/api/generate/text-speech', 
      {
        prompt: lyrics, // Enviamos a letra digitada pelo usuário
        outputType: 'binary'
      }, 
      {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'melotts-api-multilingual-text-to-speech-audio-generator.p.rapidapi.com',
          'x-rapidapi-key': apiKey
        },
        // CRÍTICO: Avisa o axios para não corromper o arquivo de áudio binário
        responseType: 'arraybuffer' 
      }
    );

    // 3. O áudio voltou em formato binário. Vamos converter para Base64 (URL tocável no navegador)
    const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // 4. Salva como concluído para o Frontend pegar no próximo "status check"
    jobs.set(taskId, { 
      status: 'completed', 
      audioUrl: audioDataUrl, 
      rhythm, 
      voiceStyle 
    });
    console.log(`[Composer AI] Áudio gerado com sucesso para a tarefa ${taskId}!`);

  } catch (error: any) {
    console.error('[RapidAPI Error]:', error.response?.data?.toString() || error.message);
    jobs.set(taskId, { status: 'failed', rhythm, voiceStyle });
  }
});

// Rota de Polling do Frontend
composerRoutes.get('/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const job = jobs.get(taskId);

  if (!job) {
    return res.status(404).json({ error: 'Tarefa não encontrada.' });
  }

  return res.json(job);
});

export default composerRoutes;