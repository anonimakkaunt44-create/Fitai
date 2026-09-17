import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { D1DatabaseService } from './db';
import { R2StorageService } from './r2';
import { TelegramBotService } from './telegram';
import { WorkerAiService } from './ai';
import {
  signJwt,
  verifyJwt,
  validateTelegramInitData,
  isTelegramIdAdmin,
  verifyPassword,
  hashPassword,
} from './auth';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'X-Telegram-Bot-Api-Secret-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Helper to extract authenticated user from Authorization header
async function authenticateUser(c: any, db: D1DatabaseService, env: Env) {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { isValid, payload } = await verifyJwt(token, env.JWT_SECRET || env.ADMIN_SECRET_KEY || 'fitai_secret');
    if (isValid && payload?.userId) {
      const user = await db.getUserById(payload.userId);
      if (user) return user;
    }
  }

  // Fallback: check Telegram Init Data header
  const initDataHeader = c.req.header('X-Telegram-Init-Data');
  if (initDataHeader) {
    const { isValid, userData } = await validateTelegramInitData(initDataHeader, env.TELEGRAM_BOT_TOKEN);
    if (isValid && userData?.id) {
      const user = await db.getUserByTelegramId(String(userData.id));
      if (user) return user;
    }
  }

  return null;
}

// Helper to verify admin token
async function authenticateAdmin(c: any, env: Env) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const { isValid, payload } = await verifyJwt(token, env.ADMIN_SECRET_KEY || env.JWT_SECRET || 'fitai_secret');
  return isValid && (payload?.role === 'admin' || payload?.role === 'superadmin');
}

// ==========================================
// 1. HEALTH CHECKS
// ==========================================

app.get('/healthz', (c) => c.text('OK', 200));

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'FitAI Cloudflare Worker',
    runtime: 'Cloudflare Workers (Edge)',
    hasD1: Boolean(c.env.DB),
    hasR2: Boolean(c.env.BUCKET),
    time: new Date().toISOString(),
  });
});

// ==========================================
// 2. TELEGRAM WEBHOOK
// ==========================================

