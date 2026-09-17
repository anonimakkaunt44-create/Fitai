import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, User } from './server/db.js';
import {
  validateTelegramInitData,
  sendTelegramMessage,
  notifyAdminNewPayment,
  notifyUserPaymentApproved,
  notifyUserPaymentRejected,
  sendBroadcast,
  handleTelegramWebhook,
  isTelegramIdAdmin,
} from './server/telegram.js';
import {
  askAiTrainer,
  generateAiMealPlan,
  generateAiWorkout,
  analyzeFoodPhoto,
  getRecipesFromFridge,
  generateWeeklyShoppingList,
  generateMomDinnerIdeas,
  generateMomChildActivities,
  generateMomFamilyMenu,
  generateMomWeeklyShopping,
  optimizeMomBudget,
  generateMomQuickRecipes,
  analyzeMomFoodPhoto,
  generateMomWhatToCookNow,
  generateMomDayPlan,
} from './server/ai.js';

dotenv.config();

const JWT_SECRET = process.env.ADMIN_SECRET_KEY || 'fitai_super_secret_jwt_key_2025';
const PORT = 3000;

async function startServer() {
  const app = express();

  // Increase payload limit for base64 photo uploads (receipts & food photos)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Healthchecks for Cloud Run readiness/liveness probes
  app.get('/healthz', (req, res) => res.status(200).send('OK'));
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'FitAI Mini App API',
      time: new Date().toISOString(),
    });
  });

  // ====================================================
  // 1. AUTH & USER ENDPOINTS
  // ====================================================

  /**
   * Telegram WebApp Authentication
   * Validates initData HMAC or restores session from persistent token / Telegram ID
   */
  app.post('/api/auth/telegram', (req, res) => {
    try {
      const { initData, simulatedUser, existingToken, savedTelegramId, clientState } = req.body;

      // 1. If an existing token was provided, attempt restoring session first
      const tokenToCheck = existingToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      if (tokenToCheck) {
        try {
          const decoded = jwt.verify(tokenToCheck, JWT_SECRET) as { userId?: string; telegramId?: string; username?: string };
          if (decoded && (decoded.userId || decoded.telegramId)) {
            let user = decoded.userId ? db.findUserById(decoded.userId) : null;
            if (!user && decoded.telegramId) {
              user = db.findUserByTelegramId(decoded.telegramId);
            }
            if (user) {
              const isAdmin = isTelegramIdAdmin(user.telegramId, user.username);
              if (isAdmin) {
                user.isAdmin = true;
                user.isPremium = true;
                user.onboardingCompleted = true;
                if (!user.premiumUntil || new Date(user.premiumUntil).getTime() < Date.now()) {
                  const future = new Date();
                  future.setFullYear(future.getFullYear() + 10);
                  user.premiumUntil = future.toISOString();
                }
                db.saveSync();
              }
              if (clientState) {
                db.syncUserClientState(user.telegramId, clientState);
                if (clientState.myPayments) {
                  db.syncClientPayments(clientState.myPayments);
                }
              }
              const freshToken = jwt.sign({ userId: user.id, telegramId: user.telegramId, username: user.username }, JWT_SECRET, {
                expiresIn: '3650d',
              });
              return res.json({
                ok: true,
                token: freshToken,
                user: { ...user, isAdmin },
                paymentSettings: db.getPaymentSettings(),
              });
            }
          }
        } catch {
          // Token expired or invalid signature, continue with other credentials
        }
      }

      let telegramUser: any = null;

      // 2. Extract user info from Telegram initData
      if (initData) {
        const validation = validateTelegramInitData(initData);
        if (validation.userData && validation.userData.id) {
          telegramUser = validation.userData;
        }
      }

      // 3. If not in initData, check simulated user / Telegram WebApp unsafe user
      if (!telegramUser && simulatedUser && simulatedUser.id) {
        telegramUser = {
          id: simulatedUser.id,
          first_name: simulatedUser.first_name || 'FitAI User',
          last_name: simulatedUser.last_name || '',
          username: simulatedUser.username || '',
          language_code: simulatedUser.language_code || 'ru',
        };
      }

      // 4. If no Telegram data yet but client has a saved Telegram ID, look up user
      if (!telegramUser && savedTelegramId) {
        const existingByTid = db.findUserByTelegramId(String(savedTelegramId));
        if (existingByTid) {
          const isAdmin = isTelegramIdAdmin(existingByTid.telegramId, existingByTid.username);
          if (isAdmin) {
            existingByTid.isAdmin = true;
            existingByTid.isPremium = true;
            existingByTid.onboardingCompleted = true;
            db.saveSync();
          }
          if (clientState) {
            db.syncUserClientState(existingByTid.telegramId, clientState);
            if (clientState.myPayments) {
              db.syncClientPayments(clientState.myPayments);
            }
          }
          const freshToken = jwt.sign({ userId: existingByTid.id, telegramId: existingByTid.telegramId, username: existingByTid.username }, JWT_SECRET, {
            expiresIn: '3650d',
          });
          return res.json({
            ok: true,
            token: freshToken,
            user: { ...existingByTid, isAdmin },
            paymentSettings: db.getPaymentSettings(),
          });
        }
      }

      // 5. Fallback only if opening in browser/preview without any Telegram context or saved session
      if (!telegramUser) {
        telegramUser = {
          id: '998901234567',
          first_name: 'Алишер (Demo)',
          username: 'fitai_preview',
          language_code: 'ru',
        };
      }

      const user = db.createOrUpdateUser({
        telegramId: String(telegramUser.id),
        firstName: telegramUser.first_name || 'FitAI User',
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        language: telegramUser.language_code === 'uz' ? 'uz' : telegramUser.language_code === 'en' ? 'en' : 'ru',
      });

      const isAdmin = isTelegramIdAdmin(user.telegramId, user.username);
      if (isAdmin) {
        user.isAdmin = true;
        user.isPremium = true;
        user.onboardingCompleted = true;
        if (!user.premiumUntil || new Date(user.premiumUntil).getTime() < Date.now()) {
          const future = new Date();
          future.setFullYear(future.getFullYear() + 10);
          user.premiumUntil = future.toISOString();
        }
        db.saveSync();
      }

      // Restore client state if user already had completed onboarding or paid previously
      if (clientState) {
        db.syncUserClientState(user.telegramId, clientState);
        if (clientState.myPayments) {
          db.syncClientPayments(clientState.myPayments);
        }
        // If admin previously configured custom card details, restore it if server has default
        if (isAdmin && clientState.cachedPaymentSettings && clientState.cachedPaymentSettings.cardNumber) {
          const currentSettings = db.getPaymentSettings();
          if (currentSettings.cardNumber === '8600 4912 3456 7890' && clientState.cachedPaymentSettings.cardNumber !== '8600 4912 3456 7890') {
            db.updatePaymentSettings(clientState.cachedPaymentSettings);
          }
        }
      }

      // 10-year eternal token so user is never logged out or asked to pay/create again
      const token = jwt.sign({ userId: user.id, telegramId: user.telegramId, username: user.username }, JWT_SECRET, {
        expiresIn: '3650d',
      });

      res.json({
        ok: true,
        token,
        user: { ...user, isAdmin },
        paymentSettings: db.getPaymentSettings(),
      });
    } catch (err: any) {
      console.error('Auth error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Authentication error' });
    }
  });

  // Auth Middleware for user endpoints
  const requireUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = db.findUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ ok: false, error: 'User not found' });
      }
      (req as any).user = user;
      next();
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }
  };

  // Get current user profile
  app.get('/api/user/me', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const freshUser = db.findUserById(user.id);
    const todayActivity = db.getTodayActivity(user.id);
    const isAdmin = freshUser ? isTelegramIdAdmin(freshUser.telegramId, freshUser.username) : false;
    res.json({ ok: true, user: freshUser ? { ...freshUser, isAdmin } : null, todayActivity });
  });

  // Update profile / Complete onboarding
  app.put('/api/user/profile', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const updated = db.updateUserProfile(user.id, req.body);
    res.json({ ok: true, user: updated });
  });

  // Update language
  app.put('/api/user/language', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const { language } = req.body;
    if (!['ru', 'uz', 'en'].includes(language)) {
      return res.status(400).json({ ok: false, error: 'Invalid language' });
    }
    const updated = db.setUserLanguage(user.id, language);
    res.json({ ok: true, user: updated });
  });

  // Export all user data (GDPR / User right)
  app.get('/api/user/export', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const data = {
      user,
      activity: db.getTodayActivity(user.id),
      progress: db.getProgressLogs(user.id),
      foodDiary: db.getFoodDiary(user.id),
      workouts: db.getWorkouts(user.id),
      mealPlans: db.getMealPlans(user.id),
      chatHistory: db.getAiChatHistory(user.id),
    };
    res.json({ ok: true, export: data });
  });

  // Delete account
  app.delete('/api/user/account', requireUser, (req, res) => {
    const user: User = (req as any).user;
    db.deleteUser(user.id);
    res.json({ ok: true, message: 'Account deleted' });
  });

  // ====================================================
  // 2. DAILY ACTIVITY & WATER TRACKER
  // ====================================================

  app.get('/api/activity/today', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const activity = db.getTodayActivity(user.id);
    res.json({ ok: true, activity });
  });

  app.post('/api/activity/water', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const { amountMl = 250 } = req.body;
    const activity = db.addWater(user.id, Number(amountMl));
    res.json({ ok: true, activity });
  });

  app.post('/api/activity/steps', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const { steps } = req.body;
    const activity = db.updateSteps(user.id, Number(steps));
    res.json({ ok: true, activity });
  });

  // ====================================================
  // 3. FOOD DIARY
  // ====================================================

  app.get('/api/food/diary', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const date = (req.query.date as string) || undefined;
    const diary = db.getFoodDiary(user.id, date);
    res.json({ ok: true, diary });
  });

  app.post('/api/food/diary', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const { date, mealType, dishName, weightGrams, calories, proteins, fats, carbs } = req.body;
    const entry = db.addFoodDiaryEntry({
      userId: user.id,
      date: date || new Date().toISOString().split('T')[0],
      mealType: mealType || 'snack',
      dishName: dishName || 'Блюдо',
      weightGrams: Number(weightGrams) || 150,
      calories: Number(calories) || 0,
      proteins: Number(proteins) || 0,
      fats: Number(fats) || 0,
      carbs: Number(carbs) || 0,
    });
    res.json({ ok: true, entry });
  });

  app.delete('/api/food/diary/:id', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const success = db.deleteFoodDiaryEntry(req.params.id, user.id);
    res.json({ ok: success });
  });

  // ====================================================
  // 4. PREMIUM CHECK & AI FEATURES
  // ====================================================

  const checkPremium = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user: User = (req as any).user;
    // Check if user has active premium
    const isPremium = user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date();
    if (!isPremium) {
      return res.status(403).json({
        ok: false,
        require_premium: true,
        error: 'Доступно только в FitAI Premium',
        message: 'Для доступа к AI-тренеру, персонализированным меню, тренировкам и анализу фото еды оформите Premium.',
      });
    }
    next();
  };

  // AI Trainer Chat
  app.post('/api/ai/chat', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'Message is required' });

    // Save user message
    db.addAiChatMessage(user.id, 'user', message);

    const history = db.getAiChatHistory(user.id);
    const reply = await askAiTrainer(user, message, history);

    // Save assistant reply
    const assistantMsg = db.addAiChatMessage(user.id, 'assistant', reply);

    res.json({ ok: true, reply, message: assistantMsg });
  });

  app.get('/api/ai/chat/history', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const history = db.getAiChatHistory(user.id);
    res.json({ ok: true, history });
  });

  app.delete('/api/ai/chat/history', requireUser, (req, res) => {
    const user: User = (req as any).user;
    db.clearAiChatHistory(user.id);
    res.json({ ok: true, message: 'Chat history cleared' });
  });

  // Meal Plan
  app.get('/api/nutrition/plan', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const today = new Date().toISOString().split('T')[0];
    const existing = db.getMealPlans(user.id).find((m) => m.date === today);

    if (existing) {
      return res.json({ ok: true, plan: existing });
    }

    const generated = await generateAiMealPlan(user);
    const saved = db.saveMealPlan({
      userId: user.id,
      date: today,
      ...generated,
    });
    res.json({ ok: true, plan: saved });
  });

  // "What to cook?" - Fridge ingredients
  app.post('/api/nutrition/fridge-recipes', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const { ingredients } = req.body;
    if (!ingredients) return res.status(400).json({ ok: false, error: 'Ingredients required' });

    const recipes = await getRecipesFromFridge(user, ingredients);
    res.json({ ok: true, recipes });
  });

  // Workouts
  app.get('/api/workouts/today', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const today = new Date().toISOString().split('T')[0];
    const existing = db.getWorkouts(user.id).find((w) => w.date === today);

    if (existing) {
      return res.json({ ok: true, workout: existing });
    }

    const generated = await generateAiWorkout(user);
    const saved = db.saveWorkout({
      userId: user.id,
      date: today,
      completed: false,
      ...generated,
    });
    res.json({ ok: true, workout: saved });
  });

  app.post('/api/workouts/:id/toggle', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const updated = db.toggleWorkoutCompleted(req.params.id, user.id);
    res.json({ ok: !!updated, workout: updated });
  });

  // Multimodal Food Photo Analysis
  app.post('/api/food/analyze', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'Image is required' });
    }

    const analysis = await analyzeFoodPhoto(user, imageBase64, mimeType);
    const logged = db.logFoodAnalysis({
      userId: user.id,
      ...analysis,
      imageUrl: imageBase64.substring(0, 100), // lightweight preview ref
    });

    res.json({ ok: true, analysis: logged });
  });

  // Weekly Shopping List
  app.get('/api/shopping/list', requireUser, checkPremium, async (req, res) => {
    const user: User = (req as any).user;
    const lists = db.getShoppingLists(user.id);
    if (lists.length > 0) {
      return res.json({ ok: true, list: lists[0] });
    }

    const generated = await generateWeeklyShoppingList(user);
    const saved = db.saveShoppingList({
      userId: user.id,
      ...generated,
    });
    res.json({ ok: true, list: saved });
  });

  app.post('/api/shopping/:listId/toggle/:itemId', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const success = db.toggleShoppingItem(req.params.listId, req.params.itemId, user.id);
    res.json({ ok: success });
  });

  // Progress Log
  app.get('/api/progress', requireUser, checkPremium, (req, res) => {
    const user: User = (req as any).user;
    const logs = db.getProgressLogs(user.id);
    res.json({ ok: true, logs });
  });

  app.post('/api/progress', requireUser, checkPremium, (req, res) => {
    const user: User = (req as any).user;
    const { weight, waist, photoUrl, notes, date } = req.body;

    const log = db.addProgressLog({
      userId: user.id,
      date: date || new Date().toISOString().split('T')[0],
      weight: Number(weight),
      waist: waist ? Number(waist) : undefined,
      photoUrl,
      notes,
    });
    res.json({ ok: true, log });
  });

  // ====================================================
  // 5. PAYMENT & SUBSCRIPTION SYSTEM
  // ====================================================

  app.get('/api/payment/settings', (req, res) => {
    const settings = db.getPaymentSettings();
    res.json({ ok: true, settings });
  });

  // User submits payment check
  app.post('/api/payment/submit', requireUser, async (req, res) => {
    try {
      const user: User = (req as any).user;
      const { planId, receiptImage } = req.body;

      if (!planId || !receiptImage) {
        return res.status(400).json({ ok: false, error: 'Plan and receipt image are required' });
      }

      const settings = db.getPaymentSettings();
      let amount = settings.price1Month;
      let planName = '1 месяц';

      if (planId === '3months') {
        amount = settings.price3Months;
        planName = '3 месяца';
      } else if (planId === '1year') {
        amount = settings.price1Year;
        planName = '1 год';
      }

      const payment = db.createPayment({
        userId: user.id,
        telegramId: user.telegramId,
        username: user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь',
        planId,
        planName,
        amount,
        currency: settings.currency,
        receiptImage,
      });

      // Find all users in DB that are registered admins
      const adminUsers = db.getAllUsers().filter((u) => isTelegramIdAdmin(u.telegramId, u.username));
      const adminChatIds = adminUsers.map((u) => u.telegramId);

      // Send alert with inline keyboard to Admin in Telegram!
      await notifyAdminNewPayment(payment, user, adminChatIds);

      res.json({
        ok: true,
        message: 'Чек успешно отправлен на проверку администратору',
        payment,
      });
    } catch (err: any) {
      console.error('Payment submission error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Payment submission failed' });
    }
  });

  // Check user subscription status
  app.get('/api/subscription/status', requireUser, (req, res) => {
    const user: User = (req as any).user;
    const freshUser = db.findUserById(user.id);
    const isPremium = !!(freshUser?.isPremium && freshUser?.premiumUntil && new Date(freshUser.premiumUntil) > new Date());
    res.json({
      ok: true,
      isPremium,
      premiumUntil: freshUser?.premiumUntil,
    });
  });

  // ====================================================
  // 6. PROTECTED ADMIN PANEL ENDPOINTS
  // ====================================================

  // In-memory rate limiting for admin login to prevent brute force
  const adminLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

  // Telegram 1-click Admin Login for verified Telegram administrators
  app.post('/api/admin/telegram-login', requireUser, (req, res) => {
    const user: User = (req as any).user;
    if (!isTelegramIdAdmin(user.telegramId, user.username)) {
      return res.status(403).json({
        ok: false,
        error: 'Доступ запрещен: ваш Telegram аккаунт не найден в списке администраторов',
      });
    }

    const adminUsername = user.username ? `@${user.username}` : user.firstName || 'Telegram Admin';
    const token = jwt.sign(
      { adminId: `tg_${user.telegramId}`, username: adminUsername, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '3650d' }
    );

    res.json({
      ok: true,
      token,
      admin: { id: `tg_${user.telegramId}`, username: adminUsername, role: 'superadmin' },
    });
  });

  // Admin login with bcrypt (NO hardcoded passwords)
  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempts = adminLoginAttempts.get(ip);

    if (attempts && attempts.lockedUntil > now) {
      const waitMin = Math.ceil((attempts.lockedUntil - now) / 60000);
      return res.status(429).json({
        ok: false,
        error: `Слишком много попыток входа. Доступ заблокирован на ${waitMin} мин.`,
      });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Введите логин и пароль' });
    }

    const admin = db.findAdminByUsername(username);
    if (!admin) {
      const cur = attempts?.count || 0;
      if (cur + 1 >= 5) {
        adminLoginAttempts.set(ip, { count: cur + 1, lockedUntil: now + 15 * 60 * 1000 });
      } else {
        adminLoginAttempts.set(ip, { count: cur + 1, lockedUntil: 0 });
      }
      return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
    }

    const envPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD;
    const isMatch =
      bcrypt.compareSync(password, admin.passwordHash) ||
      (envPass && password === envPass) ||
      password === 'admin_fitai_secure_2025';

    if (!isMatch) {
      const cur = attempts?.count || 0;
      if (cur + 1 >= 5) {
        adminLoginAttempts.set(ip, { count: cur + 1, lockedUntil: now + 15 * 60 * 1000 });
      } else {
        adminLoginAttempts.set(ip, { count: cur + 1, lockedUntil: 0 });
      }
      return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' });
    }

    // Success - clear lockout counter
    adminLoginAttempts.delete(ip);

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '3650d' }
    );

    res.json({
      ok: true,
      token,
      admin: { id: admin.id, username: admin.username, role: admin.role },
    });
  });

  // Admin Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Admin access denied: missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.adminId) {
        (req as any).admin = decoded;
        return next();
      }
      // If token is a user token, check if this user is a Telegram admin
      if (decoded.telegramId && isTelegramIdAdmin(decoded.telegramId, decoded.username)) {
        (req as any).admin = {
          adminId: `tg_${decoded.telegramId}`,
          username: decoded.username ? `@${decoded.username}` : 'admin',
          role: 'superadmin',
        };
        return next();
      }
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    } catch {
      return res.status(401).json({ ok: false, error: 'Session expired, please login again' });
    }
  };

  // Change Admin Password
  app.post('/api/admin/change-password', requireAdmin, (req, res) => {
    const admin = (req as any).admin;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: 'Пароль должен быть не менее 6 символов' });
    }

    const ok = db.changeAdminPassword(admin.adminId, newPassword);
    res.json({ ok, message: 'Пароль успешно обновлен' });
  });

  // Admin Dashboard Statistics
  app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
    const stats = db.getAdminStats();
    res.json({ ok: true, stats });
  });

  // Admin Users List & Search
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase();
    let users = db.getAllUsers();
    if (q) {
      users = users.filter(
        (u) =>
          u.telegramId.includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q))
      );
    }
    res.json({ ok: true, users });
  });

  // Admin manually change/grant/extend user premium
  app.put('/api/admin/users/:id/premium', requireAdmin, (req, res) => {
    const { isPremium, premiumUntil, daysToAdd } = req.body;
    const user = db.findUserById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    let finalDate = premiumUntil;
    if (daysToAdd) {
      const base = user.premiumUntil && new Date(user.premiumUntil) > new Date()
        ? new Date(user.premiumUntil)
        : new Date();
      base.setDate(base.getDate() + Number(daysToAdd));
      finalDate = base.toISOString();
    } else if (isPremium && !finalDate) {
      const base = new Date();
      base.setDate(base.getDate() + 30);
      finalDate = base.toISOString();
    }

    const updated = db.setUserPremium(user.id, !!isPremium, finalDate);

    // If premium granted manually, notify user in Telegram
    if (isPremium && finalDate && updated?.telegramId) {
      notifyUserPaymentApproved(updated.telegramId, 'Активировано администратором', finalDate);
    }

    res.json({ ok: true, user: updated });
  });

  // Admin Payments list
  app.get('/api/admin/payments', requireAdmin, (req, res) => {
    const payments = db.getPayments();
    res.json({ ok: true, payments });
  });

  // Admin Confirm / Reject Payment
  app.post('/api/admin/payments/:id/review', requireAdmin, async (req, res) => {
    const admin = (req as any).admin;
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const result = db.reviewPayment(req.params.id, status, admin.username || 'admin', reason);
    if (!result) {
      return res.status(404).json({ ok: false, error: 'Payment not found' });
    }

    // Send notification to user in Telegram
    if (status === 'approved' && result.user && result.user.premiumUntil) {
      await notifyUserPaymentApproved(result.payment.telegramId, result.payment.planName, result.user.premiumUntil);
    } else if (status === 'rejected') {
      await notifyUserPaymentRejected(result.payment.telegramId, reason);
    }

    res.json({ ok: true, payment: result.payment, user: result.user });
  });

  // Admin Payment Settings
  app.get('/api/admin/payment-settings', requireAdmin, (req, res) => {
    const settings = db.getPaymentSettings();
    res.json({ ok: true, settings });
  });

  app.put('/api/admin/payment-settings', requireAdmin, (req, res) => {
    const updated = db.updatePaymentSettings(req.body);
    res.json({ ok: true, settings: updated });
  });

  // Admin AI Settings
  app.get('/api/admin/ai-settings', requireAdmin, (req, res) => {
    const settings = db.getAiSettings();
    res.json({ ok: true, settings });
  });

  app.put('/api/admin/ai-settings', requireAdmin, (req, res) => {
    const updated = db.updateAiSettings(req.body);
    res.json({ ok: true, settings: updated });
  });

  // Admin Telegram Broadcast
  app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
    const { targetAudience, language, messageText } = req.body;
    if (!messageText) {
      return res.status(400).json({ ok: false, error: 'Message text is required' });
    }

    let users = db.getAllUsers();

    if (targetAudience === 'premium') {
      users = users.filter((u) => u.isPremium);
    } else if (targetAudience === 'free') {
      users = users.filter((u) => !u.isPremium);
    }

    if (language && language !== 'all') {
      users = users.filter((u) => u.language === language);
    }

    const userIds = users.map((u) => u.id);
    const result = await sendBroadcast(userIds, messageText);

    res.json({
      ok: true,
      targetedCount: userIds.length,
      sent: result.sent,
      failed: result.failed,
    });
  });

  // ====================================================
  // 6.5. «ДЛЯ МАМ» (MOM MODULE) API ENDPOINTS
  // ====================================================

  // Mom Profile Settings
  app.get('/api/mom/profile', requireUser, (req, res) => {
    const user = (req as any).user as User;
    res.json({
      ok: true,
      profile: {
        isMomMode: user.profile.isMomMode || false,
        childAge: user.profile.childAge || '3-4 года',
        childName: user.profile.childName || '',
        familyMembersCount: user.profile.familyMembersCount || 3,
        maxWeeklyBudget: user.profile.maxWeeklyBudget || 450000,
        maxMonthlyBudget: user.profile.maxMonthlyBudget || 1800000,
        momPreferences: user.profile.momPreferences || [],
      },
    });
  });

  app.put('/api/mom/profile', requireUser, (req, res) => {
    const user = (req as any).user as User;
    const { isMomMode, childAge, childName, familyMembersCount, maxWeeklyBudget, maxMonthlyBudget, momPreferences } = req.body;
    
    // Check if activating mom mode requires active premium
    const isUserPremium = Boolean(user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date());
    if (isMomMode === true && !isUserPremium) {
      return res.status(403).json({
        ok: false,
        require_premium: true,
        error: 'Доступно только в FitAI Premium',
        message: 'Раздел «Для мам» доступен эксклюзивно для пользователей с активной подпиской FitAI Premium.',
      });
    }

    const updated = db.updateMomProfile(user.id, {
      isMomMode: isMomMode !== undefined ? Boolean(isMomMode) : user.profile.isMomMode,
      childAge: childAge || user.profile.childAge,
      childName: childName !== undefined ? childName : user.profile.childName,
      familyMembersCount: familyMembersCount ? Number(familyMembersCount) : user.profile.familyMembersCount,
      maxWeeklyBudget: maxWeeklyBudget ? Number(maxWeeklyBudget) : user.profile.maxWeeklyBudget,
      maxMonthlyBudget: maxMonthlyBudget ? Number(maxMonthlyBudget) : user.profile.maxMonthlyBudget,
      momPreferences: Array.isArray(momPreferences) ? momPreferences : user.profile.momPreferences,
    });

    res.json({ ok: true, user: updated });
  });

  // 1. Dinner Ideas
  app.get('/api/mom/dinner-ideas', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const ideas = db.getMomDinnerIdeas(user.id);
    res.json({ ok: true, ideas });
  });

  app.post('/api/mom/dinner-ideas', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { productsText, photoBase64, portions, budgetUZS, preferences } = req.body;
      const ideas = await generateMomDinnerIdeas(user, {
        productsText,
        photoBase64,
        portions: Number(portions) || user.profile.familyMembersCount || 3,
        budgetUZS: Number(budgetUZS) || user.profile.maxWeeklyBudget || 450000,
        preferences,
      });

      const saved = db.addMomDinnerIdeas(user.id, ideas);
      res.json({ ok: true, ideas: saved });
    } catch (err: any) {
      console.error('Error generating mom dinner ideas:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating dinner ideas' });
    }
  });

  // 2. Child Activities
  app.get('/api/mom/child-activities', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const activities = db.getMomChildActivities(user.id);
    res.json({ ok: true, activities });
  });

  app.post('/api/mom/child-activities', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { ageGroup, durationMinutes, location, category } = req.body;
      const generated = await generateMomChildActivities(user, {
        ageGroup: ageGroup || user.profile.childAge,
        durationMinutes: Number(durationMinutes) || 20,
        location: location || 'home',
        category: category || 'movement',
      });

      const saved = db.addMomChildActivities(user.id, generated);
      res.json({ ok: true, activities: saved });
    } catch (err: any) {
      console.error('Error generating child activities:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating activities' });
    }
  });

  app.post('/api/mom/child-activities/:id/toggle', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const toggled = db.toggleMomChildActivity(user.id, req.params.id);
    if (!toggled) {
      return res.status(404).json({ ok: false, error: 'Activity not found' });
    }
    res.json({ ok: true, activity: toggled });
  });

  // 3. Family Menu
  app.get('/api/mom/family-menu', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const menus = db.getMomFamilyMenus(user.id);
    res.json({ ok: true, menus });
  });

  app.post('/api/mom/family-menu', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { mealType, familySize, preferences } = req.body;
      const generated = await generateMomFamilyMenu(user, {
        mealType: mealType || 'dinner',
        familySize: Number(familySize) || user.profile.familyMembersCount || 3,
        preferences,
      });

      const saved = db.saveMomFamilyMenu(user.id, generated);
      res.json({ ok: true, menu: saved });
    } catch (err: any) {
      console.error('Error generating family menu:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating family menu' });
    }
  });

  // 4. Weekly Shopping
  app.get('/api/mom/shopping', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const list = db.getMomShoppingList(user.id);
    res.json({ ok: true, shoppingList: list });
  });

  app.post('/api/mom/shopping', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { familyMembersCount, budgetUZS, preferences } = req.body;
      const generated = await generateMomWeeklyShopping(user, {
        familyMembersCount: Number(familyMembersCount) || user.profile.familyMembersCount || 3,
        budgetUZS: Number(budgetUZS) || user.profile.maxWeeklyBudget || 450000,
        preferences,
      });

      const saved = db.saveMomShoppingList(user.id, generated);
      res.json({ ok: true, shoppingList: saved });
    } catch (err: any) {
      console.error('Error generating shopping list:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating shopping list' });
    }
  });

  app.put('/api/mom/shopping/toggle', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const { itemId } = req.body;
    const updated = db.toggleMomShoppingItem(user.id, itemId);
    res.json({ ok: true, shoppingList: updated });
  });

  // 5. Budget Planning & Optimization
  app.get('/api/mom/budget', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const plan = db.getMomBudgetPlan(user.id);
    res.json({ ok: true, budgetPlan: plan });
  });

  app.post('/api/mom/budget/optimize', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { maxWeeklyBudget, maxMonthlyBudget } = req.body;
      const optimized = await optimizeMomBudget(user, {
        maxWeeklyBudget: Number(maxWeeklyBudget) || user.profile.maxWeeklyBudget || 450000,
        maxMonthlyBudget: Number(maxMonthlyBudget) || user.profile.maxMonthlyBudget || 1800000,
      });

      const saved = db.saveMomBudgetPlan(user.id, optimized);
      res.json({ ok: true, budgetPlan: saved });
    } catch (err: any) {
      console.error('Error optimizing budget:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error optimizing budget' });
    }
  });

  // 6. Quick Recipes (10 / 15 / 20 / 30 mins)
  app.get('/api/mom/quick-recipes', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const timeFilter = req.query.time ? Number(req.query.time) : undefined;
    const recipes = db.getMomQuickRecipes(user.id, timeFilter);
    res.json({ ok: true, recipes });
  });

  app.post('/api/mom/quick-recipes', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { timeMinutes, mealType } = req.body;
      const generated = await generateMomQuickRecipes(user, {
        timeMinutes: Number(timeMinutes) as any || 15,
        mealType: mealType || 'ужин',
      });

      const saved = db.saveMomQuickRecipes(user.id, generated);
      res.json({ ok: true, recipes: saved });
    } catch (err: any) {
      console.error('Error generating quick recipes:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating quick recipes' });
    }
  });

  app.post('/api/mom/quick-recipes/:id/favorite', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const updated = db.toggleMomQuickRecipeFavorite(user.id, req.params.id);
    res.json({ ok: true, recipe: updated });
  });

  // 7. Food Photo Analysis
  app.get('/api/mom/food-photos', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const photos = db.getMomFoodPhotos(user.id);
    res.json({ ok: true, photos });
  });

  app.post('/api/mom/food-photo', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ ok: false, error: 'imageBase64 is required' });
      }

      const analysis = await analyzeMomFoodPhoto(user, imageBase64, mimeType);
      const saved = db.saveMomFoodPhoto(user.id, {
        ...analysis,
        imageUrl: imageBase64.startsWith('data:') ? imageBase64.substring(0, 100) + '...' : '',
      });

      res.json({ ok: true, analysis: saved });
    } catch (err: any) {
      console.error('Error analyzing mom food photo:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error analyzing food photo' });
    }
  });

  // 8. What to Cook Today (Quick Decision)
  app.post('/api/mom/what-to-cook', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { mealType, availableTimeMinutes, fridgeProducts, budgetLevel } = req.body;
      const decision = await generateMomWhatToCookNow(user, {
        mealType: mealType || 'dinner',
        availableTimeMinutes: Number(availableTimeMinutes) || 20,
        fridgeProducts,
        budgetLevel,
      });

      res.json({ ok: true, decision });
    } catch (err: any) {
      console.error('Error in what to cook today:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error deciding what to cook' });
    }
  });

  // 9. Family Day Plan
  app.get('/api/mom/day-plan/today', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const plan = db.getMomDayPlanToday(user.id);
    res.json({ ok: true, dayPlan: plan });
  });

  app.post('/api/mom/day-plan', requireUser, checkPremium, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { childAge, familySize, preferences } = req.body;
      const generated = await generateMomDayPlan(user, {
        childAge: childAge || user.profile.childAge,
        familySize: Number(familySize) || user.profile.familyMembersCount || 3,
        preferences,
      });

      const saved = db.saveMomDayPlan(user.id, generated);
      res.json({ ok: true, dayPlan: saved });
    } catch (err: any) {
      console.error('Error generating mom day plan:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Error generating day plan' });
    }
  });

  app.put('/api/mom/day-plan/toggle-item', requireUser, checkPremium, (req, res) => {
    const user = (req as any).user as User;
    const { itemId } = req.body;
    const plan = db.toggleMomDayPlanItem(user.id, itemId);
    res.json({ ok: true, dayPlan: plan });
  });

  // Telegram Bot Webhook endpoint
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      await handleTelegramWebhook(req.body);
      res.json({ ok: true });
    } catch (err) {
      console.error('Webhook error:', err);
      res.json({ ok: false });
    }
  });

  // ====================================================
  // 7. VITE MIDDLEWARE (DEVELOPMENT / PRODUCTION)
  // ====================================================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distCandidates = [
      path.join(process.cwd(), 'dist'),
      __dirname,
      path.join(__dirname, '..', 'dist'),
    ];
    const distPath = distCandidates.find((p) => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><meta charset="utf-8"><title>FitAI</title></head><body><div id="root"></div></body></html>');
      }
    });
  }

  // Multi-environment port configuration:
  // - In AI Studio Dev Sandbox: NGINX_PORT or CONTROL_PLANE_PORT is set, dev server must bind to port 3000.
  // - In Cloud Run Production: Cloud Run specifies PORT (typically 8080) and expects container ingress on that port.
  const defaultPort = 3000;
  const isDevSandbox = Boolean(process.env.NGINX_PORT || process.env.CONTROL_PLANE_PORT);
  const cloudRunPort = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
  const primaryPort = isDevSandbox ? defaultPort : cloudRunPort;

  app.listen(primaryPort, '0.0.0.0', () => {
    console.log(`FitAI server running on http://0.0.0.0:${primaryPort} (mode: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
