import { Env, D1Database, User, UserProfile, Payment, PaymentSettings, DailyActivity, UserFileMeta } from './types';

/**
 * Cloudflare D1 Database Access Layer for FitAI
 * Uses native prepared statements for high performance and zero SQL injection risk.
 */

export class D1DatabaseService {
  constructor(private db: D1Database) {}

  // ==========================================
  // 1. Users
  // ==========================================

  private mapUser(row: any): User {
    let profile: UserProfile = {};
    try {
      profile = typeof row.profile_json === 'string' ? JSON.parse(row.profile_json) : (row.profile_json || {});
    } catch {
      profile = {};
    }

    return {
      id: row.id,
      telegramId: row.telegram_id,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      username: row.username || undefined,
      phone: row.phone || undefined,
      language: (row.language as any) || 'ru',
      isPremium: Boolean(row.is_premium),
      premiumUntil: row.premium_until || undefined,
      isAdmin: Boolean(row.is_admin),
      onboardingCompleted: Boolean(row.onboarding_completed),
      profile,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
      .bind(id)
      .first();
    return row ? this.mapUser(row) : null;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT * FROM users WHERE telegram_id = ? LIMIT 1')
      .bind(telegramId)
      .first();
    return row ? this.mapUser(row) : null;
  }

  async createOrUpdateUser(userData: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    language?: 'ru' | 'uz' | 'en';
  }): Promise<User> {
    const existing = await this.getUserByTelegramId(userData.telegramId);
    const now = new Date().toISOString();

    if (existing) {
      await this.db
        .prepare(`
          UPDATE users
          SET first_name = ?,
              last_name = COALESCE(?, last_name),
              username = COALESCE(?, username),
              language = COALESCE(?, language),
              updated_at = ?
          WHERE telegram_id = ?
        `)
        .bind(
          userData.firstName,
          userData.lastName || null,
          userData.username || null,
          userData.language || null,
          now,
          userData.telegramId
        )
        .run();

      return (await this.getUserByTelegramId(userData.telegramId))!;
    }

    const newId = `usr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const defaultProfile: UserProfile = {
      weight: 75,
      targetWeight: 65,
      height: 175,
      age: 28,
      gender: 'male',
      activityLevel: 'moderate',
      workoutsPerWeek: 3,
      waterGoalMl: 2500,
      stepsGoal: 10000,
      notificationsEnabled: true,
    };

    await this.db
      .prepare(`
        INSERT INTO users (
          id, telegram_id, first_name, last_name, username,
          language, is_premium, is_admin, onboarding_completed,
          profile_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)
      `)
      .bind(
        newId,
        userData.telegramId,
        userData.firstName,
        userData.lastName || null,
        userData.username || null,
        userData.language || 'ru',
        JSON.stringify(defaultProfile),
        now,
        now
      )
      .run();

    return (await this.getUserById(newId))!;
  }

  async updateUserProfile(userId: string, profileUpdates: Partial<UserProfile>, onboardingCompleted?: boolean): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const mergedProfile = { ...user.profile, ...profileUpdates };
    const now = new Date().toISOString();
    const newOnboarding = onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : (user.onboardingCompleted ? 1 : 0);

    await this.db
      .prepare(`
        UPDATE users
        SET profile_json = ?,
            onboarding_completed = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(JSON.stringify(mergedProfile), newOnboarding, now, userId)
      .run();

    return await this.getUserById(userId);
  }

  async setUserAdmin(telegramId: string, isAdmin: boolean): Promise<boolean> {
    const res = await this.db
      .prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE telegram_id = ?')
      .bind(isAdmin ? 1 : 0, new Date().toISOString(), telegramId)
      .run();
    return res.success;
  }

