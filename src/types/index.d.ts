export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
    category: 'site' | 'internal';
    description?: string;
}
export interface CartItem {
    product: Product;
    quantity: number;
}
export interface Order {
    id: string;
    customerName: string;
    customerPhone: string;
    items: CartItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    paymentMethod: 'pix' | 'card' | 'cash' | 'mercadopago';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    deliveryType: 'delivery' | 'pickup';
    address?: string;
    status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
    mercadoPagoId?: string;
    mercadoPagoStatus?: string;
    createdAt: Date;
    updatedAt: Date;
    confirmedAt?: Date;
    deliveredAt?: Date;
}
export interface Delivery {
    id: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    address: string;
    items: CartItem[];
    total: number;
    status: 'pending' | 'ready' | 'out_for_delivery' | 'delivered';
    deliveryType?: 'delivery' | 'pickup';
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Event {
    id: string;
    name: string;
    date: string;
    description: string;
    active: boolean;
}
export interface AffiliateLink {
    id: string;
    platform: 'mercadolivre' | 'aliexpress';
    productName: string;
    url: string;
    commission?: number;
}
export interface ChatMessage {
    id: string;
    chatId: string;
    fromMe: boolean;
    body: string;
    timestamp: Date;
    type: 'text' | 'image' | 'order' | 'payment_link';
    orderId?: string;
    mediaUrl?: string;
}
export interface Chat {
    id: string;
    contactName: string;
    contactPhone: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    messages: ChatMessage[];
    isGroup: boolean;
}
export interface Settings {
    mercadoPagoAccessToken: string;
    mercadoPagoPublicKey: string;
    appsScriptUrl: string;
    storePixKey: string;
    deliveryFee: number;
    storeName: string;
    storeWhatsApp: string;
    storeCity: string;
    storeState: string;
    storeSite: string;
}
export interface StockSyncResult {
    success: boolean;
    message: string;
    updatedProducts?: Product[];
}
export interface SheetsSyncResult {
    success: boolean;
    message: string;
    rowsUpdated?: number;
}
//# sourceMappingURL=index.d.ts.map