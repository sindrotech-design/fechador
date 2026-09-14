import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import pino from 'pino';

const logger = pino({ level: 'info' });

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 5000,
    idempotencyKey: undefined,
  },
});

const preference = new Preference(client);
const payment = new Payment(client);

export interface CreatePreferenceData {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: 'BRL';
    description?: string;
    picture_url?: string;
  }>;
  payer?: {
    name?: string;
    email?: string;
    phone?: { area_code: string; number: string };
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference: string;
  notification_url?: string;
  statement_descriptor?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export async function createCheckoutPreference(data: CreatePreferenceData): Promise<PreferenceResponse> {
  try {
    const result = await preference.create({ body: data });
    return {
      id: result.id!,
      init_point: result.init_point!,
      sandbox_init_point: result.sandbox_init_point!,
    };
  } catch (error) {
    logger.error({ error, data }, 'Failed to create Mercado Pago preference');
    throw error;
  }
}

export async function getPayment(paymentId: string) {
  try {
    return await payment.get({ id: paymentId });
  } catch (error) {
    logger.error({ error, paymentId }, 'Failed to get payment');
    throw error;
  }
}

export async function getPaymentByExternalReference(externalReference: string) {
  try {
    const result = await payment.search({
      options: {
        // @ts-ignore - external_reference filter type issue in SDK
        filters: { external_reference: externalReference },
        limit: 1,
      },
    });
    return result.results?.[0] || null;
  } catch (error) {
    logger.error({ error, externalReference }, 'Failed to search payment');
    throw error;
  }
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

export { client };