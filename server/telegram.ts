import crypto from 'crypto';
import { db, Payment, User } from './db.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const APP_URL = process.env.APP_URL || '';

/**
 * Checks if a Telegram user ID or username belongs to an administrator
 */
export function isTelegramIdAdmin(telegramId?: string | number, username?: string): boolean {
  const tid = telegramId ? String(telegramId).trim() : '';
  const uname = username ? username.toLowerCase().replace(/^@/, '').trim() : '';

  const knownAdminChatIds = ['6112545552'];
  const envChatIds = (process.env.TELEGRAM_ADMIN_CHAT_ID || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const knownAdminUsernames = ['timurcik', 'luckmepubg', 'luckme'];
  const envUsernames = (process.env.ADMIN_USERNAMES || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);

  const allAdminIds = new Set([...knownAdminChatIds, ...envChatIds]);
  const allAdminUsernames = new Set([...knownAdminUsernames, ...envUsernames]);

  if (tid && allAdminIds.has(tid)) {
    return true;
  }
  if (uname && allAdminUsernames.has(uname)) {
    return true;
  }
  return false;
}

/**
 * Validates Telegram Mini App initData using HMAC-SHA256 and extracts user info
 */
export function validateTelegramInitData(initDataString: string): { isValid: boolean; userData?: any } {
  if (!initDataString) {
    return { isValid: false };
  }

  // 1. Always attempt to extract userData from initDataString
  let extractedUserData: any = null;
  try {
    const urlParams = new URLSearchParams(initDataString);
    const userRaw = urlParams.get('user');
    if (userRaw) {
      extractedUserData = JSON.parse(userRaw);
    }
  } catch {}

  if (!extractedUserData) {
    try {
      const parts = initDataString.split('&');
      for (const part of parts) {
        const [k, ...vParts] = part.split('=');
        if (decodeURIComponent(k) === 'user') {
          extractedUserData = JSON.parse(decodeURIComponent(vParts.join('=')));
          break;
        }
      }
    } catch {}
  }

  // If no bot token configured in environment, allow testing with extracted user data
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'MY_TELEGRAM_BOT_TOKEN') {
    return { isValid: true, userData: extractedUserData };
  }

  try {
    const parts = initDataString.split('&');
    let hash = '';
    const dataCheckArr: string[] = [];

    for (const part of parts) {
      const [k, ...vParts] = part.split('=');
      const key = decodeURIComponent(k);
      const val = decodeURIComponent(vParts.join('='));
      if (key === 'hash') {
        hash = val;
      } else {
        dataCheckArr.push(`${key}=${val}`);
      }
    }

    if (!hash) {
      return { isValid: false, userData: extractedUserData };
    }

    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // HMAC secret key calculation for Telegram WebApp
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(TELEGRAM_BOT_TOKEN)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const isValid = calculatedHash === hash;
    return { isValid, userData: extractedUserData };
  } catch (err) {
    console.error('Telegram initData validation error:', err);
    return { isValid: false, userData: extractedUserData };
  }
}

/**
 * Send request to Telegram Bot API
 */
