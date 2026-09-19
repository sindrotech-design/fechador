import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { proto, WASocket } from '@whiskeysockets/baileys';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

let qrcodeModule: any;

async function getQrcode() {
  if (!qrcodeModule) {
    const mod = await import('qrcode-terminal');
    qrcodeModule = mod.default || mod;
  }
  return qrcodeModule;
}

// Cache bust: 2024-09-19

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = pino({ level: 'info' });

export interface WhatsAppServiceEvents {
  'qr': (qr: string) => void;
  'connected': () => void;
  'disconnected': (reason: string) => void;
  'message': (message: WhatsAppMessage) => void;
  'message-update': (update: MessageUpdate) => void;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  fromMe: boolean;
  body: string;
  timestamp: number;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  chatName?: string;
  isGroup: boolean;
}

export interface MessageUpdate {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null;
  private sessionPath: string;
  private connecting = false;

  constructor() {
    super();
    this.sessionPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || './session/lia');
  }

  async initialize(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Dynamic import of baileys (ESM)
      const { default: makeWASocket } = await import('@whiskeysockets/baileys');
      
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Fechador Lia', 'Chrome', '1.0'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;
        
        logger.debug({ connection, hasQr: !!qr, receivedPendingNotifications }, 'WhatsApp connection update');
        
        if (qr) {
          logger.info('QR Code received');
          const qrcode = await getQrcode();
          qrcode(qr, { small: true });
          this.emit('qr', qr);
        }

        if (connection === 'open') {
          logger.info('WhatsApp connected');
          this.connecting = false;
          this.emit('connected');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== 401 && statusCode !== 403;
          logger.warn({ statusCode, shouldReconnect, error: lastDisconnect?.error?.message }, 'WhatsApp disconnected');
          this.emit('disconnected', lastDisconnect?.error?.message || 'Unknown');
          
          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 5000);
          } else {
            this.connecting = false;
            // Clear session and restart
            fs.rmSync(this.sessionPath, { recursive: true, force: true });
            setTimeout(() => this.initialize(), 5000);
          }
        }

        if (connection === 'connecting') {
          logger.info('WhatsApp connecting...');
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
          for (const msg of messages) {
            if (!msg.key.fromMe) {
              const parsed = this.parseMessage(msg);
              if (parsed) {
                this.emit('message', parsed);
              }
            }
          }
        }
      });

      this.sock.ev.on('messages.update', async (updates: any[]) => {
        for (const update of updates) {
          this.emit('message-update', {
            id: update.key?.id || '',
            status: update.status || 'sent',
          });
        }
      });

    } catch (error) {
      this.connecting = false;
      logger.error({ error }, 'Failed to initialize WhatsApp');
      throw error;
    }
  }

  private parseMessage(msg: proto.IWebMessageInfo): WhatsAppMessage | null {
    if (!msg.message) return null;

    const key = msg.key || {};
    const from = key.remoteJid || '';
    const isGroup = from.endsWith('@g.us');
    const chatName = msg.pushName || '';
    
    let body = '';
    let type: WhatsAppMessage['type'] = 'text';
    let mediaUrl: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaFileName: string | undefined;

    if (msg.message.conversation) {
      body = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
      body = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage) {
      type = 'image';
      body = msg.message.imageMessage.caption || '';
      mediaMimeType = msg.message.imageMessage.mimetype || undefined;
    } else if (msg.message.documentMessage) {
      type = 'document';
      body = msg.message.documentMessage.caption || '';
      mediaMimeType = msg.message.documentMessage.mimetype || undefined;
      mediaFileName = msg.message.documentMessage.fileName || undefined;
    } else if (msg.message.audioMessage) {
      type = 'audio';
    } else if (msg.message.videoMessage) {
      type = 'video';
      body = msg.message.videoMessage.caption || '';
      mediaMimeType = msg.message.videoMessage.mimetype || undefined;
    }

    const timestamp = typeof msg.messageTimestamp === 'number' 
        ? msg.messageTimestamp * 1000 
        : typeof msg.messageTimestamp === 'string' 
          ? parseInt(msg.messageTimestamp, 10) * 1000 
          : Date.now();
    
    return {
      id: key.id || '',
      from,
      fromMe: !!key.fromMe,
      body,
      timestamp,
      type,
      mediaUrl,
      mediaMimeType,
      mediaFileName,
      chatName,
      isGroup,
    };
  }

  async sendText(to: string, text: string): Promise<boolean> {
    if (!this.sock) return false;
    try {
      await this.sock.sendMessage(to, { text });
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send text');
      return false;
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.sock) return false;
    try {
      await this.sock.sendMessage(to, { image: { url: imageUrl }, caption });
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send image');
      return false;
    }
  }

  async sendImageBuffer(to: string, buffer: Buffer, caption?: string, mimeType = 'image/jpeg'): Promise<boolean> {
    if (!this.sock) return false;
    try {
      await this.sock.sendMessage(to, { image: buffer, caption, mimetype: mimeType });
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send image buffer');
      return false;
    }
  }

  isConnected(): boolean {
    // @ts-ignore - ws property exists on socket
    return this.sock?.ws?.readyState === 1; // WebSocket.OPEN
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  async logout(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
  }
}

export const whatsappService = new WhatsAppService();