app.post('/api/telegram/webhook', async (c) => {
  try {
    const body = await c.req.json();
    const secretToken = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    const db = new D1DatabaseService(c.env.DB);
    const tg = new TelegramBotService(c.env, db);

    const res = await tg.handleWebhook(body, secretToken);
    return c.json(res, (res.status as any) || 200);
  } catch (err: any) {
    console.error('Webhook error:', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ==========================================
// 3. AUTHENTICATION (Telegram & Guest)
// ==========================================

app.post('/api/auth/telegram', async (c) => {
  try {
    const body = await c.req.json();
    const { initData, clientState } = body;
    const db = new D1DatabaseService(c.env.DB);

    const { isValid, userData } = await validateTelegramInitData(initData, c.env.TELEGRAM_BOT_TOKEN);

    if (!isValid && c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_BOT_TOKEN !== 'MY_TELEGRAM_BOT_TOKEN') {
      return c.json({ success: false, error: 'Неверные данные Telegram авторизации' }, 401);
    }

    const tgUser = userData || {
      id: 'demo_' + Date.now(),
      first_name: 'Пользователь',
      username: 'user_fit',
    };

    const telegramId = String(tgUser.id);
    let user = await db.getUserByTelegramId(telegramId);

    if (!user) {
      user = await db.createOrUpdateUser({
        telegramId,
        firstName: tgUser.first_name || 'FitAI User',
        lastName: tgUser.last_name,
        username: tgUser.username,
        language: tgUser.language_code === 'uz' ? 'uz' : tgUser.language_code === 'en' ? 'en' : 'ru',
      });
    }

    // Check admin rights
    const isAdmin = isTelegramIdAdmin(
      telegramId,
      user.username,
      c.env.TELEGRAM_ADMIN_CHAT_ID,
      c.env.ADMIN_USERNAMES
    );

    if (isAdmin && !user.isAdmin) {
      await db.setUserAdmin(telegramId, true);
      user.isAdmin = true;
    }

    // Reconcile client state if available
    if (clientState?.onboardingCompleted && !user.onboardingCompleted) {
      user = (await db.updateUserProfile(user.id, clientState.profile || {}, true)) || user;
    }

    const token = await signJwt(
      { userId: user.id, telegramId: user.telegramId, isAdmin: user.isAdmin },
      c.env.JWT_SECRET || c.env.ADMIN_SECRET_KEY || 'fitai_secret',
      720 // 30 days
    );

    return c.json({ success: true, user, token, isAdmin: user.isAdmin });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/auth/guest', async (c) => {
  try {
    const db = new D1DatabaseService(c.env.DB);
    const guestTgId = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const user = await db.createOrUpdateUser({
      telegramId: guestTgId,
      firstName: 'Гость FitAI',
      language: 'ru',
    });

    const token = await signJwt(
      { userId: user.id, telegramId: user.telegramId, isGuest: true },
      c.env.JWT_SECRET || c.env.ADMIN_SECRET_KEY || 'fitai_secret',
      168
    );

    return c.json({ success: true, user, token });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ==========================================
// 4. USER PROFILE & ACTIVITY
// ==========================================

app.get('/api/user/profile', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});

app.put('/api/user/profile', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const updatedUser = await db.updateUserProfile(user.id, body.profile || body, body.onboardingCompleted);
  return c.json({ success: true, user: updatedUser });
});

app.get('/api/user/activity', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  const activity = await db.getDailyActivity(user.id, date);
  return c.json({ activity: activity || { waterMl: 0, steps: 0, streakCount: 1 } });
});

app.post('/api/user/activity', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const date = body.date || new Date().toISOString().split('T')[0];
  const activity = await db.updateDailyActivity(user.id, date, body);
  return c.json({ success: true, activity });
});

// ==========================================
// 5. CLOUDFLARE R2 STORAGE (Images & Receipts)
// ==========================================

app.post('/api/storage/upload', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ ok: false, error: 'Требуется авторизация' }, 401);

  if (!c.env.BUCKET) {
    return c.json({ ok: false, error: 'Хранилище R2 не подключено в Cloudflare' }, 500);
  }

  const r2 = new R2StorageService(c.env.BUCKET, db);

  try {
    const contentType = c.req.header('Content-Type') || '';

    // A. JSON base64 upload
    if (contentType.includes('application/json')) {
      const { base64Data, fileName, mimeType, purpose, isPublic } = await c.req.json();
      if (!base64Data) return c.json({ ok: false, error: 'Отсутствуют данные файла' }, 400);

      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Clean);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const res = await r2.uploadFile({
        userId: user.id,
        fileName: fileName || 'photo.jpg',
        mimeType: mimeType || 'image/jpeg',
        data: bytes,
        purpose: purpose || 'food_photo',
        isPublic: Boolean(isPublic),
      });

      if (!res.ok) return c.json(res, 400);
      return c.json({
        ok: true,
        file: res.file,
        url: `/api/storage/file/${encodeURIComponent(res.file!.r2Key)}`,
      });
    }

    // B. Multipart/form-data upload
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const purpose = (formData.get('purpose') as any) || 'food_photo';
    const isPublic = formData.get('isPublic') === 'true';

    if (!file) return c.json({ ok: false, error: 'Файл не найден' }, 400);

    const arrayBuffer = await file.arrayBuffer();
    const res = await r2.uploadFile({
      userId: user.id,
      fileName: file.name,
      mimeType: file.type,
      data: arrayBuffer,
      purpose,
      isPublic,
    });

    if (!res.ok) return c.json(res, 400);
    return c.json({
      ok: true,
      file: res.file,
      url: `/api/storage/file/${encodeURIComponent(res.file!.r2Key)}`,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

app.get('/api/storage/file/:key{.+}', async (c) => {
  const r2Key = c.req.param('key');
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  const isAdmin = await authenticateAdmin(c, c.env);

  if (!c.env.BUCKET) return c.text('R2 bucket not available', 500);

  const r2 = new R2StorageService(c.env.BUCKET, db);
  const result = await r2.getFile(r2Key, user?.id, isAdmin || user?.isAdmin);

  if (!result.ok || !result.object) {
    return c.text(result.error || 'File not found', (result.status as any) || 404);
  }

  const obj = result.object;
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(obj.body as any, { headers });
});

app.delete('/api/storage/file/:key{.+}', async (c) => {
  const r2Key = c.req.param('key');
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ ok: false, error: 'Unauthorized' }, 401);

  const r2 = new R2StorageService(c.env.BUCKET, db);
  const res = await r2.deleteFile(r2Key, user.id, user.isAdmin);
  return c.json(res, res.ok ? 200 : 403);
});

// ==========================================
// 6. FOOD ANALYSIS & DIARY
// ==========================================

app.post('/api/food/analyze', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { imageBase64, mimeType } = await c.req.json();
  if (!imageBase64) return c.json({ error: 'Image required' }, 400);

  const ai = new WorkerAiService(c.env, db);
  const analysis = await ai.analyzeFoodPhoto(user, imageBase64, mimeType || 'image/jpeg');

  // Save analysis log in D1
  const id = await db.saveFoodAnalysis(user.id, analysis);
  return c.json({ success: true, id, analysis });
});

app.get('/api/food/history', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const history = await db.getFoodHistory(user.id);
  return c.json({ history });
});

app.post('/api/food/recipes-from-fridge', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { ingredients } = await c.req.json();
  const ai = new WorkerAiService(c.env, db);
  const recipes = await ai.getRecipesFromFridge(user, ingredients || []);
  return c.json({ success: true, recipes });
});