async function callTelegramApi(method: string, payload: any) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'MY_TELEGRAM_BOT_TOKEN') {
    console.log(`[Telegram Bot (Simulated)] ${method} called with payload:`, JSON.stringify(payload).substring(0, 200));
    return { ok: true, simulated: true };
  }

  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error(`Error calling Telegram API ${method}:`, err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Send text message to user or admin
 */
export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

/**
 * Notify Administrator when a new payment check is uploaded
 */
export async function notifyAdminNewPayment(payment: Payment, user?: User, extraAdminChatIds?: string[]) {
  const adminChatIds = new Set<string>();

  if (TELEGRAM_ADMIN_CHAT_ID && TELEGRAM_ADMIN_CHAT_ID !== 'MY_TELEGRAM_ADMIN_ID') {
    TELEGRAM_ADMIN_CHAT_ID.split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((id) => adminChatIds.add(id));
  }

  if (extraAdminChatIds && extraAdminChatIds.length > 0) {
    extraAdminChatIds.forEach((id) => {
      if (id && id !== 'MY_TELEGRAM_ADMIN_ID') adminChatIds.add(id);
    });
  }

  if (adminChatIds.size === 0) {
    console.log(`[Telegram Bot] New payment submission for user ${payment.telegramId}. No admin chat IDs registered to receive alerts.`);
    return;
  }

  const caption = `🔔 <b>НОВАЯ ЗАЯВКА НА ОПЛАТУ FITAI</b>\n\n` +
    `👤 <b>Пользователь:</b> ${payment.fullName} (${payment.username ? '@' + payment.username : 'нет юзернейма'})\n` +
    `🆔 <b>Telegram ID:</b> <code>${payment.telegramId}</code>\n` +
    `📦 <b>Тариф:</b> ${payment.planName}\n` +
    `💰 <b>Сумма:</b> ${payment.amount.toLocaleString()} ${payment.currency}\n` +
    `📅 <b>Дата:</b> ${new Date(payment.createdAt).toLocaleString('ru-RU')}\n\n` +
    `Пожалуйста, проверьте чек и подтвердите или отклоните платеж.`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `pay_approve_${payment.id}` },
        { text: '❌ Отклонить', callback_data: `pay_reject_${payment.id}` },
      ],
    ],
  };

  for (const chatId of adminChatIds) {
    try {
      await sendTelegramMessage(chatId, caption + `\n\n<i>Чек загружен в админ-панели (ID: ${payment.id})</i>`, inlineKeyboard);
    } catch (err) {
      console.error(`Failed to send payment alert to admin ${chatId}:`, err);
    }
  }
}

/**
 * Notify user about Payment Confirmation
 */
export async function notifyUserPaymentApproved(telegramId: string, planName: string, premiumUntil: string) {
  const formattedDate = new Date(premiumUntil).toLocaleDateString('ru-RU');
  const text = `🎉 <b>Ваша оплата подтверждена!</b>\n\n` +
    `Тариф <b>«${planName}»</b> успешно активирован.\n` +
    `✨ <b>Premium активен до:</b> ${formattedDate}\n\n` +
    `Вам открыты все функции FitAI: AI-тренер, персональное меню, анализ фото еды, рецепты и дневник тренировок.\n\n` +
    `Приятных тренировок и легкого похудения! 💪`;

  const replyMarkup = APP_URL ? {
    inline_keyboard: [
      [{ text: '🚀 Открыть FitAI Mini App', web_app: { url: APP_URL } }]
    ]
  } : undefined;

  return await sendTelegramMessage(telegramId, text, replyMarkup);
}

/**
 * Notify user about Payment Rejection
 */
export async function notifyUserPaymentRejected(telegramId: string, reason?: string) {
  const text = `⚠️ <b>Платеж не подтвержден</b>\n\n` +
    `К сожалению, администратор не смог подтвердить ваш чек об оплате.\n` +
    (reason ? `<b>Причина:</b> ${reason}\n\n` : '\n') +
    `Пожалуйста, проверьте статус платежа в банковском приложении и повторите отправку чека через FitAI Mini App.`;

  const replyMarkup = APP_URL ? {
    inline_keyboard: [
      [{ text: '🔄 Открыть FitAI', web_app: { url: APP_URL } }]
    ]
  } : undefined;

  return await sendTelegramMessage(telegramId, text, replyMarkup);
}

/**
 * Broadcast message from Admin to users
 */
