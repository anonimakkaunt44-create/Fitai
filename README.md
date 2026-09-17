# 🥗 FitAI — Персональный AI-фитнес-тренер и диетолог в Telegram

FitAI — это современное полнофункциональное веб-приложение (Telegram Mini App) с AI-тренером, анализом блюд по фотографии, индивидуальными тренировками, меню для похудения, семейным планированием и админ-панелью.

Проект полностью оптимизирован для развертывания на бессерверной инфраструктуре **Cloudflare Workers** с постоянной базой данных **Cloudflare D1** и объектным хранилищем фото **Cloudflare R2**.

---

## 🚀 Архитектура и технологии

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion. Оптимизирован как для мобильных устройств внутри Telegram Mini App, так и для автономного использования в браузере.
- **Edge Backend**: Cloudflare Workers + Hono (минималистичный сверхбыстрый Web Standards API рантайм на V8 Isolate).
- **База данных**: **Cloudflare D1** (SQLite на Edge). Постоянное хранение всех профилей, активности, измерений, платежей и истории без сброса при перезапусках.
- **Хранилище медиа**: **Cloudflare R2**. Защищенное хранение фотографий блюд, чеков об оплате и аватарок с контролем прав доступа.
- **Искусственный интеллект**: Google Gemini API (`gemini-2.5-flash` / `gemini-3.8-flash`) для консультаций тренера, расчёта калорий по фото, рецептов из холодильника и персональных тренировок.
- **Telegram Bot**: Автоматический Webhook с защитой секретным токеном (`X-Telegram-Bot-Api-Secret-Token`), дедупликацией `update_id` и встроенной интерактивной обработкой кнопок подтверждения оплат.
- **Безопасность**: HMAC-SHA256 валидация Telegram initData, Web Crypto JWT, bcryptjs хеширование паролей администратора, отсутствие хардкода секретов.

---

## 📁 Структура проекта

```text
├── .github/workflows/
│   └── deploy.yml              # Автодеплой из GitHub в Cloudflare Workers
├── migrations/
│   ├── 0001_initial_schema.sql # Полная схема таблиц D1 (users, payments, food, activity и т.д.)
│   └── 0002_import_existing_data.sql # Миграция данных из старой JSON-базы в D1
├── scripts/
│   └── migrate-json-to-d1.ts   # Скрипт экспорта данных из data/*.json в SQL для D1
├── src/
│   ├── components/             # React компоненты интерфейса (тренировки, питание, мама, профиль)
│   ├── context/                # Контекст состояния приложения и синхронизации
│   └── worker/                 # Cloudflare Worker бэкенд
│       ├── index.ts            # Главный роутер Hono и эндпоинты API
│       ├── db.ts               # Сервис работы с Cloudflare D1 (Prepared Statements)
│       ├── r2.ts               # Сервис работы с Cloudflare R2 (загрузка/выдача файлов)
│       ├── ai.ts               # Интеграция с Google Gemini API
│       ├── auth.ts             # Валидация Telegram WebApp, JWT и пароли
│       ├── telegram.ts         # Telegram Bot API и обработка Webhook
│       └── types.ts            # TypeScript интерфейсы окружения Env и данных
├── CLOUDFLARE_GUIDE_RU.md      # Пошаговая инструкция запуска с iPhone
├── wrangler.jsonc              # Конфигурация Cloudflare Workers, D1 и R2
├── package.json
├── package-lock.json           # Согласованный lockfile для npm ci в Cloudflare
└── tsconfig.json
```

---

## 🛠️ Команды разработки и деплоя

| Команда | Описание |
| :--- | :--- |
| `npm run dev` | Запуск локального сервера разработки (порт 3000) |
| `npm run build` | Полная сборка frontend и backend |
| `npm run build:cf` | Сборка статических файлов React в `dist/` для Cloudflare Assets |
| `npm run deploy:cf` | Развертывание в Cloudflare Workers через Wrangler CLI |
| `npm run migrate:json` | Генерация SQL миграции из существующих JSON файлов |
| `npm run migrate:d1:remote` | Применение SQL миграции к удаленной базе D1 |

---

## 📱 Запуск с телефона iPhone

Подробная инструкция для запуска без необходимости писать код или использовать командную строку описана в файле:
👉 **[CLOUDFLARE_GUIDE_RU.md](./CLOUDFLARE_GUIDE_RU.md)**