app.get('/api/food/diary', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  const entries = await db.getFoodDiary(user.id, date);
  return c.json({ entries });
});

app.post('/api/food/diary', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const id = await db.addFoodDiaryEntry({
    userId: user.id,
    date: body.date || new Date().toISOString().split('T')[0],
    mealType: body.mealType || 'lunch',
    title: body.title,
    calories: body.calories || 0,
    protein: body.protein || 0,
    fat: body.fat || 0,
    carbs: body.carbs || 0,
    photoR2Key: body.photoR2Key,
  });

  return c.json({ success: true, id });
});

// ==========================================
// 7. AI FEATURES (Trainer, Meal Plan, Workout)
// ==========================================

app.post('/api/ai/trainer', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { message } = await c.req.json();
  if (!message) return c.json({ error: 'Message required' }, 400);

  const history = await db.getAiChatHistory(user.id, 8);
  await db.saveAiChatMessage(user.id, 'user', message);

  const ai = new WorkerAiService(c.env, db);
  const reply = await ai.askAiTrainer(user, message, history);

  await db.saveAiChatMessage(user.id, 'assistant', reply);
  return c.json({ reply });
});

app.post('/api/ai/meal-plan', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const ai = new WorkerAiService(c.env, db);
  const plan = await ai.generateAiMealPlan(user);
  return c.json({ success: true, plan });
});

app.post('/api/ai/workout', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const ai = new WorkerAiService(c.env, db);
  const workout = await ai.generateAiWorkout(user);
  return c.json({ success: true, workout });
});

app.post('/api/ai/shopping-list', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const ai = new WorkerAiService(c.env, db);
  const list = await ai.generateWeeklyShoppingList(user);
  return c.json({ success: true, list });
});

app.post('/api/ai/mom', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { category, query } = await c.req.json();
  const ai = new WorkerAiService(c.env, db);
  const result = await ai.generateMomFeatures(category || 'family_menu', user, query);
  return c.json({ success: true, result });
});

// ==========================================
// 8. PAYMENT FLOW (Subscription & Receipts)
// ==========================================

app.get('/api/payment/settings', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const settings = await db.getPaymentSettings();
  return c.json(settings);
});

