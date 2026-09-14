import { store } from './store.js';
import { whatsappService, WhatsAppMessage } from './whatsapp.js';
import { createCheckoutPreference } from './mercadopago.js';
import { syncOrderToSheets, syncDeliveryToSheets } from './sheets.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

const settings = store.getSettings();
const DELIVERY_FEE = settings.deliveryFee;
const STORE_PIX_KEY = settings.storePixKey;
const STORE_SITE = settings.storeSite;
const STORE_CITY = settings.storeCity;
const STORE_STATE = settings.storeState;
const STORE_WHATSAPP = settings.storeWhatsApp;

interface LiaContext {
  stage: 'greeting' | 'menu' | 'product_inquiry' | 'selecting' | 'address' | 'payment' | 'completed' | 'affiliate' | 'community_help';
  currentProduct?: string;
  cart: Array<{ productId: string; quantity: number }>;
  customerName?: string;
  address?: string;
  deliveryType?: 'delivery' | 'pickup';
  orderId?: string;
  awaitingPaymentConfirm?: boolean;
}

const userContexts: Map<string, LiaContext> = new Map();

function getContext(phone: string): LiaContext {
  if (!userContexts.has(phone)) {
    userContexts.set(phone, { stage: 'greeting', cart: [] });
  }
  return userContexts.get(phone)!;
}

