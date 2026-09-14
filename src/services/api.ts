const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // WhatsApp
  whatsapp: {
    getStatus: () => request<{ connected: boolean }>('/whatsapp/status'),
    getQR: () => request<{ connected: boolean; message: string }>('/whatsapp/qr'),
    reconnect: () => request<{ success: boolean }>('/whatsapp/reconnect', { method: 'POST' }),
    getChats: () => request<any[]>('/whatsapp/chats'),
    getChat: (chatId: string) => request<any>(`/whatsapp/chats/${chatId}`),
    markRead: (chatId: string) => request<any>(`/whatsapp/chats/${chatId}/read`, { method: 'POST' }),
    sendMessage: (chatId: string, message: string) => request<{ success: boolean }>(`/whatsapp/chats/${chatId}/send`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
    confirmPayment: (orderId: string) => request<{ success: boolean }>(`/whatsapp/admin/confirm-payment/${orderId}`, { method: 'POST' }),
    updateDelivery: (deliveryId: string, status: string) => request<{ success: boolean }>(`/whatsapp/admin/delivery/${deliveryId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  },

  // Orders
  orders: {
    getAll: () => request<any[]>('/orders'),
    get: (id: string) => request<any>(`/orders/${id}`),
    create: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    confirmPayment: (id: string) => request<any>(`/orders/${id}/confirm-payment`, { method: 'POST' }),
  },

  // Products
  products: {
    getAll: () => request<any[]>('/products'),
    getByCategory: (category: 'site' | 'internal') => request<any[]>(`/products/category/${category}`),
    get: (id: string) => request<any>(`/products/${id}`),
    updateStock: (id: string, quantity: number, operation: 'add' | 'subtract') => request<any>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, operation }),
    }),
    syncStock: () => request<{ success: boolean }>('/products/sync-stock', { method: 'POST' }),
  },

  // Deliveries
  deliveries: {
    getAll: () => request<any[]>('/deliveries'),
    get: (id: string) => request<any>(`/deliveries/${id}`),
    updateStatus: (id: string, status: string) => request<any>(`/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    getByStatus: (status: string) => request<any[]>(`/deliveries/status/${status}`),
  },

  // Events
  events: {
    getAll: () => request<any[]>('/events'),
    getActive: () => request<any[]>('/events/active'),
  },

  // Community
  community: {
    getAffiliates: () => request<any[]>('/community/affiliates'),
    getAffiliate: (platform: string, productName: string) => request<any>(`/community/affiliates/${platform}/${productName}`),
  },

  // Settings
  settings: {
    get: () => request<any>('/settings'),
    update: (data: any) => request<any>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
    testSheets: () => request<{ success: boolean; message: string }>('/settings/test-sheets', { method: 'POST' }),
    testMercadoPago: () => request<{ success: boolean; message: string }>('/settings/test-mercadopago', { method: 'POST' }),
  },

  // Sheets
  sheets: {
    getData: (sheetName: string) => request<{ sheet: string; data: any[][] }>(`/sheets/${sheetName}`),
    getSheets: () => request<{ sheets: string[] }>('/sheets'),
  },

  // Mercado Pago
  mercadopago: {
    createPreference: (data: any) => request<any>('/mercadopago/preference', { method: 'POST', body: JSON.stringify(data) }),
    getPayment: (externalReference: string) => request<any>(`/mercadopago/payment/${externalReference}`),
    confirmPayment: (orderId: string) => request<{ success: boolean }>(`/mercadopago/confirm/${orderId}`, { method: 'POST' }),
  },
};