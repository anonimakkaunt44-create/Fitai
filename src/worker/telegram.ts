import { Env, Payment, User } from './types';
import { D1DatabaseService } from './db';
import { isTelegramIdAdmin } from './auth';

export class TelegramBotService {
  constructor(private env: Env, private dbService: D1DatabaseService) {}

  private get botToken(): string {
    return this.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get appUrl(): string {
    return this.env.APP_URL || '';
  }

  /**
   * Send HTTP request to Telegram Bot API
   */
  async callTelegramApi(method: string, payload: any): Promise<any> {
    if (!this.botToken || this.botToken === 'MY_TELEGRAM_BOT_TOKEN') {
      console.log(`[Telegram (Simulated)] ${method}:`, JSON.stringify(payload).slice(0, 150));
      return { ok: true, simulated: true };
    }

    const endpoint = `https://api.telegram.org/bot${this.botToken}/${method}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error(`Telegram API ${method} error:`, err);
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Send text message with optional inline keyboard
   */
  async sendMessage(chatId: string | number, text: string, replyMarkup?: any): Promise<any> {
    return await this.callTelegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  }

  /**
   * Notify Admin about new payment receipt submission
   */
  async notifyAdminNewPayment(payment: Payment, user?: User): Promise<void> {
    const adminChatIds = new Set<string>();

    if (this.env.TELEGRAM_ADMIN_CHAT_ID && this.env.TELEGRAM_ADMIN_CHAT_ID !== 'MY_TELEGRAM_ADMIN_ID') {
      this.env.TELEGRAM_ADMIN_CHAT_ID.split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => adminChatIds.add(id));
    }

    if (adminChatIds.size === 0) {
      console.log(`[Telegram] New payment ${payment.id}. No admin chat IDs configured in TELEGRAM_ADMIN_CHAT_ID.`);
      return;
    }

    const caption =
      `🔔 <b>НОВАЯ ЗАЯВКА НА ОПЛАТУ FITAI</b>\n\n` +
      `👤 <b>Пользователь:</b> ${payment.fullName} (${payment.username ? '@' + payment.username : 'нет юзернейма'})\n` +
      `🆔 <b>Telegram ID:</b> <code>${payment.telegramId}</code>\n` +
      `📦 <b>Тариф:</b> ${payment.planName}\n` +
      `💰 <b>Сумма:</b> ${payment.amount.toLocaleString()} ${payment.currency}\n` +
      `📅 <b>Дата:</b> ${new Date(payment.createdAt).toLocaleString('ru-RU')}\n\n` +
      `<i>ID платежа: ${payment.id}</i>\n` +
      `Проверьте чек в админ-панели и подтвердите или отклоните платеж.`;

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
        await this.sendMessage(chatId, caption, inlineKeyboard);
      } catch (err) {
        console.error(`Failed to alert admin ${chatId}:`, err);
      }
    }
  }

  /**
   * Notify user about approved payment
   */
  async notifyUserPaymentApproved(telegramId: string, planName: string, premiumUntil?: string): Promise<any> {
    const dateStr = premiumUntil ? new Date(premiumUntil).toLocaleDateString('ru-RU') : 'бессрочно';
    const text =
      `🎉 <b>Ваша оплата подтверждена!</b>\n\n` +
      `Тариф <b>«${planName}»</b> успешно активирован.\n` +
      `✨ <b>Premium активен до:</b> ${dateStr}\n\n` +
      `Вам открыты все функции FitAI: AI-тренер, персональное меню, анализ фото блюд, умные тренировки и семейное планирование. 💪`;

    const replyMarkup = this.appUrl
      ? {
          inline_keyboard: [[{ text: '🚀 Открыть FitAI', web_app: { url: this.appUrl } }]],
        }
      : undefined;

    return await this.sendMessage(telegramId, text, replyMarkup);
  }

  /**
   * Notify user about rejected payment
   */
  async notifyUserPaymentRejected(telegramId: string, reason?: string): Promise<any> {
    const text =
      `⚠️ <b>Платеж не подтвержден</b>\n\n` +
      `К сожалению, администратор не смог подтвердить ваш чек об оплате.\n` +
      (reason ? `<b>Причина:</b> ${reason}\n\n` : '\n') +
      `Пожалуйста, проверьте статус платежа в банковском приложении и повторите отправку через FitAI.`;

    const replyMarkup = this.appUrl
      ? {
          inline_keyboard: [[{ text: '🔄 Открыть FitAI', web_app: { url: this.appUrl } }]],
        }
      : undefined;

    return await this.sendMessage(telegramId, text, replyMarkup);
  }

  /**
   * Handle incoming Webhook from Telegram
   */
  async handleWebhook(body: any, secretTokenHeader?: string | null): Promise<{ ok: boolean; status?: number; error?: string }> {
    // 1. Secret token verification (if configured in Cloudflare Secrets)
    if (this.env.TELEGRAM_WEBHOOK_SECRET) {
      if (secretTokenHeader !== this.env.TELEGRAM_WEBHOOK_SECRET) {
        console.warn('[Telegram Webhook] Invalid secret token received');
        return { ok: false, status: 403, error: 'Invalid secret token' };
      }
    }

    if (!body || typeof body !== 'object') {
      return { ok: true };
    }

    // 2. Deduplication check using update_id in D1
    const updateId = body.update_id;
    if (updateId) {
      const alreadyProcessed = await this.dbService.isTelegramUpdateProcessed(updateId);
      if (alreadyProcessed) {
        return { ok: true }; // Already handled
      }
      await this.dbService.recordTelegramUpdate(updateId);
    }

    // 3. Handle Callback Queries (Admin clicking [Подтвердить] / [Отклонить] directly in Telegram)
    if (body.callback_query) {
      const cq = body.callback_query;
      const data: string = cq.data || '';
      const queryId = cq.id;
      const fromId = String(cq.from?.id);
      const fromUsername = cq.from?.username;

      // Verify admin permission
      const isAdmin = isTelegramIdAdmin(
        fromId,
        fromUsername,
        this.env.TELEGRAM_ADMIN_CHAT_ID,
        this.env.ADMIN_USERNAMES
      );

      if (!isAdmin) {
        await this.callTelegramApi('answerCallbackQuery', {
          callback_query_id: queryId,
          text: '⛔ У вас нет прав администратора',
          show_alert: true,
        });
        return { ok: true };
      }

      if (data.startsWith('pay_approve_')) {
        const paymentId = data.replace('pay_approve_', '');
        const result = await this.dbService.reviewPayment(paymentId, 'approved', `Telegram Admin (${fromId})`);
        if (result) {
          await this.notifyUserPaymentApproved(
            result.payment.telegramId,
            result.payment.planName,
            result.user?.premiumUntil
          );
          await this.callTelegramApi('answerCallbackQuery', {
            callback_query_id: queryId,
            text: '✅ Оплата подтверждена! Premium активирован.',
            show_alert: true,
          });

          if (cq.message?.chat?.id && cq.message?.message_id) {
            await this.callTelegramApi('editMessageText', {
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
        const result = await this.dbService.reviewPayment(paymentId, 'rejected', `Telegram Admin (${fromId})`, 'Чек отклонен');
        if (result) {
          await this.notifyUserPaymentRejected(result.payment.telegramId, 'Чек не прошел верификацию');
          await this.callTelegramApi('answerCallbackQuery', {
            callback_query_id: queryId,
            text: '❌ Оплата отклонена. Пользователь уведомлен.',
            show_alert: true,
          });

          if (cq.message?.chat?.id && cq.message?.message_id) {
            await this.callTelegramApi('editMessageText', {
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

    // 4. Handle text message (/start)
    if (body.message) {
      const msg = body.message;
      const text: string = msg.text || '';
      const chatId = msg.chat?.id;
      const from = msg.from;

      if (text.startsWith('/start') && chatId && from) {
        // Register or sync user in D1
        await this.dbService.createOrUpdateUser({
          telegramId: String(from.id),
          firstName: from.first_name || 'FitAI User',
          lastName: from.last_name,
          username: from.username,
          language: from.language_code === 'uz' ? 'uz' : from.language_code === 'en' ? 'en' : 'ru',
        });

        const welcomeText =
          `👋 Привет, <b>${from.first_name || 'друг'}</b>!\n\n` +
          `Добро пожаловать в <b>FitAI</b> — твой персональный AI-тренер и диетолог для похудения.\n\n` +
          `🔥 <b>Возможности FitAI:</b>\n` +
          `• Персональный расчет калорий и меню\n` +
          `• Распознавание блюд по фотографии\n` +
          `• Рецепты из продуктов в холодильнике\n` +
          `• Тренировки для дома и зала\n` +
          `• Умный список покупок и контроль бюджета\n\n` +
          `Нажмите кнопку ниже, чтобы открыть приложение 👇`;

        const webAppUrl = this.appUrl || 'https://telegram.org';

        await this.sendMessage(chatId, welcomeText, {
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
}