function resetContext(phone: string): void {
  userContexts.set(phone, { stage: 'greeting', cart: [] });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getProductListMessage(category?: 'site' | 'internal'): string {
  const products = category ? store.getProductsByCategory(category) : store.getAllProducts();
  const available = products.filter(p => p.stock > 0);
  
  if (available.length === 0) return 'Nenhum produto disponível no momento. 😔';
  
  let msg = '📦 *Catálogo SindroTech:*\n\n';
  available.forEach(p => {
    const badge = p.category === 'site' ? '🌐' : '📋';
    msg += `${badge} *${p.name}* - ${formatCurrency(p.price)} (${p.stock} un.)\n`;
  });
  msg += `\n💡 Digite o nome do produto que deseja ou "ver site" para ver o catálogo completo.`;
  return msg;
}

function getEventMessage(): string {
  const events = store.getActiveEvents();
  if (events.length === 0) return '';
  
  let msg = '\n🎉 *Evento de hoje:*\n';
  events.forEach(e => {
    msg += `📅 ${e.name}: ${e.description}\n`;
  });
  return msg;
}

function getGreetingMessage(): string {
  const eventMsg = getEventMessage();
  return `Olá! Sou a *Lia*, atendente da ${settings.storeName}. 👋

${eventMsg}

Como posso ajudar hoje?
1️⃣ Ver catálogo do site (entrega em ${STORE_CITY})
2️⃣ Ver estoque interno (retirada)
3️⃣ Sou da comunidade - quero link de afiliado
4️⃣ Falar com atendente humano

Digite o número ou me diga o que procura! 😊`;
}

function getSiteCatalogMessage(): string {
  const products = store.getProductsByCategory('site').filter(p => p.stock > 0);
  let msg = `🌐 *Catálogo do Site (${STORE_SITE})*\n\n`;
  msg += `Entrega em ${STORE_CITY}-${STORE_STATE}: +${formatCurrency(DELIVERY_FEE)} ou retirada sem taxa\n`;
  msg += `Horário: 08h–13h / 14h–18h\n`;
  msg += `WhatsApp da loja: ${STORE_WHATSAPP}\n\n`;
  
  products.forEach(p => {
    msg += `✅ *${p.name}* - ${formatCurrency(p.price)} (${p.stock} un.)\n`;
  });
  
  msg += '\n📍 *Para quem é de Cuiabá:* Sempre indico comprar pelo site!\n';
  msg += 'Digite o nome do produto que quer ou "voltar".';
  return msg;
}

function getInternalCatalogMessage(): string {
  const products = store.getProductsByCategory('internal').filter(p => p.stock > 0);
  let msg = `📋 *Estoque Interno (não está no site)*\n\n`;
  msg += `Apenas retirada na loja - sem taxa de entrega\n\n`;
  
  products.forEach(p => {
    msg += `📦 *${p.name}* - ${formatCurrency(p.price)} (${p.stock} un.)\n`;
  });
  
  msg += '\nDigite o nome do produto ou "voltar".';
  return msg;
}

function getProductDetailMessage(productId: string): string {
  const product = store.getProduct(productId);
  if (!product) return 'Produto não encontrado. 😔';
  
  let msg = `📦 *${product.name}*\n`;
  msg += `💰 Preço: ${formatCurrency(product.price)}\n`;
  msg += `📊 Estoque: ${product.stock} unidades\n`;
  msg += `📝 ${product.description || 'Sem descrição'}\n`;
  msg += `🏷️ ${product.category === 'site' ? 'Disponível no site' : 'Apenas estoque interno (retirada)'}\n\n`;
  
  if (product.category === 'site') {
    msg += `🚚 Entrega em ${STORE_CITY}: +${formatCurrency(DELIVERY_FEE)}\n`;
    msg += `🏪 Retirada na loja: Sem taxa\n`;
    msg += `🔗 Ver no site: ${STORE_SITE}\n\n`;
  } else {
    msg += `🏪 Apenas retirada na loja (sem taxa)\n\n`;
  }
  
  msg += 'Quer levar? Digite "quero" + quantidade (ex: "quero 2") ou "voltar".';
  return msg;
}

function getPaymentMessage(orderId: string, total: number, deliveryType: 'delivery' | 'pickup'): string {
  const order = store.getOrder(orderId);
  if (!order) return 'Erro ao gerar pagamento. 😔';
  
  let msg = `✅ *Pedido ${orderId} confirmado!*\n\n`;
  msg += `💰 Total: ${formatCurrency(total)}\n`;
  msg += `🚚 ${deliveryType === 'delivery' ? `Entrega (+${formatCurrency(DELIVERY_FEE)})` : 'Retirada na loja'}\n\n`;
  msg += `💳 *Pagamento via Mercado Pago:*\n`;
  msg += `Cartão de crédito, débito ou Pix\n\n`;
  msg += `🔗 Clique no link para pagar:\n`;
  msg += `${order.mercadoPagoId ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${order.mercadoPagoId}` : 'Gerando link...'}\n\n`;
  msg += `⏳ Após pagar, o produto fica reservado.\n`;
  msg += `📱 Envie "paguei" ou o comprovante quando finalizar.\n`;
  msg += `✅ Só liberamos a entrega após confirmação do pagamento.`;
  
  return msg;
}

function getAffiliateMessage(platform: 'mercadolivre' | 'aliexpress', productName: string): string {
  const link = store.getAffiliateLink(platform, productName);
  if (!link) {
    return `Não tenho link de afiliado para "${productName}" no ${platform === 'mercadolivre' ? 'Mercado Livre' : 'AliExpress'}.\n\nMe diga o que procura que eu vejo se tenho!`;
  }
  
  const platformName = platform === 'mercadolivre' ? 'Mercado Livre' : 'AliExpress';
  return `🔗 *Link de afiliado (${platformName}):*\n\n` +
    `📦 ${link.productName}\n` +
    `💰 Sua comissão: ${formatCurrency(link.commission || 0)}\n\n` +
    `${link.url}\n\n` +
    `✅ Comprando por esse link, você ganha comissão e eu não preciso entregar!\n` +
    `📱 Qualquer dúvida, é só chamar.`;
}

async function handleMessage(message: WhatsAppMessage): Promise<void> {
  const phone = message.from.replace('@c.us', '').replace('55', '');
  const text = message.body.trim().toLowerCase();
  const ctx = getContext(phone);
  
  logger.info({ phone, text, stage: ctx.stage }, 'Processing message');

  // Handle "voltar" / "menu" / "início"
  if (['voltar', 'menu', 'inicio', 'início', 'oi', 'olá', 'ola'].includes(text)) {
    resetContext(phone);
    await whatsappService.sendText(message.from, getGreetingMessage());
    return;
  }

  // Handle "paguei" / payment confirmation
  if (['paguei', 'paguei', 'comprovante', 'pix caiu'].includes(text) && ctx.awaitingPaymentConfirm) {
    await whatsappService.sendText(message.from, 
      '✅ Recebido! Vou confirmar o pagamento no sistema.\n' +
      'Assim que confirmar, libero sua entrega/retirada.\n' +
      'Obrigado pela compra! 🎉'
    );
    // In real flow, admin confirms via panel
    return;
  }

  switch (ctx.stage) {
    case 'greeting':
      await handleGreeting(message, ctx, text);
      break;
    case 'menu':
      await handleMenu(message, ctx, text);
      break;
    case 'product_inquiry':
      await handleProductInquiry(message, ctx, text);
      break;
    case 'selecting':
      await handleSelecting(message, ctx, text);
      break;
    case 'address':
      await handleAddress(message, ctx, text);
      break;
    case 'payment':
      await handlePayment(message, ctx, text);
      break;
    case 'affiliate':
      await handleAffiliate(message, ctx, text);
      break;
    case 'community_help':
      await handleCommunityHelp(message, ctx, text);
      break;
  }
}

async function handleGreeting(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  if (['1', 'catálogo', 'catalogo', 'site', 'ver site'].some(k => text.includes(k))) {
    ctx.stage = 'product_inquiry';
    await whatsappService.sendText(message.from, getSiteCatalogMessage());
    return;
  }
  
  if (['2', 'estoque', 'interno', 'retirada', 'ver estoque'].some(k => text.includes(k))) {
    ctx.stage = 'product_inquiry';
    await whatsappService.sendText(message.from, getInternalCatalogMessage());
    return;
  }
  
  if (['3', 'comunidade', 'afiliado', 'link', 'mercado livre', 'aliexpress', 'ml', 'ali'].some(k => text.includes(k))) {
    ctx.stage = 'affiliate';
    await whatsappService.sendText(message.from, 
      '🤝 *Ajuda para Comunidade*\n\n' +
      'Me diga o que procura:\n' +
      '• "ML cabo tipo c" - Link Mercado Livre\n' +
      '• "Ali fone bluetooth" - Link AliExpress\n\n' +
      'Ou digite o nome do produto que eu busco o link!'
    );
    return;
  }
  
  if (['4', 'humano', 'atendente', 'pessoa'].some(k => text.includes(k))) {
    await whatsappService.sendText(message.from, 
      '👤 *Transferindo para atendente humano...*\n\n' +
      'Aguarde um momento que já chamo alguém!\n' +
      'Enquanto isso, pode ir adiantando o que precisa.'
    );
    // Notify admin via panel
    return;
  }

  // Check if asking for specific product
  const allProducts = store.getAllProducts();
  const matchedProduct = allProducts.find(p => 
    text.includes(p.name.toLowerCase()) || 
    text.includes(p.id.replace('-', ' '))
  );
  
  if (matchedProduct) {
    ctx.stage = 'selecting';
    ctx.currentProduct = matchedProduct.id;
    await whatsappService.sendText(message.from, getProductDetailMessage(matchedProduct.id));
    return;
  }

  // Default: show greeting again
  await whatsappService.sendText(message.from, getGreetingMessage());
}

async function handleMenu(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  await handleGreeting(message, ctx, text);
}

async function handleProductInquiry(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  const allProducts = store.getAllProducts();
  const matchedProduct = allProducts.find(p => 
    text.includes(p.name.toLowerCase()) || 
    text.includes(p.id.replace('-', ' '))
  );
  
  if (matchedProduct) {
    ctx.stage = 'selecting';
    ctx.currentProduct = matchedProduct.id;
    await whatsappService.sendText(message.from, getProductDetailMessage(matchedProduct.id));
    return;
  }
  
  if (text.includes('site')) {
    await whatsappService.sendText(message.from, getSiteCatalogMessage());
    return;
  }
  
  if (text.includes('interno') || text.includes('estoque')) {
    await whatsappService.sendText(message.from, getInternalCatalogMessage());
    return;
  }
  
  await whatsappService.sendText(message.from, 
    'Não encontrei esse produto. 😔\n\n' +
    getSiteCatalogMessage()
  );
}

async function handleSelecting(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  if (!ctx.currentProduct) {
    ctx.stage = 'product_inquiry';
    await handleProductInquiry(message, ctx, text);
    return;
  }

  const product = store.getProduct(ctx.currentProduct);
  if (!product) {
    ctx.stage = 'product_inquiry';
    await whatsappService.sendText(message.from, 'Produto não disponível. 😔');
    return;
  }

  // Check quantity
  const qtyMatch = text.match(/(\d+)/);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
  
  if (text.includes('quero') || text.includes('sim') || text.includes('comprar') || qtyMatch) {
    if (quantity > product.stock) {
      await whatsappService.sendText(message.from, 
        `❌ Só temos ${product.stock} unidades disponíveis.\n` +
        `Quer levar ${product.stock} ou "voltar"?`
      );
      return;
    }

    // Add to cart
    ctx.cart.push({ productId: ctx.currentProduct, quantity });
    ctx.stage = 'address';
    
    const deliveryOptions = product.category === 'site' 
      ? `1️⃣ Entrega em ${STORE_CITY} (+${formatCurrency(DELIVERY_FEE)})\n2️⃣ Retirada na loja (sem taxa)`
      : '1️⃣ Retirada na loja (sem taxa)';
    
    await whatsappService.sendText(message.from,
      `✅ *${product.name} x${quantity}* adicionado!\n\n` +
      `🚚 *Como prefere receber?*\n${deliveryOptions}\n\n` +
      `Digite 1 ou 2, ou me diga seu endereço se for entrega.`
    );
    return;
  }
  
  if (text.includes('voltar')) {
    ctx.stage = 'product_inquiry';
    ctx.currentProduct = undefined;
    await whatsappService.sendText(message.from, getSiteCatalogMessage());
    return;
  }
  
  await whatsappService.sendText(message.from, 
    'Digite "quero" + quantidade (ex: "quero 2") ou "voltar".'
  );
}

async function handleAddress(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  if (text === '1' || text.includes('entrega')) {
    ctx.deliveryType = 'delivery';
    if (text.length > 1 && !text.startsWith('1')) {
      ctx.address = message.body.trim();
    } else {
      await whatsappService.sendText(message.from, 
        `📍 Me envie seu endereço completo:\n` +
        `Rua, número, bairro, ponto de referência.\n\n` +
        `Ex: "Rua das Flores, 120 - Centro"`
      );
      return;
    }
  } else if (text === '2' || text.includes('retirada')) {
    ctx.deliveryType = 'pickup';
    ctx.address = 'Retirada na loja';
  } else {
    // Assume it's an address
    ctx.deliveryType = 'delivery';
    ctx.address = message.body.trim();
  }

  // Create order
  const orderId = store.generateOrderId();
  const items = ctx.cart.map(ci => ({
    product: store.getProduct(ci.productId)!,
    quantity: ci.quantity,
  }));
  
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const deliveryFee = ctx.deliveryType === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  
  const order: any = {
    id: orderId,
    customerName: message.chatName || 'Cliente WhatsApp',
    customerPhone: message.from.replace('@c.us', ''),
    items,
    subtotal,
    deliveryFee,
    total,
    paymentMethod: 'mercadopago',
    paymentStatus: 'pending',
    deliveryType: ctx.deliveryType,
    address: ctx.address,
    status: 'new',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  store.createOrder(order);
  ctx.orderId = orderId;
  ctx.stage = 'payment';
  
  // Create Mercado Pago preference
  try {
    const mpItems = items.map(i => ({
      id: i.product.id,
      title: i.product.name,
      quantity: i.quantity,
      unit_price: i.product.price,
      currency_id: 'BRL' as const,
      description: i.product.description,
      picture_url: i.product.imageUrl,
    }));
    
    const pref = await createCheckoutPreference({
      items: mpItems,
      payer: {
        name: order.customerName,
        phone: { 
          area_code: order.customerPhone.slice(0, 2), 
          number: order.customerPhone.slice(2) 
        },
      },
      back_urls: {
        success: `${STORE_SITE}/sucesso?order=${orderId}`,
        failure: `${STORE_SITE}/erro?order=${orderId}`,
        pending: `${STORE_SITE}/pendente?order=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `${process.env.CLIENT_URL?.replace('43127', '43128')}/api/mercadopago/webhook`,
    });
    
    store.updateOrder(orderId, { mercadoPagoId: pref.id });
    
    await whatsappService.sendText(message.from, getPaymentMessage(orderId, total, ctx.deliveryType));
    ctx.awaitingPaymentConfirm = true;
    
  } catch (error) {
    logger.error({ error, orderId }, 'Failed to create Mercado Pago preference');
    // Fallback to Pix
    await whatsappService.sendText(message.from,
      `✅ *Pedido ${orderId} confirmado!*\n\n` +
      `💰 Total: ${formatCurrency(total)}\n\n` +
      `💳 *Pagamento via Pix:*\n` +
      `Chave: ${STORE_PIX_KEY}\n` +
      `Valor: ${formatCurrency(total)}\n\n` +
      `📱 Envie "paguei" ou o comprovante quando finalizar.\n` +
      `✅ Só liberamos a entrega após confirmação.`
    );
    ctx.awaitingPaymentConfirm = true;
  }
}

