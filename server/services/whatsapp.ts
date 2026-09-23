import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers, proto, generateWAMessageFromContent, MessageType } = require('@whiskeysockets/baileys');
const pino = require('pino');

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
  private sock: any = null;
  private authState: any = null;
  private connecting = false;
  private currentQr: string | null = null;
  private sessionPath: string;

  constructor() {
    super();
    this.sessionPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || './session/lia');
    logger.info({ sessionPath: this.sessionPath }, 'WhatsApp session path');
  }

  async initialize(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    try {
      // Ensure session directory exists
      if (!fs.existsSync(this.sessionPath)) {
        fs.mkdirSync(this.sessionPath, { recursive: true });
      }

      // Load auth state from file system
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      this.authState = state;

      // Fetch latest Baileys version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info({ version, isLatest }, 'Baileys version');

      // Create socket
      this.sock = makeWASocket({
        auth: this.authState,
        version,
        logger: logger.child({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        generateHighQualityLinkPreview: true,
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logger.info('QR Code received');
          this.currentQr = qr;
          this.emit('qr', qr);
        }

        if (connection === 'open') {
          logger.info('WhatsApp connected');
          this.connecting = false;
          this.emit('connected');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const reason = lastDisconnect?.error?.message || 'Unknown';
          logger.warn({ statusCode, reason }, 'WhatsApp disconnected');
          this.connecting = false;
          this.emit('disconnected', reason);

          // Auto-reconnect unless logged out
          if (statusCode !== DisconnectReason.loggedOut) {
            setTimeout(() => this.initialize(), 5000);
          }
        }
      });

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async (m: any) => {
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue;

          const parsed = await this.parseMessage(msg);
          if (parsed) {
            this.emit('message', parsed);
          }
        }
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 60000);
        
        this.sock.ev.on('connection.update', (update: any) => {
          if (update.connection === 'open') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

    } catch (error) {
      this.connecting = false;
      logger.error({ error }, 'Failed to initialize WhatsApp');
      throw error;
    }
  }

  private async parseMessage(msg: any): Promise<WhatsAppMessage | null> {
    if (!msg.message) return null;

    let body = '';
    let type: WhatsAppMessage['type'] = 'text';
    let mediaMimeType: string | undefined;
    let mediaFileName: string | undefined;

    const messageContent = msg.message;

    if (messageContent.conversation) {
      body = messageContent.conversation;
    } else if (messageContent.extendedTextMessage) {
      body = messageContent.extendedTextMessage.text;
    } else if (messageContent.imageMessage) {
      type = 'image';
      body = messageContent.imageMessage.caption || '';
      mediaMimeType = messageContent.imageMessage.mimetype;
    } else if (messageContent.documentMessage) {
      type = 'document';
      body = messageContent.documentMessage.caption || '';
      mediaMimeType = messageContent.documentMessage.mimetype;
      mediaFileName = messageContent.documentMessage.fileName;
    } else if (messageContent.audioMessage) {
      type = 'audio';
      mediaMimeType = messageContent.audioMessage.mimetype;
    } else if (messageContent.videoMessage) {
      type = 'video';
      mediaMimeType = messageContent.videoMessage.mimetype;
    }

    if (!body && type === 'text') return null;

    const chatId = msg.key.remoteJid;
    const isGroup = chatId?.endsWith('@g.us') || false;

    return {
      id: msg.key.id || `msg-${Date.now()}`,
      from: msg.key.remoteJid || '',
      fromMe: msg.key.fromMe || false,
      body,
      timestamp: (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
      type,
      mediaMimeType,
      mediaFileName,
      chatName: '',
      isGroup,
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
    if (!this.sock) return false;
    try {
      // Format JID if needed
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text });
      return true;
    } catch (error: any) {
      logger.error({ error: error?.message || error, stack: error?.stack, to }, 'Failed to send text');
      return false;
    }
  }

  isConnected(): boolean {
    return this.sock?.ws?.readyState === 1; // WebSocket.OPEN
  }

  getClient(): any {
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