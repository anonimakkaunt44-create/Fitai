import fs from 'fs';
import path from 'path';

/**
 * Migration Tool: Converts existing JSON database (data/fitai_database.json)
 * into a safe, idempotent Cloudflare D1 SQL migration script (migrations/0002_import_existing_data.sql).
 */

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function runMigration() {
  const rootDir = process.cwd();
  const dbFile = path.join(rootDir, 'data', 'fitai_database.json');
  const backupFile = path.join(rootDir, 'data', 'fitai_database.backup.json');

  let rawData = '';
  let source = '';

  if (fs.existsSync(dbFile)) {
    rawData = fs.readFileSync(dbFile, 'utf-8');
    source = dbFile;
  } else if (fs.existsSync(backupFile)) {
    rawData = fs.readFileSync(backupFile, 'utf-8');
    source = backupFile;
  } else {
    console.error('No JSON database file found in data/. Nothing to migrate.');
    return;
  }

  let data: any = {};
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('Failed to parse JSON database:', err);
    return;
  }

  console.log(`Loaded database from: ${source}`);

  const sqlLines: string[] = [
    '-- ====================================================================',
    '-- FitAI Data Migration from JSON to Cloudflare D1',
    `-- Generated on: ${new Date().toISOString()}`,
    '-- ====================================================================',
    '',
  ];

  let usersCount = 0;
  let adminCount = 0;
  let paymentsCount = 0;
  let activityCount = 0;

  // 1. Migrate Users
  if (Array.isArray(data.users)) {
    sqlLines.push('-- 1. Users');
    for (const u of data.users) {
      if (!u.id || !u.telegramId) continue;
      const profile = u.profile || {};
      sqlLines.push(
        `INSERT OR IGNORE INTO users (id, telegram_id, first_name, last_name, username, phone, language, is_premium, premium_until, is_admin, onboarding_completed, profile_json, created_at, updated_at) VALUES (${escapeSql(u.id)}, ${escapeSql(u.telegramId)}, ${escapeSql(u.firstName || 'FitAI User')}, ${escapeSql(u.lastName || '')}, ${escapeSql(u.username || '')}, ${escapeSql(u.phone || '')}, ${escapeSql(u.language || 'ru')}, ${u.isPremium ? 1 : 0}, ${escapeSql(u.premiumUntil || null)}, ${u.isAdmin ? 1 : 0}, ${u.onboardingCompleted ? 1 : 0}, ${escapeSql(profile)}, ${escapeSql(u.createdAt || new Date().toISOString())}, ${escapeSql(u.updatedAt || new Date().toISOString())});`
      );
      usersCount++;
    }
    sqlLines.push('');
  }

  // 2. Migrate Admin Users
  if (Array.isArray(data.adminUsers)) {
    sqlLines.push('-- 2. Admin Users');
    for (const a of data.adminUsers) {
      if (!a.id || !a.username || !a.passwordHash) continue;
      sqlLines.push(
        `INSERT OR IGNORE INTO admin_users (id, username, password_hash, role, created_at, updated_at) VALUES (${escapeSql(a.id)}, ${escapeSql(a.username)}, ${escapeSql(a.passwordHash)}, ${escapeSql(a.role || 'admin')}, ${escapeSql(a.createdAt || new Date().toISOString())}, ${escapeSql(a.updatedAt || new Date().toISOString())});`
      );
      adminCount++;
    }
    sqlLines.push('');
  }

  // 3. Migrate Payment Settings
  if (data.paymentSettings) {
    const s = data.paymentSettings;
    sqlLines.push('-- 3. Payment Settings');
    sqlLines.push(
      `INSERT OR REPLACE INTO payment_settings (id, card_number, card_holder, bank_name, instructions, instructions_uz, instructions_en, price_1_month, price_3_months, price_1_year, currency, updated_at) VALUES ('default', ${escapeSql(s.cardNumber || '8600 4912 3456 7890')}, ${escapeSql(s.cardHolder || 'FITAI PAYMENTS')}, ${escapeSql(s.bankName || 'Kapitalbank')}, ${escapeSql(s.instructions || '')}, ${escapeSql(s.instructionsUz || '')}, ${escapeSql(s.instructionsEn || '')}, ${s.price1Month || 99000}, ${s.price3Months || 249000}, ${s.price1Year || 699000}, ${escapeSql(s.currency || 'UZS')}, ${escapeSql(s.updatedAt || new Date().toISOString())});`
    );
    sqlLines.push('');
  }

  // 4. Migrate Payments
  if (Array.isArray(data.payments)) {
    sqlLines.push('-- 4. Payments');
    for (const p of data.payments) {
      if (!p.id || !p.telegramId) continue;
      sqlLines.push(
        `INSERT OR IGNORE INTO payments (id, user_id, telegram_id, full_name, username, plan_id, plan_name, amount, currency, receipt_url, status, reviewed_by, reviewed_at, reject_reason, created_at, updated_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.userId)}, ${escapeSql(p.telegramId)}, ${escapeSql(p.fullName || '')}, ${escapeSql(p.username || '')}, ${escapeSql(p.planId || '')}, ${escapeSql(p.planName || '')}, ${p.amount || 0}, ${escapeSql(p.currency || 'UZS')}, ${escapeSql(p.receiptUrl || '')}, ${escapeSql(p.status || 'pending')}, ${escapeSql(p.reviewedBy || null)}, ${escapeSql(p.reviewedAt || null)}, ${escapeSql(p.rejectReason || null)}, ${escapeSql(p.createdAt || new Date().toISOString())}, ${escapeSql(p.updatedAt || new Date().toISOString())});`
      );
      paymentsCount++;
    }
    sqlLines.push('');
  }

  // 5. Migrate Daily Activity
  if (Array.isArray(data.dailyActivity)) {
    sqlLines.push('-- 5. Daily Activity');
    for (const act of data.dailyActivity) {
      if (!act.id || !act.userId || !act.date) continue;
      sqlLines.push(
        `INSERT OR IGNORE INTO daily_activity (id, user_id, date, water_ml, water_goal_ml, steps, steps_goal, streak_count, created_at, updated_at) VALUES (${escapeSql(act.id)}, ${escapeSql(act.userId)}, ${escapeSql(act.date)}, ${act.waterMl || 0}, ${act.waterGoalMl || 2500}, ${act.steps || 0}, ${act.stepsGoal || 10000}, ${act.streakCount || 1}, ${escapeSql(new Date().toISOString())}, ${escapeSql(new Date().toISOString())});`
      );
      activityCount++;
    }
    sqlLines.push('');
  }

  const outDir = path.join(rootDir, 'migrations');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, '0002_import_existing_data.sql');
  fs.writeFileSync(outFile, sqlLines.join('\n'), 'utf-8');

  console.log('\n================ MIGRATION REPORT ================');
  console.log(`Generated migration file: ${outFile}`);
  console.log(`Users prepared for D1:           ${usersCount}`);
  console.log(`Admin accounts prepared for D1:  ${adminCount}`);
  console.log(`Payments prepared for D1:        ${paymentsCount}`);
  console.log(`Activity entries prepared for D1: ${activityCount}`);
  console.log('Original JSON files left intact in data/');
  console.log('==================================================\n');
}

runMigration();