async function handlePayment(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  if (['paguei', 'paguei', 'comprovante'].includes(text)) {
    await whatsappService.sendText(message.from, 
      '✅ Recebido! Vou confirmar o pagamento.\n' +
      'Assim que confirmar, libero sua entrega/retirada.\n' +
      'Obrigado pela compra! 🎉'
    );
    // Admin will confirm via panel
    return;
  }
  
  await whatsappService.sendText(message.from, 
    'Aguardando pagamento... 💳\n\n' +
    'Após pagar, envie "paguei" ou o comprovante.'
  );
}

async function handleAffiliate(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  // Parse "ML produto" or "Ali produto"
  const mlMatch = text.match(/^(ml|mercado livre|mercadolivre)\s+(.+)$/i);
  const aliMatch = text.match(/^(ali|aliexpress)\s+(.+)$/i);
  
  if (mlMatch) {
    const productName = mlMatch[2];
    const link = store.getAffiliateLink('mercadolivre', productName);
    if (link) {
      await whatsappService.sendText(message.from, 
        `🔗 *Mercado Livre - ${link.productName}*\n\n` +
        `${link.url}\n\n` +
        `✅ Comprando por aqui, você ganha comissão!\n` +
        `📱 Qualquer dúvida, chama.`
      );
    } else {
      await whatsappService.sendText(message.from, 
        `Não tenho link para "${productName}" no Mercado Livre.\n` +
        `Tente: "ML cabo", "ML fone", "ML fonte"`
      );
    }
    return;
  }
  
  if (aliMatch) {
    const productName = aliMatch[2];
    const link = store.getAffiliateLink('aliexpress', productName);
    if (link) {
      await whatsappService.sendText(message.from, 
        `🔗 *AliExpress - ${link.productName}*\n\n` +
        `${link.url}\n\n` +
        `✅ Comprando por aqui, você ganha comissão!\n` +
        `📱 Qualquer dúvida, chama.`
      );
    } else {
      await whatsappService.sendText(message.from, 
        `Não tenho link para "${productName}" no AliExpress.\n` +
        `Tente: "Ali fone", "Ali cabo"`
      );
    }
    return;
  }
  
  // General product search
  const links = store.getAllAffiliateLinks();
  if (links.length > 0) {
    let msg = '🔗 *Meus links de afiliado:*\n\n';
    links.forEach(l => {
      const platform = l.platform === 'mercadolivre' ? '🟡 Mercado Livre' : '🔴 AliExpress';
      msg += `${platform} - ${l.productName}\n${l.url}\n\n`;
    });
    await whatsappService.sendText(message.from, msg);
  } else {
    await whatsappService.sendText(message.from, 
      'Nenhum link de afiliado cadastrado ainda.\n' +
      'Configure em Ajustes no painel!'
    );
  }
}