  async setPremium(userId: string, isPremium: boolean, durationMonths: number = 1): Promise<User | null> {
    const now = new Date();
    let premiumUntil: string | null = null;
    if (isPremium) {
      const untilDate = new Date(now);
      untilDate.setMonth(untilDate.getMonth() + durationMonths);
      premiumUntil = untilDate.toISOString();
    }

    await this.db
      .prepare(`
        UPDATE users
        SET is_premium = ?,
            premium_until = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(isPremium ? 1 : 0, premiumUntil, now.toISOString(), userId)
      .run();

    return await this.getUserById(userId);
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return (results || []).map((row: any) => this.mapUser(row));
  }

  async deleteUser(id: string): Promise<boolean> {
    const res = await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return res.success;
  }

  // ==========================================
  // 2. Daily Activity
  // ==========================================

  async getDailyActivity(userId: string, date: string): Promise<DailyActivity | null> {
    const row: any = await this.db
      .prepare('SELECT * FROM daily_activity WHERE user_id = ? AND date = ? LIMIT 1')
      .bind(userId, date)
      .first();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      waterMl: row.water_ml,
      waterGoalMl: row.water_goal_ml,
      steps: row.steps,
      stepsGoal: row.steps_goal,
      streakCount: row.streak_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateDailyActivity(userId: string, date: string, updates: {
    waterMl?: number;
    steps?: number;
    streakCount?: number;
    waterGoalMl?: number;
    stepsGoal?: number;
  }): Promise<DailyActivity> {
    const existing = await this.getDailyActivity(userId, date);
    const now = new Date().toISOString();

    if (existing) {
      const waterMl = updates.waterMl !== undefined ? updates.waterMl : existing.waterMl;
      const steps = updates.steps !== undefined ? updates.steps : existing.steps;
      const streakCount = updates.streakCount !== undefined ? updates.streakCount : existing.streakCount;
      const waterGoal = updates.waterGoalMl !== undefined ? updates.waterGoalMl : existing.waterGoalMl;
      const stepsGoal = updates.stepsGoal !== undefined ? updates.stepsGoal : existing.stepsGoal;

      await this.db
        .prepare(`
          UPDATE daily_activity
          SET water_ml = ?, steps = ?, streak_count = ?, water_goal_ml = ?, steps_goal = ?, updated_at = ?
          WHERE id = ?
        `)
        .bind(waterMl, steps, streakCount, waterGoal, stepsGoal, now, existing.id)
        .run();

      return (await this.getDailyActivity(userId, date))!;
    }

    const newId = `act_${Date.now()}`;
    await this.db
      .prepare(`
        INSERT INTO daily_activity (id, user_id, date, water_ml, water_goal_ml, steps, steps_goal, streak_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        newId,
        userId,
        date,
        updates.waterMl || 0,
        updates.waterGoalMl || 2500,
        updates.steps || 0,
        updates.stepsGoal || 10000,
        updates.streakCount || 1,
        now,
        now
      )
      .run();

    return (await this.getDailyActivity(userId, date))!;
  }

  // ==========================================
  // 3. Payments & Payment Settings
  // ==========================================

  async getPaymentSettings(): Promise<PaymentSettings> {
    const row: any = await this.db.prepare('SELECT * FROM payment_settings WHERE id = "default" LIMIT 1').first();
    if (row) {
      return {
        id: row.id,
        cardNumber: row.card_number,
        cardHolder: row.card_holder,
        bankName: row.bank_name,
        instructions: row.instructions,
        instructionsUz: row.instructions_uz || undefined,
        instructionsEn: row.instructions_en || undefined,
        price1Month: row.price_1_month,
        price3Months: row.price_3_months,
        price1Year: row.price_1_year,
        currency: row.currency || 'UZS',
        updatedAt: row.updated_at,
      };
    }

    return {
      cardNumber: '8600 4912 3456 7890',
      cardHolder: 'FITAI PAYMENTS / ALISHER U.',
      bankName: 'Kapitalbank / Uzcard / Humo / Visa',
      instructions: '1. Переведите сумму на карту.\n2. Прикрепите чек.',
      price1Month: 99000,
      price3Months: 249000,
      price1Year: 699000,
      currency: 'UZS',
      updatedAt: new Date().toISOString(),
    };
  }

  async updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
    const current = await this.getPaymentSettings();
    const updated: PaymentSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .prepare(`
        INSERT OR REPLACE INTO payment_settings (
          id, card_number, card_holder, bank_name, instructions,
          instructions_uz, instructions_en, price_1_month, price_3_months,
          price_1_year, currency, updated_at
        ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        updated.cardNumber,
        updated.cardHolder,
        updated.bankName,
        updated.instructions,
        updated.instructionsUz || null,
        updated.instructionsEn || null,
        updated.price1Month,
        updated.price3Months,
        updated.price1Year,
        updated.currency,
        updated.updatedAt
      )
      .run();

    return updated;
  }

  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      userId: row.user_id,
      telegramId: row.telegram_id,
      fullName: row.full_name,
      username: row.username || undefined,
      planId: row.plan_id,
      planName: row.plan_name,
      amount: row.amount,
      currency: row.currency,
      receiptUrl: row.receipt_url || undefined,
      receiptR2Key: row.receipt_r2_key || undefined,
      status: row.status,
      reviewedBy: row.reviewed_by || undefined,
      reviewedAt: row.reviewed_at || undefined,
      rejectReason: row.reject_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createPayment(p: {
    userId: string;
    telegramId: string;
    fullName: string;
    username?: string;
    planId: string;
    planName: string;
    amount: number;
    currency: string;
    receiptUrl?: string;
    receiptR2Key?: string;
  }): Promise<Payment> {
    const id = `pay_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO payments (
          id, user_id, telegram_id, full_name, username,
          plan_id, plan_name, amount, currency, receipt_url,
          receipt_r2_key, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `)
      .bind(
        id,
        p.userId,
        p.telegramId,
        p.fullName,
        p.username || null,
        p.planId,
        p.planName,
        p.amount,
        p.currency,
        p.receiptUrl || null,
        p.receiptR2Key || null,
        now,
        now
      )
      .run();

    const row = await this.db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    return this.mapPayment(row);
  }

  async getPayments(status?: 'pending' | 'approved' | 'rejected', limit = 100): Promise<Payment[]> {
    let query = 'SELECT * FROM payments';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const { results } = await this.db.prepare(query).bind(...params).all();
    return (results || []).map((row: any) => this.mapPayment(row));
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const row = await this.db.prepare('SELECT * FROM payments WHERE id = ? LIMIT 1').bind(id).first();
    return row ? this.mapPayment(row) : null;
  }

  async reviewPayment(paymentId: string, status: 'approved' | 'rejected', reviewedBy: string, rejectReason?: string): Promise<{ payment: Payment; user?: User } | null> {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) return null;

    const now = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE payments
        SET status = ?, reviewed_by = ?, reviewed_at = ?, reject_reason = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(status, reviewedBy, now, rejectReason || null, now, paymentId)
      .run();

    const updatedPayment = (await this.getPaymentById(paymentId))!;
    let updatedUser: User | null = null;

    if (status === 'approved') {
      let months = 1;
      if (payment.planId === '3_months') months = 3;
      if (payment.planId === '1_year') months = 12;
      updatedUser = await this.setPremium(payment.userId, true, months);
    }

    return { payment: updatedPayment, user: updatedUser || undefined };
  }

  // ==========================================
  // 4. Admin Users
  // ==========================================

  async getAdminUser(username: string): Promise<{ id: string; username: string; passwordHash: string; role: string } | null> {
    const row: any = await this.db
      .prepare('SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?) LIMIT 1')
      .bind(username)
      .first();

    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
    };
  }

  async createAdminUser(username: string, passwordHash: string, role = 'admin'): Promise<boolean> {
    const id = `admin_${Date.now()}`;
    const now = new Date().toISOString();
    const res = await this.db
      .prepare('INSERT OR REPLACE INTO admin_users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, username, passwordHash, role, now, now)
      .run();
    return res.success;
  }

  // ==========================================
  // 5. Telegram Webhook Deduplication & State
  // ==========================================

  async isTelegramUpdateProcessed(updateId: number): Promise<boolean> {
    const row = await this.db
      .prepare('SELECT update_id FROM telegram_updates WHERE update_id = ? LIMIT 1')
      .bind(updateId)
      .first();
    return Boolean(row);
  }

  async recordTelegramUpdate(updateId: number): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO telegram_updates (update_id, processed_at) VALUES (?, ?)')
      .bind(updateId, new Date().toISOString())
      .run();
  }

  async getTelegramDialogState(telegramId: string): Promise<{ step: string; state: any } | null> {
    const row: any = await this.db
      .prepare('SELECT step, state_json FROM telegram_dialog_states WHERE telegram_id = ? LIMIT 1')
      .bind(telegramId)
      .first();

    if (!row) return null;
    try {
      return { step: row.step, state: JSON.parse(row.state_json) };
    } catch {
      return { step: row.step, state: {} };
    }
  }

  async setTelegramDialogState(telegramId: string, step: string, state: any): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        INSERT OR REPLACE INTO telegram_dialog_states (telegram_id, step, state_json, updated_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(telegramId, step, JSON.stringify(state), now)
      .run();
  }

  // ==========================================
  // 6. User Files (R2 metadata)
  // ==========================================

  async saveUserFile(file: UserFileMeta): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO user_files (id, r2_key, user_id, file_name, mime_type, size_bytes, purpose, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        file.id,
        file.r2Key,
        file.userId,
        file.fileName,
        file.mimeType,
        file.sizeBytes,
        file.purpose,
        file.isPublic ? 1 : 0,
        file.createdAt
      )
      .run();
  }

  async getUserFileByR2Key(r2Key: string): Promise<UserFileMeta | null> {
    const row: any = await this.db
      .prepare('SELECT * FROM user_files WHERE r2_key = ? LIMIT 1')
      .bind(r2Key)
      .first();

    if (!row) return null;
    return {
      id: row.id,
      r2Key: row.r2_key,
      userId: row.user_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      purpose: row.purpose,
      isPublic: Boolean(row.is_public),
      createdAt: row.created_at,
    };
  }

  async deleteUserFile(r2Key: string): Promise<boolean> {
    const res = await this.db.prepare('DELETE FROM user_files WHERE r2_key = ?').bind(r2Key).run();
    return res.success;
  }

  // ==========================================
  // 7. AI & Food Features
  // ==========================================

  async logAiUsage(userId: string, feature: string, status: 'success' | 'error', errorMessage?: string): Promise<void> {
    const id = `ai_${Date.now()}_${crypto.randomUUID().slice(0, 4)}`;
    await this.db
      .prepare('INSERT INTO ai_usage (id, user_id, feature, status, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, userId, feature, status, errorMessage || null, new Date().toISOString())
      .run();
  }

  async saveFoodAnalysis(userId: string, data: any, imageR2Key?: string): Promise<string> {
    const id = `fa_${Date.now()}`;
    await this.db
      .prepare(`
        INSERT INTO food_analysis (
          id, user_id, image_r2_key, dish_name, calories, protein, fat, carbs, health_score, recommendations_json, raw_analysis_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        userId,
        imageR2Key || null,
        data.dishName || 'Блюдо',
        data.calories || 0,
        data.protein || 0,
        data.fat || 0,
        data.carbs || 0,
        data.healthScore || 8,
        JSON.stringify(data.recommendations || []),
        JSON.stringify(data),
        new Date().toISOString()
      )
      .run();
    return id;
  }

  async getFoodHistory(userId: string, limit = 20): Promise<any[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM food_analysis WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(userId, limit)
      .all();

    return (results || []).map((r: any) => {
      let recs = [];
      try { recs = JSON.parse(r.recommendations_json); } catch {}
      return {
        id: r.id,
        userId: r.user_id,
        dishName: r.dish_name,
        calories: r.calories,
        protein: r.protein,
        fat: r.fat,
        carbs: r.carbs,
        healthScore: r.health_score,
        recommendations: recs,
        imageR2Key: r.image_r2_key,
        createdAt: r.created_at,
      };
    });
  }

  async addFoodDiaryEntry(entry: {
    userId: string;
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    title: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    photoR2Key?: string;
  }): Promise<string> {
    const id = `fd_${Date.now()}`;
    await this.db
      .prepare(`
        INSERT INTO food_diary (id, user_id, date, meal_type, title, calories, protein, fat, carbs, photo_r2_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        entry.userId,
        entry.date,
        entry.mealType,
        entry.title,
        entry.calories,
        entry.protein,
        entry.fat,
        entry.carbs,
        entry.photoR2Key || null,
        new Date().toISOString()
      )
      .run();
    return id;
  }

  async getFoodDiary(userId: string, date: string): Promise<any[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM food_diary WHERE user_id = ? AND date = ? ORDER BY created_at ASC')
      .bind(userId, date)
      .all();
    return results || [];
  }

  async saveAiChatMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    const id = `chat_${Date.now()}_${crypto.randomUUID().slice(0, 4)}`;
    await this.db
      .prepare('INSERT INTO ai_chat_history (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, userId, role, content, new Date().toISOString())
      .run();
  }

  async getAiChatHistory(userId: string, limit = 20): Promise<{ role: string; content: string }[]> {
    const { results } = await this.db
      .prepare('SELECT role, content FROM ai_chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT ?')
      .bind(userId, limit)
      .all();
    return (results || []) as { role: string; content: string }[];
  }

  // ==========================================
  // 8. Admin Statistics
  // ==========================================

  async getAdminStats(): Promise<any> {
    const totalUsersRow: any = await this.db.prepare('SELECT COUNT(*) as cnt FROM users').first();
    const premiumUsersRow: any = await this.db.prepare('SELECT COUNT(*) as cnt FROM users WHERE is_premium = 1').first();
    const pendingPaymentsRow: any = await this.db.prepare('SELECT COUNT(*) as cnt FROM payments WHERE status = "pending"').first();
    const approvedPaymentsRow: any = await this.db.prepare('SELECT COUNT(*) as cnt, SUM(amount) as total FROM payments WHERE status = "approved"').first();
    const aiUsageRow: any = await this.db.prepare('SELECT COUNT(*) as cnt FROM ai_usage').first();

    return {
      totalUsers: totalUsersRow?.cnt || 0,
      premiumUsers: premiumUsersRow?.cnt || 0,
      pendingPayments: pendingPaymentsRow?.cnt || 0,
      approvedPayments: approvedPaymentsRow?.cnt || 0,
      totalRevenue: approvedPaymentsRow?.total || 0,
      aiRequestsCount: aiUsageRow?.cnt || 0,
      serverTime: new Date().toISOString(),
    };
  }
}
