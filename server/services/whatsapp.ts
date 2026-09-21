import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Set Puppeteer cache directory BEFORE any puppeteer modules are loaded
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer';
// Explicitly set the Chrome executable path
process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/tmp/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome';

const { Client, LocalAuth, Message, MessageMedia } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');

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
  private client: any = null;
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
      // Get Chromium executable path for Puppeteer
      let executablePath: string | undefined;
      try {
        const puppeteer = require('puppeteer');
        executablePath = await puppeteer.executablePath();
        logger.info({ executablePath }, 'Found Chromium executable');
      } catch (error) {
        logger.warn({ error }, 'Could not find Chromium executable, will try without explicit path');
      }

      this.client = new Client({
        authStrategy: new LocalAuth({ 
          dataPath: this.sessionPath,
          clientId: 'fechador-lia' // Unique client ID to avoid conflicts with other bots
        }),
        puppeteer: {
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (() => {
            try {
              const glob = require('glob');
              const path = require('path');
              const puppeteerCache = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer';
              // More flexible glob pattern to find chrome executable
              const chromePaths = glob.sync(path.join(puppeteerCache, 'chrome', '**', 'chrome'));
              if (chromePaths.length > 0) {
                return chromePaths[0];
              }
              // Fallback: try common locations
              const fallbackPaths = [
                path.join('/tmp/puppeteer', 'chrome', '**', 'chrome'),
                path.join(puppeteerCache, 'chrome', 'chrome-linux64', 'chrome'),
                path.join(puppeteerCache, 'chrome', '**', 'chrome-linux64', 'chrome'),
                '/tmp/puppeteer/chrome-linux/chrome',
                '/tmp/puppeteer/chrome/linux-*/chrome-linux64/chrome',
                // New fallback for the exact path structure used by @puppeteer/browsers
                path.join(puppeteerCache, 'chrome', 'linux-*', 'chrome-linux64', 'chrome'),
              ];
              for (const pattern of fallbackPaths) {
                const matches = require('glob').sync(pattern);
                if (matches.length > 0) {
                  return matches[0];
                }
              }
              return undefined;
            } catch (error) {
              logger.warn({ error }, 'Could not find Chromium executable, will try without explicit path');
              return undefined;
            }
          })(),
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

      this.client.on('message', async (message: any) => {
        if (message.fromMe) return;
        
        const parsed = this.parseMessage(message);
        if (parsed) {
          this.emit('message', parsed);
        }
      });

      this.client.on('message_ack', (msg: any, ack: number) => {
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

  private async parseMessage(message: any): Promise<WhatsAppMessage | null> {
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
        mediaMimeType = (message as any).mimetype;
        break;
      case 'document':
        type = 'document';
        mediaMimeType = (message as any).mimetype;
        mediaFileName = (message as any).filename;
        break;
      case 'audio':
        type = 'audio';
        mediaMimeType = (message as any).mimetype;
        break;
      case 'video':
        type = 'video';
        mediaMimeType = (message as any).mimetype;
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
      const MessageMedia = require('whatsapp-web.js').MessageMedia;
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
      const MessageMedia = require('whatsapp-web.js').MessageMedia;
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

  getClient(): any {
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