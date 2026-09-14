import { Product, Order, Delivery, Event, AffiliateLink, Chat, ChatMessage, Settings } from '../types/index.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

// In-memory store (replace with DB later)
class Store {
  products: Map<string, Product> = new Map();
  orders: Map<string, Order> = new Map();
  deliveries: Map<string, Delivery> = new Map();
  events: Map<string, Event> = new Map();
  affiliateLinks: Map<string, AffiliateLink> = new Map();
  chats: Map<string, Chat> = new Map();
  settings: Settings = {
    mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    mercadoPagoPublicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
    appsScriptUrl: process.env.APPS_SCRIPT_URL || '',
    storePixKey: process.env.STORE_PIX_KEY || 'sindrotech@gmail.com',
    deliveryFee: parseFloat(process.env.DELIVERY_FEE || '6.99'),
    storeName: process.env.STORE_NAME || 'SindroTech',
    storeWhatsApp: process.env.STORE_WHATSAPP || '5565981283108',
    storeCity: process.env.STORE_CITY || 'Cuiabá',
    storeState: process.env.STORE_STATE || 'MT',
    storeSite: process.env.STORE_SITE || 'https://www.sindrotech.com.br',
  };

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Produtos do site
    this.products.set('cabo-tipo-c', {
      id: 'cabo-tipo-c',
      name: 'Cabo Tipo-C',
      price: 30,
      stock: 3,
      imageUrl: 'https://www.sindrotech.com.br/images/cabo-tipo-c.jpg',
      category: 'site',
      description: 'Cabo USB Tipo-C 1m original',
    });

    this.products.set('cabo-iphone', {
      id: 'cabo-iphone',
      name: 'Cabo iPhone Lightning',
      price: 30,
      stock: 6,
      imageUrl: 'https://www.sindrotech.com.br/images/cabo-iphone.jpg',
      category: 'site',
      description: 'Cabo Lightning 1m original',
    });

    this.products.set('fone-bluetooth', {
      id: 'fone-bluetooth',
      name: 'Fone Bluetooth com microfone',
      price: 60,
      stock: 4,
      imageUrl: 'https://www.sindrotech.com.br/images/fone-bluetooth.jpg',
      category: 'site',
      description: 'Fone Bluetooth com microfone, até 8h de bateria',
    });

    // Produtos internos (planilha)
    this.products.set('fone-fio', {
      id: 'fone-fio',
      name: 'Fone com fio',
      price: 25,
      stock: 10,
      category: 'internal',
      description: 'Fone de ouvido com fio P2',
    });

    this.products.set('fonte', {
      id: 'fonte',
      name: 'Fonte carregador',
      price: 35,
      stock: 8,
      category: 'internal',
      description: 'Fonte 5V 2A bivolt',
    });

    this.products.set('cabo-v8', {
      id: 'cabo-v8',
      name: 'Cabo V8 (Micro USB)',
      price: 20,
      stock: 12,
      category: 'internal',
      description: 'Cabo Micro USB 1m',
    });

    // Eventos do dia
    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
    this.events.set('sexta-cabo', {
      id: 'sexta-cabo',
      name: 'Sexta do Cabo',
      date: today,
      description: 'Promoção especial em cabos hoje!',
      active: true,
    });

    // Links de afiliado (exemplos)
    this.affiliateLinks.set('ml-cabo-c', {
      id: 'ml-cabo-c',
      platform: 'mercadolivre',
      productName: 'Cabo Tipo-C 1m',
      url: 'https://mercadolivre.com.br/seu-link-afiliado-cabo-c',
      commission: 5.00,
    });

    this.affiliateLinks.set('ae-fone-bt', {
      id: 'ae-fone-bt',
      platform: 'aliexpress',
      productName: 'Fone Bluetooth',
      url: 'https://aliexpress.com/seu-link-afiliado-fone-bt',
      commission: 8.00,
    });

    logger.info('Store seeded with initial data');
  }

  // Products
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  getProduct(id: string): Product | undefined {
    return this.products.get(id);
  }

  getProductsByCategory(category: 'site' | 'internal'): Product[] {
    return Array.from(this.products.values()).filter(p => p.category === category);
  }

  updateProductStock(id: string, quantity: number): boolean {
    const product = this.products.get(id);
    if (!product) return false;
    product.stock = Math.max(0, product.stock - quantity);
    return true;
  }

  restoreProductStock(id: string, quantity: number): boolean {
    const product = this.products.get(id);
    if (!product) return false;
    product.stock += quantity;
    return true;
  }

  // Orders
  createOrder(order: Order): Order {
    this.orders.set(order.id, order);
    return order;
  }

  getOrder(id: string): Order | undefined {
    return this.orders.get(id);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateOrder(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  // Deliveries
  createDelivery(delivery: Delivery): Delivery {
    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  getDelivery(id: string): Delivery | undefined {
    return this.deliveries.get(id);
  }

  getAllDeliveries(): Delivery[] {
    return Array.from(this.deliveries.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateDelivery(id: string, updates: Partial<Delivery>): Delivery | undefined {
    const delivery = this.deliveries.get(id);
    if (!delivery) return undefined;
    const updated = { ...delivery, ...updates, updatedAt: new Date() };
    this.deliveries.set(id, updated);
    return updated;
  }

  // Events
  getAllEvents(): Event[] {
    return Array.from(this.events.values());
  }

  getActiveEvents(): Event[] {
    return Array.from(this.events.values()).filter(e => e.active);
  }

  // Affiliate Links
  getAllAffiliateLinks(): AffiliateLink[] {
    return Array.from(this.affiliateLinks.values());
  }

  getAffiliateLink(platform: 'mercadolivre' | 'aliexpress', productName: string): AffiliateLink | undefined {
    return Array.from(this.affiliateLinks.values()).find(
      l => l.platform === platform && l.productName.toLowerCase().includes(productName.toLowerCase())
    );
  }

  // Chats
  getOrCreateChat(contactPhone: string, contactName: string, isGroup = false): Chat {
    const chatId = isGroup ? contactPhone : `55${contactPhone.replace(/\D/g, '')}@c.us`;
    let chat = this.chats.get(chatId);
    
    if (!chat) {
      chat = {
        id: chatId,
        contactName,
        contactPhone,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0,
        messages: [],
        isGroup,
      };
      this.chats.set(chatId, chat);
    }
    return chat;
  }

  getChat(chatId: string): Chat | undefined {
    return this.chats.get(chatId);
  }

  getAllChats(): Chat[] {
    return Array.from(this.chats.values()).sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
  }

  addMessage(chatId: string, message: ChatMessage): Chat | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;
    
    chat.messages.push(message);
    chat.lastMessage = message.body;
    chat.lastMessageTime = message.timestamp;
    if (!message.fromMe) chat.unreadCount++;
    
    this.chats.set(chatId, chat);
    return chat;
  }

  markChatAsRead(chatId: string): Chat | undefined {
    const chat = this.chats.get(chatId);
    if (!chat) return undefined;
    chat.unreadCount = 0;
    this.chats.set(chatId, chat);
    return chat;
  }

  // Settings
  getSettings(): Settings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...updates };
    return this.getSettings();
  }

  // Generate IDs
  generateOrderId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `ST-${dateStr}${random}`;
  }

  generateDeliveryId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `ENT-${dateStr}${random}`;
  }
}

export const store = new Store();