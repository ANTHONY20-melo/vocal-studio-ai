// backend/src/server.ts
import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import composerRoutes from './routes/composer.js';

dotenv.config();

const app = express();

// Configuração do CORS atualizada e definitiva
const corsOptions = {
  origin: [
    'http://localhost:5173', // Para seus testes locais no PC
    'https://vocal-studio-ai.vercel.app', // Seu site oficial na Vercel
    process.env.FRONTEND_URL // Caso adicione variáveis extras no Render
  ].filter(Boolean) as string[], // Evita URLs vazias
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Aplica a regra de segurança para TODAS as rotas do servidor de uma vez
app.use(cors(corsOptions));
app.use(express.json());

// Configurando o cliente Supabase (usando variáveis de ambiente)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configurando o Multer para manter o arquivo em memória RAM
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // Limite de 50MB por take de voz
  fileFilter: (_req, file, cb) => {
    // Aceita apenas webm (comum em MediaRecorder) ou mp3/wav
    if (file.mimetype === 'audio/webm' || file.mimetype === 'audio/wav' || file.mimetype === 'audio/mpeg') {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado. Envie WebM, WAV ou MP3.'));
    }
  }
});

// Ativando as rotas do Compositor de IA (CORS já foi aplicado globalmente acima)
app.use('/api/composer', composerRoutes);

// Rota de Upload
app.post('/api/studio/process', upload.single('audio'), async (req: Request, res: Response): Promise<any> => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    }

    const userId = req.body.userId || 'anonymous-user';

    // 1. Gera um nome de arquivo único
    const uniqueId = crypto.randomUUID();
    const fileName = `takes/${userId}/${Date.now()}-${uniqueId}.webm`;

    // Validação básica de segurança do tipo de arquivo
    if (!file.mimetype.startsWith('audio/')) {
      return res.status(400).json({ error: 'O arquivo enviado não é um áudio válido.' });
    }

    // 2. Faz o upload direto do buffer de memória para o Supabase Storage (bucket: 'vocal-takes')
    const { data: storageData, error: storageError } = await supabase.storage
      .from('vocal-takes')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) throw storageError;

    // 3. (Futuro) Aqui você vai inserir o job na fila do Redis (BullMQ) 
    // para as GPUs processarem a IA usando o storageData.path
    
    // Retorna sucesso para o Frontend
    return res.status(200).json({
      message: 'Áudio recebido com sucesso. Iniciando processamento IA...',
      filePath: storageData.path
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return res.status(500).json({ error: 'Erro interno ao processar o áudio.' });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🎙️ VocalStudio Backend rodando na porta ${PORT}`);
});