import { google, sheets_v4 } from 'googleapis';
import pino from 'pino';

const logger = pino({ level: 'info' });

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || '1D4KLUIg9iQz0OPuaQTnGWVEs618W7AU11XOPx3A3BXE';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

export interface SheetRow {
  [key: string]: any;
}

export async function appendToSheet(sheetName: string, values: any[][]): Promise<boolean> {
  try {
    const client = getSheetsClient();
    await client.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return true;
  } catch (error) {
    logger.error({ error, sheetName }, 'Failed to append to sheet');
    return false;
  }
}

export async function updateSheetRow(sheetName: string, rowIndex: number, values: any[]): Promise<boolean> {
  try {
    const client = getSheetsClient();
    const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
    await client.spreadsheets.values.update({
      spreadsheetId: SHEETS_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
    return true;
  } catch (error) {
    logger.error({ error, sheetName, rowIndex }, 'Failed to update sheet row');
    return false;
  }
}

export async function getSheetData(sheetName: string): Promise<any[][]> {
  try {
    const client = getSheetsClient();
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: `${sheetName}!A:Z`,
    });
    return res.data.values || [];
  } catch (error) {
    logger.error({ error, sheetName }, 'Failed to get sheet data');
    return [];
  }
}

export async function syncOrderToSheets(order: any): Promise<boolean> {
  try {
    // Try Apps Script first (more reliable for private sheets)
    if (APPS_SCRIPT_URL) {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'appendOrder',
          data: {
            orderId: order.id,
            date: new Date(order.createdAt).toLocaleString('pt-BR'),
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            items: order.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(', '),
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            deliveryType: order.deliveryType,
            address: order.address || '',
            status: order.status,
          },
        }),
      });
      
      const result = await response.json() as { success: boolean };
      if (result.success) return true;
      logger.warn({ result }, 'Apps Script returned error, trying direct API');
    }

    // Fallback to direct API
    const values = [[
      order.id,
      new Date(order.createdAt).toLocaleString('pt-BR'),
      order.customerName,
      order.customerPhone,
      order.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(', '),
      order.subtotal,
      order.deliveryFee,
      order.total,
      order.paymentMethod,
      order.paymentStatus,
      order.deliveryType,
      order.address || '',
      order.status,
    ]];
    
    return await appendToSheet('Vendas', values);
  } catch (error) {
    logger.error({ error, orderId: order.id }, 'Failed to sync order to sheets');
    return false;
  }
}

export async function syncDeliveryToSheets(delivery: any): Promise<boolean> {
  try {
    if (APPS_SCRIPT_URL) {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'appendDelivery',
          data: {
            deliveryId: delivery.id,
            orderId: delivery.orderId,
            date: new Date(delivery.createdAt).toLocaleString('pt-BR'),
            customerName: delivery.customerName,
            customerPhone: delivery.customerPhone,
            address: delivery.address,
            items: delivery.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(', '),
            total: delivery.total,
            status: delivery.status,
          },
        }),
      });
      
      const result = await response.json() as { success: boolean };
      if (result.success) return true;
    }

    const values = [[
      delivery.id,
      delivery.orderId,
      new Date(delivery.createdAt).toLocaleString('pt-BR'),
      delivery.customerName,
      delivery.customerPhone,
      delivery.address,
      delivery.items.map((i: any) => `${i.product.name} x${i.quantity}`).join(', '),
      delivery.total,
      delivery.status,
    ]];
    
    return await appendToSheet('Entregas', values);
  } catch (error) {
    logger.error({ error, deliveryId: delivery.id }, 'Failed to sync delivery to sheets');
    return false;
  }
}

export async function updateOrderStatusInSheets(orderId: string, status: string, paymentStatus?: string): Promise<boolean> {
  try {
    if (APPS_SCRIPT_URL) {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateOrderStatus',
          data: { orderId, status, paymentStatus },
        }),
      });
      
      const result = await response.json() as { success: boolean };
      if (result.success) return true;
    }

    // Direct API would need to find the row first - skip for now
    return false;
  } catch (error) {
    logger.error({ error, orderId, status }, 'Failed to update order status in sheets');
    return false;
  }
}

export async function updateDeliveryStatusInSheets(deliveryId: string, status: string): Promise<boolean> {
  try {
    if (APPS_SCRIPT_URL) {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDeliveryStatus',
          data: { deliveryId, status },
        }),
      });
      
      const result = await response.json() as { success: boolean };
      if (result.success) return true;
    }
    return false;
  } catch (error) {
    logger.error({ error, deliveryId, status }, 'Failed to update delivery status in sheets');
    return false;
  }
}

export async function syncStockToSheets(products: any[]): Promise<boolean> {
  try {
    const values = products.map(p => [
      p.id,
      p.name,
      p.price,
      p.stock,
      p.category,
      p.imageUrl || '',
    ]);
    
    // Clear and rewrite
    const client = getSheetsClient();
    await client.spreadsheets.values.clear({
      spreadsheetId: SHEETS_ID,
      range: 'Estoque!A2:F',
    });
    
    return await appendToSheet('Estoque', values);
  } catch (error) {
    logger.error({ error }, 'Failed to sync stock to sheets');
    return false;
  }
}

export async function testSheetsConnection(): Promise<boolean> {
  try {
    if (APPS_SCRIPT_URL) {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const result = await response.json() as { success: boolean };
      return result.success === true;
    }
    // Test direct API
    await getSheetData('Estoque');
    return true;
  } catch (error) {
    logger.error({ error }, 'Sheets connection test failed');
    return false;
  }
}