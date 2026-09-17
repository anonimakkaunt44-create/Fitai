-- ====================================================================
-- FitAI Database Schema for Cloudflare D1 (SQLite on Edge)
-- Migration 0001: Initial Schema
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  username TEXT,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'ru',
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_until TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_telegram_id ON subscriptions(telegram_id);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  receipt_url TEXT,
  receipt_r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by TEXT,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 4. Payment Settings Table
CREATE TABLE IF NOT EXISTS payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  instructions_uz TEXT,
  instructions_en TEXT,
  price_1_month REAL NOT NULL DEFAULT 99000,
  price_3_months REAL NOT NULL DEFAULT 249000,
  price_1_year REAL NOT NULL DEFAULT 699000,
  currency TEXT NOT NULL DEFAULT 'UZS',
  updated_at TEXT NOT NULL
);

-- 5. Food Analysis Table
CREATE TABLE IF NOT EXISTS food_analysis (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_r2_key TEXT,
  dish_name TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  health_score REAL,
  recommendations_json TEXT,
  raw_analysis_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_food_analysis_user_id ON food_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_food_analysis_created_at ON food_analysis(created_at);

-- 6. Food Diary Table
CREATE TABLE IF NOT EXISTS food_diary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  title TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  photo_r2_key TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_food_diary_user_date ON food_diary(user_id, date);

-- 7. Workouts Table
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  exercises_json TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);

-- 8. Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  target_calories INTEGER NOT NULL,
  days_json TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);

-- 9. Progress Logs Table
CREATE TABLE IF NOT EXISTS progress_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  waist REAL,
  chest REAL,
  hips REAL,
  photo_front_r2_key TEXT,
  photo_side_r2_key TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_logs_user_date ON progress_logs(user_id, date);

-- 10. Daily Activity Table (Water, Steps, Streak)
CREATE TABLE IF NOT EXISTS daily_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  water_ml INTEGER NOT NULL DEFAULT 0,
  water_goal_ml INTEGER NOT NULL DEFAULT 2500,
  steps INTEGER NOT NULL DEFAULT 0,
  steps_goal INTEGER NOT NULL DEFAULT 10000,
  streak_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, date);

-- 11. AI Chat History Table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_history(user_id);

-- 12. AI Usage & Rate Limiting Table
CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, created_at);

-- 13. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 14. Telegram Updates (Deduplication & Idempotency)
CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  processed_at TEXT NOT NULL
);

-- 15. Telegram Dialog States
CREATE TABLE IF NOT EXISTS telegram_dialog_states (
  telegram_id TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  state_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

-- 16. Mom Features Table
CREATE TABLE IF NOT EXISTS mom_features (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mom_features_user ON mom_features(user_id, category);

-- 17. User Files Metadata Table (Cloudflare R2 Integration)
CREATE TABLE IF NOT EXISTS user_files (
  id TEXT PRIMARY KEY,
  r2_key TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  purpose TEXT NOT NULL, -- receipt, food_photo, avatar, progress_photo
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_files_user ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_r2_key ON user_files(r2_key);

-- 18. Default Payment Settings Seed
INSERT OR IGNORE INTO payment_settings (
  id, card_number, card_holder, bank_name,
  instructions, instructions_uz, instructions_en,
  price_1_month, price_3_months, price_1_year, currency, updated_at
) VALUES (
  'default',
  '8600 4912 3456 7890',
  'FITAI PAYMENTS / ALISHER U.',
  'Kapitalbank / Uzcard / Humo / Visa',
  '1. Переведите указанную сумму на карту.
2. Сделайте скриншот чека об оплате.
3. Прикрепите скриншот ниже и нажмите «Я оплатил».
4. Доступ к Premium будет активирован сразу после подтверждения администратором!',
  '1. Ko‘rsatilgan summani kartaga o‘tkazing.
2. To‘lov chekining skrinshotini oling.
3. Chekni yuklang va «Men to‘ladim» tugmasini bosing.
4. Admin tasdiqlashi bilan Premium darhol yoqiladi!',
  '1. Transfer the exact amount to the card details.
2. Take a screenshot of the payment receipt.
3. Attach the screenshot and tap "I Paid".
4. Premium access will be activated immediately upon admin approval!',
  99000,
  249000,
  699000,
  'UZS',
  CURRENT_TIMESTAMP
);
