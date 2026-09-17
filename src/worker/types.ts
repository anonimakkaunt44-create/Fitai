/**
 * Cloudflare Worker Environment and Database Types for FitAI
 */

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  all<T = any>(): Promise<{ results?: T[]; success: boolean; error?: string }>;
  run<T = any>(): Promise<{ success: boolean; error?: string; meta?: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<{ results?: T[]; success: boolean }[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface R2HttpMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
}

export interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2Bucket {
  put(key: string, value: any, options?: R2PutOptions): Promise<any>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
}

export interface Fetcher {
  fetch(request: Request | string, init?: any): Promise<Response>;
}

export interface Env {
  // Cloudflare D1 Database Binding
  DB: D1Database;

  // Cloudflare R2 Storage Binding
  BUCKET: R2Bucket;

  // Cloudflare Workers Static Assets Binding (for serving Vite React build)
  ASSETS?: Fetcher;

  // Environment Secrets
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_ADMIN_CHAT_ID?: string;
  ADMIN_USERNAMES?: string;
  GEMINI_API_KEY?: string;
  JWT_SECRET?: string;
  ADMIN_SECRET_KEY?: string;
  INITIAL_ADMIN_PASSWORD?: string;
  APP_URL?: string;
  APP_NAME?: string;
}

export interface UserProfile {
  weight?: number;
  targetWeight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  waist?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';
  goal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'toning';
  workoutsPerWeek?: number;
  workoutLocation?: 'home' | 'gym' | 'outdoors';
  equipment?: string[];
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  workoutTimeMinutes?: number;
  mealsPerDay?: number;
  dietaryPreferences?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  weeklyBudget?: 'budget' | 'moderate' | 'premium';
  waterGoalMl?: number;
  stepsGoal?: number;
  sleepHours?: number;
  notificationsEnabled?: boolean;
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
  premiumUntil?: string;
  isAdmin?: boolean;
  onboardingCompleted: boolean;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
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
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSettings {
  id?: string;
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  instructions: string;
  instructionsUz?: string;
  instructionsEn?: string;
  price1Month: number;
  price3Months: number;
  price1Year: number;
  currency: string;
  updatedAt: string;
}

export interface DailyActivity {
  id: string;
  userId: string;
  date: string;
  waterMl: number;
  waterGoalMl: number;
  steps: number;
  stepsGoal: number;
  streakCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFileMeta {
  id: string;
  r2Key: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: 'receipt' | 'food_photo' | 'avatar' | 'progress_photo';
  isPublic: boolean;
  createdAt: string;
}