async function handleCommunityHelp(message: WhatsAppMessage, ctx: LiaContext, text: string): Promise<void> {
  await handleAffiliate(message, ctx, text);
}

// Export handler
export async function handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
  try {
    await handleMessage(message);
  } catch (error) {
    logger.error({ error, phone: message.from }, 'Error handling message');
    await whatsappService.sendText(message.from, 
      'Ops, tive um problema! 😔\nTenta de novo ou digita "menu".'
    );
  }
}

// Admin functions
export async function confirmPayment(orderId: string): Promise<boolean> {
  const order = store.getOrder(orderId);
  if (!order) return false;
  
  // Update order
  store.updateOrder(orderId, { 
    paymentStatus: 'paid', 
    status: 'confirmed',
    confirmedAt: new Date(),
  });
  
  // Create delivery
  const deliveryId = store.generateDeliveryId();
  const delivery = {
    id: deliveryId,
    orderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.address || '',
    items: order.items,
    total: order.total,
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  store.createDelivery(delivery);
  
  // Sync to sheets
  await syncOrderToSheets({ ...order, paymentStatus: 'paid', status: 'confirmed' });
  await syncDeliveryToSheets(delivery);
  
  // Notify customer
  const msg = order.deliveryType === 'delivery'
    ? `✅ Pagamento confirmado! Seu pedido ${orderId} está *saindo para entrega*.\n📍 Endereço: ${order.address}\n🕐 Previsão: hoje até 18h.`
    : `✅ Pagamento confirmado! Seu pedido ${orderId} está *pronto para retirada*.\n🏪 Passe na loja: 08h–13h / 14h–18h.`;
  
  await whatsappService.sendText(`${order.customerPhone}@c.us`, msg);
  
  return true;
}

export async function updateDeliveryStatus(deliveryId: string, status: 'ready' | 'out_for_delivery' | 'delivered'): Promise<boolean> {
  const delivery = store.updateDelivery(deliveryId, { status });
  if (!delivery) return false;
  
  await syncDeliveryToSheets(delivery);
  
  const messages: Record<string, string> = {
    ready: `📦 Seu pedido ${delivery.orderId} está *pronto*! ${delivery.deliveryType === 'delivery' ? 'Saindo para entrega.' : 'Pode retirar na loja.'}`,
    out_for_delivery: `🚚 Seu pedido ${delivery.orderId} *saiu para entrega*! Chega em breve.`,
    delivered: `✅ Entrega confirmada! Pedido ${delivery.orderId} *entregue com sucesso*. Obrigado! 🎉`,
  };
  
  await whatsappService.sendText(`${delivery.customerPhone}@c.us`, messages[status]);
  return true;
}

export { getContext, resetContext };