import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserProfile {
  gender?: 'male' | 'female';
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  targetWeight?: number; // kg
  waist?: number; // cm
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';
  workoutsPerWeek?: number;
  workoutLocation?: 'home' | 'gym' | 'both';
  equipment?: string[];
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  goal?: 'weight_loss' | 'fast_weight_loss' | 'tone' | 'health';
  dietaryPreferences?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  mealsPerDay?: number;
  weeklyBudget?: string;
  sleepHours?: number;
  workoutTimeMinutes?: number;
  notificationsEnabled?: boolean;
  waterGoalMl?: number;
  stepsGoal?: number;
  // Mom Mode profile fields
  isMomMode?: boolean;
  childAge?: string;
  childName?: string;
  familyMembersCount?: number;
  maxWeeklyBudget?: number;
  maxMonthlyBudget?: number;
  momPreferences?: string[];
}

export interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  language: 'ru' | 'uz' | 'en';
  isPremium: boolean;
  premiumUntil?: string; // ISO Date string
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
  profile: UserProfile;
}

export interface Subscription {
  id: string;
  userId: string;
  telegramId: string;
  planId: '1month' | '3months' | '1year';
  status: 'active' | 'expired';
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  telegramId: string;
  username?: string;
  fullName: string;
  planId: '1month' | '3months' | '1year';
  planName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptImage: string; // Base64 or image data URL
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface PaymentSettings {
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  instructions: string;
  instructionsUz: string;
  instructionsEn: string;
  price1Month: number;
  price3Months: number;
  price1Year: number;
  currency: string;
  updatedAt: string;
}

export interface FoodAnalysis {
  id: string;
  userId: string;
  dishName: string;
  portionWeight: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  recommendations: string;
  imageUrl?: string;
  createdAt: string;
}

export interface FoodDiaryEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dishName: string;
  weightGrams: number;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  createdAt: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  duration?: string;
  restSeconds: number;
  technique: string;
  targetMuscles: string;
}

export interface Workout {
  id: string;
  userId: string;
  title: string;
  durationMinutes: number;
  fitnessLevel: string;
  location: string;
  exercises: Exercise[];
  completed: boolean;
  completedAt?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface MealItem {
  dish: string;
  ingredients: string[];
  portionGrams: number;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  recipeInstructions: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snack: MealItem;
  totalCalories: number;
  totalProteins: number;
  totalFats: number;
  totalCarbs: number;
  createdAt: string;
}

export interface ProgressLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  weight: number;
  waist?: number;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface AiUsageLog {
  id: string;
  userId: string;
  feature: string;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'premium_activated' | 'payment_rejected' | 'water_reminder' | 'workout_reminder' | 'broadcast' | 'info';
  isRead: boolean;
  createdAt: string;
}

export interface AiChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  estimatedPrice: number;
  category: string;
  checked: boolean;
}

export interface ShoppingList {
  id: string;
  userId: string;
  title: string;
  weeklyBudget: number;
  estimatedTotal: number;
  items: ShoppingItem[];
  createdAt: string;
}

export interface DailyActivity {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  waterMl: number;
  waterGoalMl: number;
  steps: number;
  stepsGoal: number;
  streakCount: number;
}

