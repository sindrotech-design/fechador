declare module 'whatsapp-web.js' {
  export interface ClientOptions {
    authStrategy?: any;
    puppeteer?: any;
    webVersionCache?: any;
    printQRInTerminal?: boolean;
    logger?: any;
    browser?: string[];
  }
  
  export class Client {
    constructor(options: ClientOptions);
    initialize(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    sendMessage(to: string, content: any, options?: any): Promise<any>;
    sendMessage(to: string, media: any, options?: any): Promise<any>;
    logout(): Promise<void>;
    info?: { wid: { user: string; server: string } };
  }
  
  export interface LocalAuthOptions {
    dataPath?: string;
    clientId?: string;
  }
  
  export class LocalAuth {
    constructor(options?: LocalAuthOptions);
  }
  
  export class MessageMedia {
    static fromUrl(url: string): Promise<MessageMedia>;
    constructor(mimetype: string, data: string, filename?: string);
  }
  
  export interface Message {
    id: { _serialized: string };
    from: string;
    fromMe: boolean;
    body: string;
    type: string;
    timestamp: number;
    fromMe: boolean;
    getChat(): Promise<any>;
    getContact(): Promise<any>;
    getMedia(): Promise<any>;
    mimetype?: string;
    filename?: string;
    mediaKey?: string;
    body: string;
    type: string;
    timestamp: number;
    from: string;
    fromMe: boolean;
    getChat(): Promise<any>;
    getContact(): Promise<any>;
    getMedia(): Promise<any>;
    mimetype?: string;
    filename?: string;
  }
  
  export interface Chat {
    name?: string;
    isGroup?: boolean;
  }
  
  export interface Contact {
    pushname?: string;
  }
}