export async function sendBroadcast(
  userIds: string[],
  messageText: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const uid of userIds) {
    const user = db.findUserById(uid);
    if (user && user.telegramId) {
      try {
        const res = await sendTelegramMessage(user.telegramId, messageText);
        if (res?.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }

  return { sent, failed };
}

/**
 * Telegram Webhook Handler
 */
export async function handleTelegramWebhook(body: any) {
  // Handle Callback Queries (Admin clicking Approve/Reject in Telegram)
  if (body?.callback_query) {
    const cq = body.callback_query;
    const data: string = cq.data || '';
    const queryId = cq.id;
    const fromId = String(cq.from?.id);
    const fromUsername = cq.from?.username;

    // Verify admin permission for action buttons
    if (!isTelegramIdAdmin(fromId, fromUsername)) {
      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: queryId,
        text: '⛔ У вас нет прав администратора',
        show_alert: true,
      });
      return { ok: false, error: 'Unauthorized' };
    }

    if (data.startsWith('pay_approve_')) {
      const paymentId = data.replace('pay_approve_', '');
      const result = db.reviewPayment(paymentId, 'approved', `Telegram Admin (${fromId})`);
      if (result) {
        if (result.user && result.user.premiumUntil) {
          await notifyUserPaymentApproved(result.payment.telegramId, result.payment.planName, result.user.premiumUntil);
        }
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: queryId,
          text: '✅ Оплата успешно подтверждена! Premium активирован пользователю.',
          show_alert: true,
        });
        if (cq.message?.chat?.id && cq.message?.message_id) {
          await callTelegramApi('editMessageText', {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            text: `${cq.message.text}\n\n<b>✅ ПОДТВЕРЖДЕНО АДМИНИСТРАТОРОМ (${new Date().toLocaleTimeString('ru-RU')})</b>`,
            parse_mode: 'HTML',
          });
        }
      }
      return { ok: true };
    }

    if (data.startsWith('pay_reject_')) {
      const paymentId = data.replace('pay_reject_', '');
      const result = db.reviewPayment(paymentId, 'rejected', `Telegram Admin (${fromId})`, 'Чек не прошел верификацию');
      if (result) {
        await notifyUserPaymentRejected(result.payment.telegramId, 'Чек не прошел верификацию администратора');
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: queryId,
          text: '❌ Оплата отклонена. Пользователь уведомлен.',
          show_alert: true,
        });
        if (cq.message?.chat?.id && cq.message?.message_id) {
          await callTelegramApi('editMessageText', {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            text: `${cq.message.text}\n\n<b>❌ ОТКЛОНЕНО АДМИНИСТРАТОРОМ (${new Date().toLocaleTimeString('ru-RU')})</b>`,
            parse_mode: 'HTML',
          });
        }
      }
      return { ok: true };
    }
  }

  // Handle /start command from user in Telegram bot
  if (body?.message) {
    const msg = body.message;
    const text: string = msg.text || '';
    const chatId = msg.chat?.id;
    const from = msg.from;

    if (text.startsWith('/start') && chatId && from) {
      // Register or update user in database
      const user = db.createOrUpdateUser({
        telegramId: String(from.id),
        firstName: from.first_name || 'FitAI User',
        lastName: from.last_name,
        username: from.username,
        language: from.language_code === 'uz' ? 'uz' : from.language_code === 'en' ? 'en' : 'ru',
      });

      const welcomeText = `👋 Привет, <b>${from.first_name || 'друг'}</b>!\n\n` +
        `Добро пожаловать в <b>FitAI</b> — твой персональный AI-тренер и диетолог для похудения.\n\n` +
        `🔥 <b>Что умеет FitAI:</b>\n` +
        `• Составлять индивидуальные тренировки и меню\n` +
        `• Распознавать блюда и считать калории по фото\n` +
        `• Подбирать рецепты из того, что есть в холодильнике\n` +
        `• Составлять список покупок с расчетом бюджета\n` +
        `• Вести дневник веса и мотивировать на результат!\n\n` +
        `Нажми кнопку ниже, чтобы открыть приложение 👇`;

      const webAppUrl = APP_URL || 'https://telegram.org';

      await sendTelegramMessage(chatId, welcomeText, {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть FitAI Mini App',
              web_app: { url: webAppUrl },
            },
          ],
        ],
      });
    }
  }

  return { ok: true };
}