export interface MomDinnerIdea {
  id: string;
  userId: string;
  title: string;
  prepTime: string;
  calories: number;
  portionGrams: number;
  proteins: number;
  fats: number;
  carbs: number;
  ingredients: string[];
  steps: string[];
  budgetNote?: string;
  forMomTip?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface MomChildActivity {
  id: string;
  userId: string;
  title: string;
  ageGroup: string;
  durationMinutes: number;
  location: 'home' | 'outdoor';
  category: 'movement' | 'development' | 'calm';
  instructions: string[];
  materialsNeeded: string[];
  benefits: string;
  safetyNote: string;
  completed: boolean;
  createdAt: string;
}

export interface MomFamilyMenu {
  id: string;
  userId: string;
  title: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'all_day';
  momDish: {
    name: string;
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
    portionGrams: number;
    customTips: string;
  };
  familyDish: {
    name: string;
    standardPortionGrams: number;
    familyServings: number;
    servingTips: string;
  };
  sharedIngredients: string[];
  onePotInstructions: string[];
  createdAt: string;
}

export interface MomShoppingList {
  id: string;
  userId: string;
  title: string;
  familyMembersCount: number;
  weeklyBudget: number;
  estimatedTotal: number;
  currency: string;
  items: ShoppingItem[];
  createdAt: string;
}

export interface MomBudgetPlan {
  id: string;
  userId: string;
  weeklyBudget: number;
  monthlyBudget: number;
  estimatedWeeklyExpenses: number;
  estimatedMonthlyExpenses: number;
  currency: string;
  savingsRecommendations: string[];
  optimizedItems: Array<{ original: string; replacement: string; savings: string }>;
  updatedAt: string;
}

export interface MomQuickRecipe {
  id: string;
  userId: string;
  title: string;
  timeMinutes: 10 | 15 | 20 | 30;
  mealType: string;
  calories: number;
  ingredientsCount: number;
  ingredients: string[];
  steps: string[];
  isFavorite?: boolean;
  createdAt: string;
}

export interface MomFoodPhoto {
  id: string;
  userId: string;
  dishName: string;
  portionSize: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  detectedIngredients: string[];
  goalAdaptationTips: string;
  disclaimer: string;
  imageUrl?: string;
  createdAt: string;
}

export interface MomDayPlan {
  id: string;
  userId: string;
  date: string;
  breakfast: any;
  lunch: any;
  dinner: any;
  snack: any;
  childActivity: any;
  shoppingChecklist: Array<{ id: string; text: string; done: boolean }>;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  subscriptions: Subscription[];
  payments: Payment[];
  paymentSettings: PaymentSettings;
  foodAnalysis: FoodAnalysis[];
  foodDiary: FoodDiaryEntry[];
  workouts: Workout[];
  mealPlans: MealPlan[];
  progress: ProgressLog[];
  aiUsage: AiUsageLog[];
  adminUsers: AdminUser[];
  notifications: NotificationItem[];
  aiChatHistory: AiChatMessage[];
  shoppingLists: ShoppingList[];
  dailyActivity: DailyActivity[];
  momDinnerIdeas: MomDinnerIdea[];
  momChildActivities: MomChildActivity[];
  momFamilyMenus: MomFamilyMenu[];
  momShoppingLists: MomShoppingList[];
  momBudgetPlans: MomBudgetPlan[];
  momQuickRecipes: MomQuickRecipe[];
  momFoodPhotos: MomFoodPhoto[];
  momDayPlans: MomDayPlan[];
  aiSettings: {
    enabled: boolean;
    provider: string;
    model: string;
    rateLimitPerUserPerDay: number;
    totalRequests: number;
    totalErrors: number;
  };
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'fitai_database.json');
const DB_BACKUP_FILE = path.join(DB_DIR, 'fitai_database.backup.json');
const PAYMENT_SETTINGS_FILE = path.join(DB_DIR, 'payment_settings.json');
const PAYMENTS_LOG_FILE = path.join(DB_DIR, 'payments_log.json');

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cardNumber: '8600 4912 3456 7890',
  cardHolder: 'FITAI PAYMENTS / ALISHER U.',
  bankName: 'Kapitalbank / Uzcard / Humo / Visa',
  instructions: '1. Переведите указанную сумму на карту.\n2. Сделайте скриншот чека об оплате.\n3. Прикрепите скриншот ниже и нажмите «Я оплатил».\n4. Доступ к Premium будет активирован сразу после подтверждения администратором!',
  instructionsUz: '1. Ko‘rsatilgan summani kartaga o‘tkazing.\n2. To‘lov chekining skrinshotini oling.\n3. Chekni yuklang va «Men to‘ladim» tugmasini bosing.\n4. Admin tasdiqlashi bilan Premium darhol yoqiladi!',
  instructionsEn: '1. Transfer the exact amount to the card details.\n2. Take a screenshot of the payment receipt.\n3. Attach the screenshot and tap "I Paid".\n4. Premium access will be activated immediately upon admin approval!',
  price1Month: 99000,
  price3Months: 249000,
  price1Year: 699000,
  currency: 'UZS',
  updatedAt: new Date().toISOString(),
};

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
    this.initAdmin();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      let fileContent = '';
      if (fs.existsSync(DB_FILE)) {
        fileContent = fs.readFileSync(DB_FILE, 'utf-8');
      } else if (fs.existsSync(DB_BACKUP_FILE)) {
        console.log('Main database file missing, recovering from backup...');
        fileContent = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
      }

      if (fileContent && fileContent.trim()) {
        const parsed = JSON.parse(fileContent);

        // Load standalone payment settings file if present
        let standaloneSettings: Partial<PaymentSettings> = {};
        try {
          if (fs.existsSync(PAYMENT_SETTINGS_FILE)) {
            const rawSettings = fs.readFileSync(PAYMENT_SETTINGS_FILE, 'utf-8');
            if (rawSettings && rawSettings.trim()) {
              standaloneSettings = JSON.parse(rawSettings);
            }
          }
        } catch {}

        // Load standalone payments log file if present
        let standalonePayments: Payment[] = [];
        try {
          if (fs.existsSync(PAYMENTS_LOG_FILE)) {
            const rawPayments = fs.readFileSync(PAYMENTS_LOG_FILE, 'utf-8');
            if (rawPayments && rawPayments.trim()) {
              standalonePayments = JSON.parse(rawPayments);
            }
          }
        } catch {}

        // Combine payments without duplicates
        const allPaymentsMap = new Map<string, Payment>();
        (parsed.payments || []).forEach((p: Payment) => {
          if (p && p.id) allPaymentsMap.set(p.id, p);
        });
        standalonePayments.forEach((p: Payment) => {
          if (p && p.id) allPaymentsMap.set(p.id, p);
        });

        // Ensure paymentSettings never has empty card details and honors standalone config
        const loadedPaymentSettings = {
          ...(parsed.paymentSettings || {}),
          ...standaloneSettings,
        };
        const safePaymentSettings: PaymentSettings = {
          cardNumber: (loadedPaymentSettings.cardNumber && loadedPaymentSettings.cardNumber.trim()) || DEFAULT_PAYMENT_SETTINGS.cardNumber,
          cardHolder: (loadedPaymentSettings.cardHolder && loadedPaymentSettings.cardHolder.trim()) || DEFAULT_PAYMENT_SETTINGS.cardHolder,
          bankName: (loadedPaymentSettings.bankName && loadedPaymentSettings.bankName.trim()) || DEFAULT_PAYMENT_SETTINGS.bankName,
          instructions: loadedPaymentSettings.instructions || DEFAULT_PAYMENT_SETTINGS.instructions,
          instructionsUz: loadedPaymentSettings.instructionsUz || DEFAULT_PAYMENT_SETTINGS.instructionsUz,
          instructionsEn: loadedPaymentSettings.instructionsEn || DEFAULT_PAYMENT_SETTINGS.instructionsEn,
          price1Month: loadedPaymentSettings.price1Month || DEFAULT_PAYMENT_SETTINGS.price1Month,
          price3Months: loadedPaymentSettings.price3Months || DEFAULT_PAYMENT_SETTINGS.price3Months,
          price1Year: loadedPaymentSettings.price1Year || DEFAULT_PAYMENT_SETTINGS.price1Year,
          currency: loadedPaymentSettings.currency || DEFAULT_PAYMENT_SETTINGS.currency,
          updatedAt: loadedPaymentSettings.updatedAt || new Date().toISOString(),
        };

        return {
          users: parsed.users || [],
          subscriptions: parsed.subscriptions || [],
          payments: Array.from(allPaymentsMap.values()),
          paymentSettings: safePaymentSettings,
          foodAnalysis: parsed.foodAnalysis || [],
          foodDiary: parsed.foodDiary || [],
          workouts: parsed.workouts || [],
          mealPlans: parsed.mealPlans || [],
          progress: parsed.progress || [],
          aiUsage: parsed.aiUsage || [],
          adminUsers: parsed.adminUsers || [],
          notifications: parsed.notifications || [],
          aiChatHistory: parsed.aiChatHistory || [],
          shoppingLists: parsed.shoppingLists || [],
          dailyActivity: parsed.dailyActivity || [],
          momDinnerIdeas: parsed.momDinnerIdeas || [],
          momChildActivities: parsed.momChildActivities || [],
          momFamilyMenus: parsed.momFamilyMenus || [],
          momShoppingLists: parsed.momShoppingLists || [],
          momBudgetPlans: parsed.momBudgetPlans || [],
          momQuickRecipes: parsed.momQuickRecipes || [],
          momFoodPhotos: parsed.momFoodPhotos || [],
          momDayPlans: parsed.momDayPlans || [],
          aiSettings: parsed.aiSettings || {
            enabled: true,
            provider: 'Google Gemini',
            model: 'gemini-3.8-flash',
            rateLimitPerUserPerDay: 50,
            totalRequests: 0,
            totalErrors: 0,
          },
        };
      }
    } catch (err) {
      console.error('Error loading database file, attempting backup recovery:', err);
      try {
        if (fs.existsSync(DB_BACKUP_FILE)) {
          const backupContent = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
          if (backupContent && backupContent.trim()) {
            return JSON.parse(backupContent);
          }
        }
      } catch (backupErr) {
        console.error('Backup recovery also failed:', backupErr);
      }
    }

    return {
      users: [],
      subscriptions: [],
      payments: [],
      paymentSettings: DEFAULT_PAYMENT_SETTINGS,
      foodAnalysis: [],
      foodDiary: [],
      workouts: [],
      mealPlans: [],
      progress: [],
      aiUsage: [],
      adminUsers: [],
      notifications: [],
      aiChatHistory: [],
      shoppingLists: [],
      dailyActivity: [],
      momDinnerIdeas: [],
      momChildActivities: [],
      momFamilyMenus: [],
      momShoppingLists: [],
      momBudgetPlans: [],
      momQuickRecipes: [],
      momFoodPhotos: [],
      momDayPlans: [],
      aiSettings: {
        enabled: true,
        provider: 'Google Gemini',
        model: 'gemini-3.8-flash',
        rateLimitPerUserPerDay: 50,
        totalRequests: 0,
        totalErrors: 0,
      },
    };
  }

  private initAdmin() {
    if (this.data.adminUsers.length === 0) {
      const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
      const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin_fitai_secure_2025';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPass, salt);
      this.data.adminUsers.push({
        id: 'admin_primary',
        username: defaultUser,
        passwordHash: hash,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.saveSync();
    }
  }

  public saveSync() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const serialized = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(DB_FILE, serialized, 'utf-8');
      // Always maintain an active safety backup file
      fs.writeFileSync(DB_BACKUP_FILE, serialized, 'utf-8');
    } catch (err) {
      console.error('Failed to write database file synchronously:', err);
    }
  }

  public save() {
    // Save immediately so no state or payment is ever lost on sudden exit
    this.saveSync();
  }

  // --- Users ---
  public findUserByTelegramId(telegramId: string | number): User | undefined {
    if (!telegramId) return undefined;
    const tid = String(telegramId).trim();
    return this.data.users.find((u) => String(u.telegramId).trim() === tid);
  }

  public findUserByUsername(username: string): User | undefined {
    if (!username) return undefined;
    const clean = username.toLowerCase().replace(/^@/, '').trim();
    if (!clean) return undefined;
    return this.data.users.find((u) => u.username && u.username.toLowerCase().replace(/^@/, '').trim() === clean);
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getAllUsers(): User[] {
    return this.data.users;
  }

  public createOrUpdateUser(userData: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    language?: 'ru' | 'uz' | 'en';
    phone?: string;
    onboardingCompleted?: boolean;
  }): User {
    let existing = this.findUserByTelegramId(userData.telegramId);
    if (!existing && userData.username) {
      existing = this.findUserByUsername(userData.username);
    }
    const now = new Date().toISOString();

    if (existing) {
      existing.firstName = userData.firstName || existing.firstName;
      if (userData.lastName) existing.lastName = userData.lastName;
      if (userData.username) existing.username = userData.username;
      if (userData.language) existing.language = userData.language;
      if (userData.phone) existing.phone = userData.phone;
      if (userData.onboardingCompleted !== undefined) {
        existing.onboardingCompleted = existing.onboardingCompleted || userData.onboardingCompleted;
      }
      existing.updatedAt = now;

      // Check premium expiry automatically only if premiumUntil is defined and in the past
      if (existing.isPremium && existing.premiumUntil) {
        if (new Date(existing.premiumUntil).getTime() < Date.now()) {
          existing.isPremium = false;
        }
      }

      this.saveSync();
      return existing;
    }

    const isDemo = String(userData.telegramId) === '998901234567';
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11) + Date.now(),
      telegramId: String(userData.telegramId),
      firstName: userData.firstName || 'FitAI User',
      lastName: userData.lastName,
      username: userData.username,
      phone: userData.phone,
      language: userData.language || 'ru',
      isPremium: false,
      createdAt: now,
      updatedAt: now,
      onboardingCompleted: userData.onboardingCompleted ?? isDemo,
      profile: {
        weight: 78,
        targetWeight: 68,
        height: 175,
        age: 28,
        gender: 'male',
        activityLevel: 'moderate',
        workoutsPerWeek: 3,
        waterGoalMl: 2500,
        stepsGoal: 10000,
        notificationsEnabled: true,
      },
    };

    this.data.users.push(newUser);
    this.saveSync();
    return newUser;
  }

  public updateUserProfile(userId: string, profile: Partial<UserProfile>): User | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    user.profile = { ...user.profile, ...profile };
    user.onboardingCompleted = true;
    user.updatedAt = new Date().toISOString();
    this.save();
    return user;
  }

  public setUserPremium(
    userId: string,
    isPremium: boolean,
    premiumUntilDate?: string
  ): User | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    user.isPremium = isPremium;
    user.premiumUntil = premiumUntilDate;
    user.updatedAt = new Date().toISOString();

    if (isPremium && premiumUntilDate) {
      this.data.subscriptions.push({
        id: 'sub_' + Date.now() + Math.random().toString(36).substring(2, 7),
        userId: user.id,
        telegramId: user.telegramId,
        planId: '1month',
        status: 'active',
        startsAt: new Date().toISOString(),
        expiresAt: premiumUntilDate,
        createdAt: new Date().toISOString(),
      });
    }

    this.save();
    return user;
  }

  public setUserLanguage(userId: string, language: 'ru' | 'uz' | 'en'): User | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.language = language;
    user.updatedAt = new Date().toISOString();
    this.save();
    return user;
  }

  public deleteUser(userId: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== userId);
    this.data.foodDiary = this.data.foodDiary.filter((d) => d.userId !== userId);
    this.data.workouts = this.data.workouts.filter((w) => w.userId !== userId);
    this.data.mealPlans = this.data.mealPlans.filter((m) => m.userId !== userId);
    this.data.progress = this.data.progress.filter((p) => p.userId !== userId);
    this.data.aiChatHistory = this.data.aiChatHistory.filter((c) => c.userId !== userId);
    this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);
    this.save();
    return this.data.users.length < initialLen;
  }

  // --- Payments & Settings ---
  public getPaymentSettings(): PaymentSettings {
    return this.data.paymentSettings;
  }

  public updatePaymentSettings(settings: Partial<PaymentSettings>): PaymentSettings {
    const current = this.data.paymentSettings || DEFAULT_PAYMENT_SETTINGS;
    this.data.paymentSettings = {
      cardNumber: (settings.cardNumber && settings.cardNumber.trim()) || current.cardNumber || DEFAULT_PAYMENT_SETTINGS.cardNumber,
      cardHolder: (settings.cardHolder && settings.cardHolder.trim()) || current.cardHolder || DEFAULT_PAYMENT_SETTINGS.cardHolder,
      bankName: (settings.bankName && settings.bankName.trim()) || current.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
      instructions: settings.instructions !== undefined && settings.instructions.trim() ? settings.instructions : current.instructions,
      instructionsUz: settings.instructionsUz !== undefined && settings.instructionsUz.trim() ? settings.instructionsUz : current.instructionsUz,
      instructionsEn: settings.instructionsEn !== undefined && settings.instructionsEn.trim() ? settings.instructionsEn : current.instructionsEn,
      price1Month: settings.price1Month || current.price1Month,
      price3Months: settings.price3Months || current.price3Months,
      price1Year: settings.price1Year || current.price1Year,
      currency: (settings.currency && settings.currency.trim()) || current.currency || 'UZS',
      updatedAt: new Date().toISOString(),
    };
    this.saveSync();
    try {
      fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(this.data.paymentSettings, null, 2), 'utf-8');
    } catch {}
    return this.data.paymentSettings;
  }

  public createPayment(paymentData: {
    userId: string;
    telegramId: string;
    username?: string;
    fullName: string;
    planId: '1month' | '3months' | '1year';
    planName: string;
    amount: number;
    currency: string;
    receiptImage: string;
  }): Payment {
    const newPayment: Payment = {
      id: 'pay_' + Date.now() + Math.random().toString(36).substring(2, 6),
      ...paymentData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.data.payments.unshift(newPayment);
    this.saveSync();
    try {
      fs.writeFileSync(PAYMENTS_LOG_FILE, JSON.stringify(this.data.payments, null, 2), 'utf-8');
    } catch {}
    return newPayment;
  }

  public syncClientPayments(payments: Payment[]): void {
    if (!Array.isArray(payments) || payments.length === 0) return;
    let added = false;
    for (const p of payments) {
      if (!p || !p.id) continue;
      const existing = this.data.payments.find((ep) => ep.id === p.id);
      if (!existing) {
        this.data.payments.unshift(p);
        added = true;
      }
    }
    if (added) {
      this.saveSync();
      try {
        fs.writeFileSync(PAYMENTS_LOG_FILE, JSON.stringify(this.data.payments, null, 2), 'utf-8');
      } catch {}
    }
  }

  public syncUserClientState(telegramId: string, state: {
    isPremium?: boolean;
    premiumUntil?: string;
    onboardingCompleted?: boolean;
    profile?: Partial<UserProfile>;
  }): User | null {
    const user = this.findUserByTelegramId(telegramId);
    if (!user) return null;
    let changed = false;
    if (state.isPremium) {
      user.isPremium = true;
      if (state.premiumUntil && (!user.premiumUntil || new Date(state.premiumUntil) > new Date(user.premiumUntil))) {
        user.premiumUntil = state.premiumUntil;
      }
      changed = true;
    }
    if (state.onboardingCompleted && !user.onboardingCompleted) {
      user.onboardingCompleted = true;
      changed = true;
    }
    if (state.profile) {
      user.profile = { ...(user.profile || {}), ...state.profile };
      changed = true;
    }
    if (changed) {
      user.updatedAt = new Date().toISOString();
      this.saveSync();
    }
    return user;
  }

  public getPayments(): Payment[] {
    return this.data.payments;
  }

  public findPaymentById(paymentId: string): Payment | undefined {
    return this.data.payments.find((p) => p.id === paymentId);
  }

  public reviewPayment(
    paymentId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string = 'admin',
    reason?: string
  ): { payment: Payment; user?: User } | null {
    const payment = this.findPaymentById(paymentId);
    if (!payment) return null;

    payment.status = status;
    payment.reviewedAt = new Date().toISOString();
    payment.reviewedBy = reviewedBy;
    if (reason) payment.rejectionReason = reason;

    let user = this.findUserById(payment.userId);
    if (!user) {
      user = this.findUserByTelegramId(payment.telegramId);
    }

    if (status === 'approved' && user) {
      let days = 30;
      if (payment.planId === '3months') days = 90;
      if (payment.planId === '1year') days = 365;

      const currentUntil = user.premiumUntil && new Date(user.premiumUntil) > new Date()
        ? new Date(user.premiumUntil)
        : new Date();
      currentUntil.setDate(currentUntil.getDate() + days);

      user.isPremium = true;
      user.premiumUntil = currentUntil.toISOString();
      user.updatedAt = new Date().toISOString();

      this.data.subscriptions.push({
        id: 'sub_' + Date.now(),
        userId: user.id,
        telegramId: user.telegramId,
        planId: payment.planId,
        status: 'active',
        startsAt: new Date().toISOString(),
        expiresAt: user.premiumUntil,
        createdAt: new Date().toISOString(),
      });

      this.data.notifications.unshift({
        id: 'notif_' + Date.now(),
        userId: user.id,
        title: 'Premium активирован!',
        message: `Ваш тариф «${payment.planName}» успешно активирован до ${new Date(user.premiumUntil).toLocaleDateString()}!`,
        type: 'premium_activated',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } else if (status === 'rejected' && user) {
      this.data.notifications.unshift({
        id: 'notif_' + Date.now(),
        userId: user.id,
        title: 'Платеж отклонен',
        message: `Ваш чек по тарифу «${payment.planName}» был отклонен администратором. Причина: ${reason || 'Не удалось подтвердить перевод по чеку.'}`,
        type: 'payment_rejected',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.saveSync();
    try {
      fs.writeFileSync(PAYMENTS_LOG_FILE, JSON.stringify(this.data.payments, null, 2), 'utf-8');
    } catch {}
    return { payment, user };
  }

  // --- Daily Activity & Water Tracker ---
  public getTodayActivity(userId: string): DailyActivity {
    const today = new Date().toISOString().split('T')[0];
    let entry = this.data.dailyActivity.find((d) => d.userId === userId && d.date === today);
    if (!entry) {
      const user = this.findUserById(userId);
      entry = {
        id: 'act_' + Date.now(),
        userId,
        date: today,
        waterMl: 0,
        waterGoalMl: user?.profile?.waterGoalMl || 2500,
        steps: 0,
        stepsGoal: user?.profile?.stepsGoal || 10000,
        streakCount: 3, // Default motivational streak
      };
      this.data.dailyActivity.push(entry);
      this.save();
    }
    return entry;
  }

  public addWater(userId: string, amountMl: number): DailyActivity {
    const act = this.getTodayActivity(userId);
    act.waterMl = Math.max(0, act.waterMl + amountMl);
    this.save();
    return act;
  }

  public updateSteps(userId: string, steps: number): DailyActivity {
    const act = this.getTodayActivity(userId);
    act.steps = Math.max(0, steps);
    this.save();
    return act;
  }

  // --- Food Diary ---
  public getFoodDiary(userId: string, date?: string): FoodDiaryEntry[] {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.data.foodDiary.filter((d) => d.userId === userId && d.date === targetDate);
  }

  public addFoodDiaryEntry(entry: Omit<FoodDiaryEntry, 'id' | 'createdAt'>): FoodDiaryEntry {
    const newEntry: FoodDiaryEntry = {
      id: 'food_' + Date.now() + Math.random().toString(36).substring(2, 6),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.data.foodDiary.unshift(newEntry);
    this.save();
    return newEntry;
  }

  public deleteFoodDiaryEntry(entryId: string, userId: string): boolean {
    const initialLen = this.data.foodDiary.length;
    this.data.foodDiary = this.data.foodDiary.filter((d) => !(d.id === entryId && d.userId === userId));
    this.save();
    return this.data.foodDiary.length < initialLen;
  }

  // --- Food Analysis Log ---
  public logFoodAnalysis(analysis: Omit<FoodAnalysis, 'id' | 'createdAt'>): FoodAnalysis {
    const item: FoodAnalysis = {
      id: 'fa_' + Date.now(),
      ...analysis,
      createdAt: new Date().toISOString(),
    };
    this.data.foodAnalysis.unshift(item);
    this.save();
    return item;
  }

  public getFoodAnalysisHistory(userId: string): FoodAnalysis[] {
    return this.data.foodAnalysis.filter((fa) => fa.userId === userId);
  }

  // --- Workouts ---
  public getWorkouts(userId: string): Workout[] {
    return this.data.workouts.filter((w) => w.userId === userId);
  }

  public saveWorkout(workout: Omit<Workout, 'id' | 'createdAt'>): Workout {
    const newWorkout: Workout = {
      id: 'wko_' + Date.now() + Math.random().toString(36).substring(2, 6),
      ...workout,
      createdAt: new Date().toISOString(),
    };
    this.data.workouts.unshift(newWorkout);
    this.save();
    return newWorkout;
  }

  public toggleWorkoutCompleted(workoutId: string, userId: string): Workout | null {
    const w = this.data.workouts.find((item) => item.id === workoutId && item.userId === userId);
    if (!w) return null;
    w.completed = !w.completed;
    w.completedAt = w.completed ? new Date().toISOString() : undefined;
    this.save();
    return w;
  }

  // --- Meal Plans ---
  public getMealPlans(userId: string): MealPlan[] {
    return this.data.mealPlans.filter((m) => m.userId === userId);
  }

  public saveMealPlan(plan: Omit<MealPlan, 'id' | 'createdAt'>): MealPlan {
    const newPlan: MealPlan = {
      id: 'mp_' + Date.now(),
      ...plan,
      createdAt: new Date().toISOString(),
    };
    this.data.mealPlans.unshift(newPlan);
    this.save();
    return newPlan;
  }

  // --- Progress Tracker ---
  public getProgressLogs(userId: string): ProgressLog[] {
    return this.data.progress
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  public addProgressLog(log: Omit<ProgressLog, 'id' | 'createdAt'>): ProgressLog {
    const newLog: ProgressLog = {
      id: 'prog_' + Date.now(),
      ...log,
      createdAt: new Date().toISOString(),
    };
    this.data.progress.push(newLog);

    // Also update current weight & waist in user profile
    const user = this.findUserById(log.userId);
    if (user) {
      user.profile.weight = log.weight;
      if (log.waist) user.profile.waist = log.waist;
      this.save();
    }

    this.save();
    return newLog;
  }

  // --- AI Chat History ---
  public getAiChatHistory(userId: string): AiChatMessage[] {
    return this.data.aiChatHistory
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addAiChatMessage(userId: string, role: 'user' | 'assistant', content: string): AiChatMessage {
    const msg: AiChatMessage = {
      id: 'chat_' + Date.now() + Math.random().toString(36).substring(2, 5),
      userId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    this.data.aiChatHistory.push(msg);
    this.save();
    return msg;
  }

  public clearAiChatHistory(userId: string): void {
    this.data.aiChatHistory = this.data.aiChatHistory.filter((c) => c.userId !== userId);
    this.save();
  }

  // --- Shopping List ---
  public getShoppingLists(userId: string): ShoppingList[] {
    return this.data.shoppingLists.filter((s) => s.userId === userId);
  }

  public saveShoppingList(list: Omit<ShoppingList, 'id' | 'createdAt'>): ShoppingList {
    const newList: ShoppingList = {
      id: 'shop_' + Date.now(),
      ...list,
      createdAt: new Date().toISOString(),
    };
    this.data.shoppingLists.unshift(newList);
    this.save();
    return newList;
  }

  public toggleShoppingItem(listId: string, itemId: string, userId: string): boolean {
    const list = this.data.shoppingLists.find((s) => s.id === listId && s.userId === userId);
    if (!list) return false;
    const item = list.items.find((i) => i.id === itemId);
    if (!item) return false;
    item.checked = !item.checked;
    this.save();
    return true;
  }

  // --- Notifications ---
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications.filter((n) => n.userId === userId);
  }

  public markNotificationsRead(userId: string): void {
    this.data.notifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
    this.save();
  }

  public createNotification(notif: Omit<NotificationItem, 'id' | 'createdAt'>): NotificationItem {
    const item: NotificationItem = {
      id: 'notif_' + Date.now(),
      ...notif,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.save();
    return item;
  }

  // --- AI Settings & Usage Stats ---
  public logAiUsage(userId: string, feature: string, status: 'success' | 'error', errorMessage?: string): void {
    this.data.aiUsage.unshift({
      id: 'ai_' + Date.now(),
      userId,
      feature,
      status,
      errorMessage,
      createdAt: new Date().toISOString(),
    });
    this.data.aiSettings.totalRequests += 1;
    if (status === 'error') {
      this.data.aiSettings.totalErrors += 1;
    }
    this.save();
  }

  public getAiSettings() {
    return this.data.aiSettings;
  }

  public updateAiSettings(settings: Partial<DatabaseSchema['aiSettings']>) {
    this.data.aiSettings = { ...this.data.aiSettings, ...settings };
    this.save();
    return this.data.aiSettings;
  }

  // --- Admin Users ---
  public findAdminByUsername(username: string): AdminUser | undefined {
    return this.data.adminUsers.find((a) => a.username.toLowerCase() === username.toLowerCase());
  }

  public changeAdminPassword(adminId: string, newPassword: string): boolean {
    const admin = this.data.adminUsers.find((a) => a.id === adminId);
    if (!admin) return false;
    const salt = bcrypt.genSaltSync(10);
    admin.passwordHash = bcrypt.hashSync(newPassword, salt);
    admin.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  // --- Admin Dashboard Aggregates ---
  public getAdminStats() {
    const totalUsers = this.data.users.length;
    const today = new Date().toISOString().split('T')[0];
    const newUsersToday = this.data.users.filter((u) => u.createdAt.startsWith(today)).length;
    
    const activePremium = this.data.users.filter(
      (u) => u.isPremium && u.premiumUntil && new Date(u.premiumUntil) > new Date()
    ).length;

    const expiredPremium = this.data.users.filter(
      (u) => !u.isPremium && u.premiumUntil && new Date(u.premiumUntil) <= new Date()
    ).length;

    const totalPayments = this.data.payments.length;
    const approvedPayments = this.data.payments.filter((p) => p.status === 'approved');
    const totalRevenue = approvedPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const languagesCount = {
      ru: this.data.users.filter((u) => u.language === 'ru').length,
      uz: this.data.users.filter((u) => u.language === 'uz').length,
      en: this.data.users.filter((u) => u.language === 'en').length,
    };

    return {
      totalUsers,
      newUsersToday,
      activePremium,
      expiredPremium,
      totalPayments,
      approvedPaymentsCount: approvedPayments.length,
      pendingPaymentsCount: this.data.payments.filter((p) => p.status === 'pending').length,
      totalRevenue,
      totalAiRequests: this.data.aiSettings.totalRequests,
      totalAiErrors: this.data.aiSettings.totalErrors,
      languagesCount,
    };
  }

  // ==========================================
  // --- MOM MODULE REPOSITORY METHODS ---
  // ==========================================

  public updateMomProfile(userId: string, momProfile: Partial<UserProfile>): User | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.profile = {
      ...user.profile,
      ...momProfile,
    };
    user.updatedAt = new Date().toISOString();
    this.save();
    return user;
  }

  // 1. Dinner Ideas
  public addMomDinnerIdeas(userId: string, ideas: any[]): MomDinnerIdea[] {
    const newIdeas: MomDinnerIdea[] = ideas.map((idea) => ({
      id: 'dinner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      title: idea.title || 'Семейный ужин',
      prepTime: idea.prepTime || '20 мин',
      calories: Number(idea.calories) || 380,
      portionGrams: Number(idea.portionGrams) || 300,
      proteins: Number(idea.proteins) || 30,
      fats: Number(idea.fats) || 10,
      carbs: Number(idea.carbs) || 35,
      ingredients: Array.isArray(idea.ingredients) ? idea.ingredients : [],
      steps: Array.isArray(idea.steps) ? idea.steps : [],
      budgetNote: idea.budgetNote || '',
      forMomTip: idea.forMomTip || '',
      photoUrl: idea.photoUrl || '',
      createdAt: new Date().toISOString(),
    }));

    this.data.momDinnerIdeas = [...newIdeas, ...this.data.momDinnerIdeas];
    this.save();
    return newIdeas;
  }

  public getMomDinnerIdeas(userId: string): MomDinnerIdea[] {
    return this.data.momDinnerIdeas
      .filter((i) => i.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 2. Child Activities
  public addMomChildActivities(userId: string, activities: any[]): MomChildActivity[] {
    const newActs: MomChildActivity[] = activities.map((act) => ({
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      title: act.title || 'Развивающая игра',
      ageGroup: act.ageGroup || '3-4 года',
      durationMinutes: Number(act.durationMinutes) || 20,
      location: act.location || 'home',
      category: act.category || 'movement',
      instructions: Array.isArray(act.instructions) ? act.instructions : [],
      materialsNeeded: Array.isArray(act.materialsNeeded) ? act.materialsNeeded : [],
      benefits: act.benefits || 'Развитие координации и моторики',
      safetyNote: act.safetyNote || 'Безопасно для домашних условий под присмотром мамы.',
      completed: false,
      createdAt: new Date().toISOString(),
    }));

    this.data.momChildActivities = [...newActs, ...this.data.momChildActivities];
    this.save();
    return newActs;
  }

  public getMomChildActivities(userId: string): MomChildActivity[] {
    return this.data.momChildActivities
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public toggleMomChildActivity(userId: string, activityId: string): MomChildActivity | null {
    const act = this.data.momChildActivities.find((a) => a.userId === userId && a.id === activityId);
    if (!act) return null;
    act.completed = !act.completed;
    this.save();
    return act;
  }

  // 3. Family Menu
  public saveMomFamilyMenu(userId: string, menuData: any): MomFamilyMenu {
    const menu: MomFamilyMenu = {
      id: 'fmenu_' + Date.now(),
      userId,
      title: menuData.title || 'Семейное блюдо «Одно для всех»',
      mealType: menuData.mealType || 'dinner',
      momDish: menuData.momDish || {
        name: 'Порция мамы',
        calories: 360,
        proteins: 32,
        fats: 9,
        carbs: 28,
        portionGrams: 280,
        customTips: 'Легкий вариант без масла с удвоенной зеленью',
      },
      familyDish: menuData.familyDish || {
        name: 'Порция семьи',
        standardPortionGrams: 420,
        familyServings: 3,
        servingTips: 'С сытной заправкой и гарниром',
      },
      sharedIngredients: Array.isArray(menuData.sharedIngredients) ? menuData.sharedIngredients : [],
      onePotInstructions: Array.isArray(menuData.onePotInstructions) ? menuData.onePotInstructions : [],
      createdAt: new Date().toISOString(),
    };

    this.data.momFamilyMenus.unshift(menu);
    this.save();
    return menu;
  }

  public getMomFamilyMenus(userId: string): MomFamilyMenu[] {
    return this.data.momFamilyMenus
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 4. Shopping List
  public saveMomShoppingList(userId: string, listData: any): MomShoppingList {
    // Remove previous active list for user or append
    this.data.momShoppingLists = this.data.momShoppingLists.filter((l) => l.userId !== userId);
    const list: MomShoppingList = {
      id: 'moms_' + Date.now(),
      userId,
      title: listData.title || 'Семейная закупка на неделю',
      familyMembersCount: Number(listData.familyMembersCount) || 3,
      weeklyBudget: Number(listData.weeklyBudget) || 450000,
      estimatedTotal: Number(listData.estimatedTotal) || 420000,
      currency: listData.currency || 'UZS',
      items: (listData.items || []).map((it: any, idx: number) => ({
        id: it.id || `item_${idx + 1}_${Date.now()}`,
        name: it.name,
        amount: it.amount || '1 шт',
        estimatedPrice: Number(it.estimatedPrice) || 0,
        category: it.category || 'Продукты',
        checked: Boolean(it.checked),
      })),
      createdAt: new Date().toISOString(),
    };

    this.data.momShoppingLists.unshift(list);
    this.save();
    return list;
  }

  public getMomShoppingList(userId: string): MomShoppingList | null {
    return this.data.momShoppingLists.find((l) => l.userId === userId) || null;
  }

  public toggleMomShoppingItem(userId: string, itemId: string): MomShoppingList | null {
    const list = this.data.momShoppingLists.find((l) => l.userId === userId);
    if (!list) return null;
    const item = list.items.find((i) => i.id === itemId);
    if (item) {
      item.checked = !item.checked;
      this.save();
    }
    return list;
  }

  // 5. Budget Plan
  public saveMomBudgetPlan(userId: string, planData: any): MomBudgetPlan {
    this.data.momBudgetPlans = this.data.momBudgetPlans.filter((p) => p.userId !== userId);
    const plan: MomBudgetPlan = {
      id: 'mbudget_' + Date.now(),
      userId,
      weeklyBudget: Number(planData.weeklyBudget) || 450000,
      monthlyBudget: Number(planData.monthlyBudget) || 1800000,
      estimatedWeeklyExpenses: Number(planData.estimatedWeeklyExpenses) || 410000,
      estimatedMonthlyExpenses: Number(planData.estimatedMonthlyExpenses) || 1640000,
      currency: planData.currency || 'UZS',
      savingsRecommendations: Array.isArray(planData.savingsRecommendations) ? planData.savingsRecommendations : [],
      optimizedItems: Array.isArray(planData.optimizedItems) ? planData.optimizedItems : [],
      updatedAt: new Date().toISOString(),
    };

    this.data.momBudgetPlans.unshift(plan);
    this.save();
    return plan;
  }

  public getMomBudgetPlan(userId: string): MomBudgetPlan | null {
    return this.data.momBudgetPlans.find((p) => p.userId === userId) || null;
  }

  // 6. Quick Recipes
  public saveMomQuickRecipes(userId: string, recipes: any[]): MomQuickRecipe[] {
    const newRecipes: MomQuickRecipe[] = recipes.map((r) => ({
      id: 'qrec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      title: r.title,
      timeMinutes: r.timeMinutes || 15,
      mealType: r.mealType || 'ужин',
      calories: Number(r.calories) || 320,
      ingredientsCount: r.ingredients ? r.ingredients.length : 4,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps: Array.isArray(r.steps) ? r.steps : [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
    }));

    this.data.momQuickRecipes = [...newRecipes, ...this.data.momQuickRecipes];
    this.save();
    return newRecipes;
  }

  public getMomQuickRecipes(userId: string, timeFilter?: number): MomQuickRecipe[] {
    let list = this.data.momQuickRecipes.filter((r) => r.userId === userId);
    if (timeFilter) {
      list = list.filter((r) => r.timeMinutes <= timeFilter);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public toggleMomQuickRecipeFavorite(userId: string, recipeId: string): MomQuickRecipe | null {
    const r = this.data.momQuickRecipes.find((item) => item.userId === userId && item.id === recipeId);
    if (!r) return null;
    r.isFavorite = !r.isFavorite;
    this.save();
    return r;
  }

  // 7. Food Photo Analysis
  public saveMomFoodPhoto(userId: string, data: any): MomFoodPhoto {
    const item: MomFoodPhoto = {
      id: 'mphoto_' + Date.now(),
      userId,
      dishName: data.dishName || 'Блюдо',
      portionSize: data.portionSize || '250 г',
      calories: Number(data.calories) || 350,
      proteins: Number(data.proteins) || 20,
      fats: Number(data.fats) || 12,
      carbs: Number(data.carbs) || 30,
      detectedIngredients: Array.isArray(data.detectedIngredients) ? data.detectedIngredients : [],
      goalAdaptationTips: data.goalAdaptationTips || 'Уменьшите соус и добавьте свежих овощей.',
      disclaimer: data.disclaimer || 'Все значения являются приблизительными и служат ориентиром.',
      imageUrl: data.imageUrl || '',
      createdAt: new Date().toISOString(),
    };

    this.data.momFoodPhotos.unshift(item);
    this.save();
    return item;
  }

  public getMomFoodPhotos(userId: string): MomFoodPhoto[] {
    return this.data.momFoodPhotos
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 8. What to Cook Today (save to daily log or return)
  // 9. Mom Day Plan
  public saveMomDayPlan(userId: string, planData: any): MomDayPlan {
    const today = new Date().toISOString().split('T')[0];
    this.data.momDayPlans = this.data.momDayPlans.filter((p) => !(p.userId === userId && p.date === today));
    const dayPlan: MomDayPlan = {
      id: 'mday_' + Date.now(),
      userId,
      date: today,
      breakfast: planData.breakfast,
      lunch: planData.lunch,
      dinner: planData.dinner,
      snack: planData.snack,
      childActivity: planData.childActivity,
      shoppingChecklist: (planData.shoppingChecklist || []).map((it: any, idx: number) => ({
        id: it.id || `chk_${idx}_${Date.now()}`,
        text: it.text || String(it),
        done: Boolean(it.done),
      })),
      createdAt: new Date().toISOString(),
    };

    this.data.momDayPlans.unshift(dayPlan);
    this.save();
    return dayPlan;
  }

  public getMomDayPlanToday(userId: string): MomDayPlan | null {
    const today = new Date().toISOString().split('T')[0];
    return this.data.momDayPlans.find((p) => p.userId === userId && p.date === today) || null;
  }

  public toggleMomDayPlanItem(userId: string, itemId: string): MomDayPlan | null {
    const today = new Date().toISOString().split('T')[0];
    const plan = this.data.momDayPlans.find((p) => p.userId === userId && p.date === today);
    if (!plan) return null;
    const item = plan.shoppingChecklist.find((i) => i.id === itemId);
    if (item) {
      item.done = !item.done;
      this.save();
    }
    return plan;
  }
}

export const db = new Database();