app.post('/api/payment/submit', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { planId, planName, amount, currency, receiptBase64 } = await c.req.json();

  let receiptR2Key: string | undefined;
  let receiptUrl: string | undefined;

  // If receipt image is attached and R2 is available, upload directly to R2!
  if (receiptBase64 && c.env.BUCKET) {
    try {
      const r2 = new R2StorageService(c.env.BUCKET, db);
      const cleanData = receiptBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(cleanData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const uploadResult = await r2.uploadFile({
        userId: user.id,
        fileName: `receipt_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        data: bytes,
        purpose: 'receipt',
        isPublic: false,
      });

      if (uploadResult.ok && uploadResult.file) {
        receiptR2Key = uploadResult.file.r2Key;
        receiptUrl = `/api/storage/file/${encodeURIComponent(receiptR2Key)}`;
      }
    } catch (r2Err) {
      console.warn('R2 receipt upload fallback:', r2Err);
    }
  }

  const payment = await db.createPayment({
    userId: user.id,
    telegramId: user.telegramId,
    fullName: `${user.firstName} ${user.lastName || ''}`.trim(),
    username: user.username,
    planId: planId || '1_month',
    planName: planName || '1 Месяц Premium',
    amount: amount || 99000,
    currency: currency || 'UZS',
    receiptUrl: receiptUrl || receiptBase64,
    receiptR2Key,
  });

  // Notify Admins in Telegram
  const tg = new TelegramBotService(c.env, db);
  await tg.notifyAdminNewPayment(payment, user);

  return c.json({ success: true, payment });
});

app.get('/api/payment/status', async (c) => {
  const db = new D1DatabaseService(c.env.DB);
  const user = await authenticateUser(c, db, c.env);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const payments = await db.getPayments(undefined, 5);
  const userPayments = payments.filter((p) => p.userId === user.id);
  return c.json({ payments: userPayments, isPremium: user.isPremium, premiumUntil: user.premiumUntil });
});

// ==========================================
// 9. ADMIN PANEL (Protected API)
// ==========================================

app.post('/api/admin/login', async (c) => {
  const { username, password } = await c.req.json();
  const db = new D1DatabaseService(c.env.DB);

  if (!username || !password) {
    return c.json({ success: false, error: 'Введите имя пользователя и пароль' }, 400);
  }

  const admin = await db.getAdminUser(username);

  // If no admin user found in D1, check if INITIAL_ADMIN_PASSWORD secret was provided
  if (!admin) {
    const initialPass = c.env.INITIAL_ADMIN_PASSWORD;
    if (initialPass && password === initialPass && username.toLowerCase() === 'admin') {
      const hashed = await hashPassword(initialPass);
      await db.createAdminUser('admin', hashed, 'superadmin');
      const token = await signJwt(
        { username: 'admin', role: 'superadmin' },
        c.env.ADMIN_SECRET_KEY || c.env.JWT_SECRET || 'fitai_secret',
        24
      );
      return c.json({ success: true, token, role: 'superadmin', username: 'admin' });
    }
    return c.json({ success: false, error: 'Неверные учетные данные администратора' }, 401);
  }

  const isMatch = await verifyPassword(password, admin.passwordHash);
  if (!isMatch) {
    return c.json({ success: false, error: 'Неверные учетные данные администратора' }, 401);
  }

  const token = await signJwt(
    { username: admin.username, role: admin.role },
    c.env.ADMIN_SECRET_KEY || c.env.JWT_SECRET || 'fitai_secret',
    24
  );

  return c.json({ success: true, token, role: admin.role, username: admin.username });
});

app.get('/api/admin/stats', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const db = new D1DatabaseService(c.env.DB);
  const stats = await db.getAdminStats();
  return c.json(stats);
});

app.get('/api/admin/users', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const db = new D1DatabaseService(c.env.DB);
  const users = await db.getAllUsers(200);
  return c.json({ users });
});

app.post('/api/admin/user/premium', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const { userId, isPremium, months } = await c.req.json();
  const db = new D1DatabaseService(c.env.DB);
  const user = await db.setPremium(userId, Boolean(isPremium), months || 1);
  return c.json({ success: true, user });
});

app.delete('/api/admin/user/:id', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const db = new D1DatabaseService(c.env.DB);
  const success = await db.deleteUser(id);
  return c.json({ success });
});

app.get('/api/admin/payments', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const status = c.req.query('status') as any;
  const db = new D1DatabaseService(c.env.DB);
  const payments = await db.getPayments(status);
  return c.json({ payments });
});

app.post('/api/admin/payment/review', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const { paymentId, status, rejectReason } = await c.req.json();
  const db = new D1DatabaseService(c.env.DB);
  const result = await db.reviewPayment(paymentId, status, 'Web Admin', rejectReason);

  if (!result) return c.json({ error: 'Payment not found' }, 404);

  // Notify user via Telegram Bot
  const tg = new TelegramBotService(c.env, db);
  if (status === 'approved') {
    await tg.notifyUserPaymentApproved(
      result.payment.telegramId,
      result.payment.planName,
      result.user?.premiumUntil
    );
  } else if (status === 'rejected') {
    await tg.notifyUserPaymentRejected(result.payment.telegramId, rejectReason);
  }

  return c.json({ success: true, payment: result.payment, user: result.user });
});

app.put('/api/admin/payment-settings', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const db = new D1DatabaseService(c.env.DB);
  const updated = await db.updatePaymentSettings(body);
  return c.json({ success: true, settings: updated });
});

app.post('/api/admin/broadcast', async (c) => {
  const isAdmin = await authenticateAdmin(c, c.env);
  if (!isAdmin) return c.json({ error: 'Unauthorized' }, 401);

  const { messageText, userIds } = await c.req.json();
  if (!messageText) return c.json({ error: 'Message required' }, 400);

  const db = new D1DatabaseService(c.env.DB);
  const tg = new TelegramBotService(c.env, db);
  const users = await db.getAllUsers(500);

  const targetUsers = Array.isArray(userIds) && userIds.length > 0
    ? users.filter((u) => userIds.includes(u.id))
    : users;

  let sent = 0;
  let failed = 0;

  for (const u of targetUsers) {
    if (u.telegramId && !u.telegramId.startsWith('guest_')) {
      try {
        const res = await tg.sendMessage(u.telegramId, messageText);
        if (res?.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }

  return c.json({ success: true, sent, failed, total: targetUsers.length });
});

// ==========================================
// 10. CLOUDFLARE WORKERS STATIC ASSETS
// ==========================================

// If deployed on Cloudflare Workers with Static Assets, delegate frontend routes to ASSETS binding
app.get('*', async (c) => {
  if (c.env.ASSETS) {
    return await c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('FitAI Cloudflare Worker API is running.', 200);
});

export default app;
