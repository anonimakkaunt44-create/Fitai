-- ====================================================================
-- FitAI Data Migration from JSON to Cloudflare D1
-- Generated on: 2026-09-17T08:31:38.117Z
-- ====================================================================

-- 1. Users
INSERT OR IGNORE INTO users (id, telegram_id, first_name, last_name, username, phone, language, is_premium, premium_until, is_admin, onboarding_completed, profile_json, created_at, updated_at) VALUES ('usr_3qgd1c1521789629225205', '998901234567', 'Алишер (Demo)', '', 'fitai_preview', '', 'ru', 0, NULL, 0, 1, '{"weight":78,"targetWeight":68,"height":175,"age":28,"gender":"male","activityLevel":"moderate","workoutsPerWeek":3,"waterGoalMl":2500,"stepsGoal":10000,"notificationsEnabled":true}', '2026-09-17T07:13:45.205Z', '2026-09-17T07:55:45.423Z');
INSERT OR IGNORE INTO users (id, telegram_id, first_name, last_name, username, phone, language, is_premium, premium_until, is_admin, onboarding_completed, profile_json, created_at, updated_at) VALUES ('usr_7k5pynes51789630107801', '11223344', 'Сергей', '', 'sergey_fit', '', 'ru', 0, NULL, 0, 0, '{"weight":78,"targetWeight":68,"height":175,"age":28,"gender":"male","activityLevel":"moderate","workoutsPerWeek":3,"waterGoalMl":2500,"stepsGoal":10000,"notificationsEnabled":true}', '2026-09-17T07:28:27.801Z', '2026-09-17T07:28:27.801Z');

-- 2. Admin Users
INSERT OR IGNORE INTO admin_users (id, username, password_hash, role, created_at, updated_at) VALUES ('admin_primary', 'Timurcik', '$2b$10$XpARYPY.ejSnAU3GVvic9eT.G1ewhHxYc.MKSy0k0YSBXg6dBqa/a', 'superadmin', '2026-09-17T07:13:34.322Z', '2026-09-17T07:13:34.322Z');

-- 3. Payment Settings
INSERT OR REPLACE INTO payment_settings (id, card_number, card_holder, bank_name, instructions, instructions_uz, instructions_en, price_1_month, price_3_months, price_1_year, currency, updated_at) VALUES ('default', '8600 4912 3456 7890', 'FITAI PAYMENTS / ALISHER U.', 'Kapitalbank / Uzcard / Humo / Visa', '1. Переведите указанную сумму на карту.
2. Сделайте скриншот чека об оплате.
3. Прикрепите скриншот ниже и нажмите «Я оплатил».
4. Доступ к Premium будет активирован сразу после подтверждения администратором!', '1. Ko‘rsatilgan summani kartaga o‘tkazing.
2. To‘lov chekining skrinshotini oling.
3. Chekni yuklang va «Men to‘ladim» tugmasini bosing.
4. Admin tasdiqlashi bilan Premium darhol yoqiladi!', '1. Transfer the exact amount to the card details.
2. Take a screenshot of the payment receipt.
3. Attach the screenshot and tap "I Paid".
4. Premium access will be activated immediately upon admin approval!', 99000, 249000, 699000, 'UZS', '2026-09-17T07:13:34.224Z');

-- 4. Payments

-- 5. Daily Activity
INSERT OR IGNORE INTO daily_activity (id, user_id, date, water_ml, water_goal_ml, steps, steps_goal, streak_count, created_at, updated_at) VALUES ('act_1789629225652', 'usr_3qgd1c1521789629225205', '2026-09-17', 0, 2500, 0, 10000, 3, '2026-09-17T08:31:38.117Z', '2026-09-17T08:31:38.117Z');
INSERT OR IGNORE INTO daily_activity (id, user_id, date, water_ml, water_goal_ml, steps, steps_goal, streak_count, created_at, updated_at) VALUES ('act_1789630107830', 'usr_7k5pynes51789630107801', '2026-09-17', 0, 2500, 0, 10000, 3, '2026-09-17T08:31:38.117Z', '2026-09-17T08:31:38.117Z');
