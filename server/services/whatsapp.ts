import { Client, LocalAuth, Message, MessageMedia, MessageTypes } from 'whatsapp-web.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import QRCode from 'qrcode';

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
  private client: Client | null = null;
  private sessionPath: string;
  private connecting = false;
  private currentQr: string | null = null;

  constructor() {
    super();
    this.sessionPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || './session/lia');
  }

  async initialize(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: this.sessionPath }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
      });

      this.client.on('qr', (qr: string) => {
        logger.info('QR Code received');
        this.currentQr = qr;
        this.emit('qr', qr);
      });

      this.client.on('ready', () => {
        logger.info('WhatsApp connected');
        this.connecting = false;
        this.emit('connected');
      });

      this.client.on('disconnected', (reason: string) => {
        logger.warn({ reason }, 'WhatsApp disconnected');
        this.connecting = false;
        this.emit('disconnected', reason);
        
        // Auto-reconnect
        setTimeout(() => this.initialize(), 5000);
      });

      this.client.on('message', async (message: Message) => {
        if (message.fromMe) return;
        
        const parsed = this.parseMessage(message);
        if (parsed) {
          this.emit('message', parsed);
        }
      });

      this.client.on('message_ack', (msg, ack) => {
        this.emit('message-update', {
          id: msg.id._serialized,
          status: this.mapAckToStatus(ack),
        });
      });

      await this.client.initialize();
      
    } catch (error) {
      this.connecting = false;
      logger.error({ error }, 'Failed to initialize WhatsApp');
      throw error;
    }
  }

  private mapAckToStatus(ack: number): MessageUpdate['status'] {
    switch (ack) {
      case 1: return 'sent';
      case 2: return 'delivered';
      case 3: return 'read';
      default: return 'pending';
    }
  }

  private async parseMessage(message: Message): Promise<WhatsAppMessage | null> {
    if (!message.body && message.type !== 'image' && message.type !== 'document') return null;

    const chat = await message.getChat();
    const contact = await message.getContact();
    
    let type: WhatsAppMessage['type'] = 'text';
    let mediaUrl: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaFileName: string | undefined;

    switch (message.type) {
      case 'image':
        type = 'image';
        mediaMimeType = message.getMedia().mimetype;
        break;
      case 'document':
        type = 'document';
        mediaMimeType = message.getMedia().mimetype;
        mediaFileName = message.getMedia().filename;
        break;
      case 'audio':
        type = 'audio';
        mediaMimeType = message.getMedia().mimetype;
        break;
      case 'video':
        type = 'video';
        mediaMimeType = message.getMedia().mimetype;
        break;
    }

    return {
      id: message.id._serialized,
      from: message.from,
      fromMe: message.fromMe,
      body: message.body || '',
      timestamp: message.timestamp * 1000,
      type,
      mediaUrl: message.mediaKey ? undefined : message.body,
      mediaMimeType,
      mediaFileName,
      chatName: chat?.name || contact?.pushname || '',
      isGroup: chat?.isGroup || false,
    };
  }

  async getQrImageBase64(): Promise<string | null> {
    if (!this.currentQr) return null;
    try {
      return await QRCode.toDataURL(this.currentQr, {
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate QR image');
      return null;
    }
  }

  getCurrentQr(): string | null {
    return this.currentQr;
  }

  async sendText(to: string, text: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.sendMessage(to, text);
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send text');
      return false;
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const media = await MessageMedia.fromUrl(imageUrl);
      await this.client.sendMessage(to, media, { caption });
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send image');
      return false;
    }
  }

  async sendImageBuffer(to: string, buffer: Buffer, caption?: string, mimeType = 'image/jpeg'): Promise<boolean> {
    if (!this.client) return false;
    try {
      const media = new MessageMedia(mimeType, buffer.toString('base64'));
      await this.client.sendMessage(to, media, { caption });
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Failed to send image buffer');
      return false;
    }
  }

  isConnected(): boolean {
    return this.client?.info?.wid ? true : false;
  }

  getClient(): Client | null {
    return this.client;
  }

  async logout(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }
}

export const whatsappService = new WhatsAppService();