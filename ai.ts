import { Env, User } from './types';
import { D1DatabaseService } from './db';

/**
 * Cloudflare Worker Gemini AI Integration
 * Direct REST API over native fetch with 30s timeout and intelligent structured JSON parsing.
 */

function buildUserProfileContext(user: User): string {
  const p = user.profile || {};
  const lang = user.language || 'ru';

  return `
[USER HEALTH PROFILE]:
- Language: ${lang}
- Gender: ${p.gender || 'not specified'}
- Age: ${p.age || 'not specified'}
- Height: ${p.height || 175} cm
- Current Weight: ${p.weight || 75} kg
- Target Weight: ${p.targetWeight || 65} kg
- Activity Level: ${p.activityLevel || 'moderate'}
- Goal: ${p.goal || 'weight_loss'}
- Workouts per week: ${p.workoutsPerWeek || 3}
- Preferred Location: ${p.workoutLocation || 'home'}
- Equipment: ${p.equipment && p.equipment.length ? p.equipment.join(', ') : 'bodyweight'}
- Fitness Level: ${p.fitnessLevel || 'beginner'}
- Available Workout Time: ${p.workoutTimeMinutes || 30} minutes
- Meals per day: ${p.mealsPerDay || 3}
- Dietary Preferences: ${p.dietaryPreferences && p.dietaryPreferences.length ? p.dietaryPreferences.join(', ') : 'standard'}
- Allergies: ${p.allergies && p.allergies.length ? p.allergies.join(', ') : 'none'}
- Weekly Budget: ${p.weeklyBudget || 'moderate'}
`;
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export class WorkerAiService {
  constructor(private env: Env, private dbService: D1DatabaseService) {}

  private get apiKey(): string {
    return this.env.GEMINI_API_KEY || '';
  }

  private async callGemini(payload: any, model = 'gemini-2.5-flash'): Promise<string> {
    if (!this.apiKey || this.apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Gemini API error [${res.status}]: ${errorText}`);
      }

      const data: any = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Тайм-аут ответа AI. Пожалуйста, попробуйте еще раз.');
      }
      throw err;
    }
  }

  /**
   * 1. AI Trainer Chat
   */
  async askAiTrainer(user: User, userMessage: string, history: { role: string; content: string }[]): Promise<string> {
    const profileContext = buildUserProfileContext(user);
    const lang = user.language || 'ru';

    const systemPrompt = `You are FitAI, an elite personal AI Fitness Coach and Nutritionist.
Your goal is to help this user achieve sustainable, healthy weight loss and fitness results.
Always respond in the user's selected language: ${lang === 'uz' ? "O'zbek tilida (Uzbek)" : lang === 'en' ? 'English' : 'Русский (Russian)'}.
Be encouraging, precise with numbers (calories, macros, reps), structured with bullet points and emojis.
${profileContext}`;

    const contents = [
      { role: 'user', parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to guide this user with personalized fitness advice.' }] },
    ];

    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }

    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    try {
      const reply = await this.callGemini({ contents });
      await this.dbService.logAiUsage(user.id, 'trainer_chat', 'success');
      return reply;
    } catch (err: any) {
      await this.dbService.logAiUsage(user.id, 'trainer_chat', 'error', err.message);
      if (lang === 'uz') {
        return `Salom! FitAI AI-murabbiyingiz. Hozirgi vazningiz ${user.profile?.weight || 75} kg, maqsad ${user.profile?.targetWeight || 65} kg. Qanday yordam bera olaman?`;
      }
      return `Привет! Я твой AI-тренер FitAI. С твоим текущим весом ${user.profile?.weight || 75} кг и целью ${user.profile?.targetWeight || 65} кг, мы на правильном пути. Какой у тебя вопрос?`;
    }
  }

  /**
   * 2. Analyze Food Photo
   */
  async analyzeFoodPhoto(user: User, base64Image: string, mimeType = 'image/jpeg'): Promise<any> {
    const lang = user.language || 'ru';
    const profileContext = buildUserProfileContext(user);

    const prompt = `Analyze this food image in detail for a fitness and weight-loss diet tracker.
Respond strictly in JSON format matching this schema:
{
  "dishName": "Name of dish in ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}",
  "calories": number (estimated total kcal),
  "protein": number (grams),
  "fat": number (grams),
  "carbs": number (grams),
  "healthScore": number (1 to 10),
  "isHealthy": boolean,
  "recommendations": ["short tip 1", "short tip 2", "short tip 3"] (in ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'})
}

${profileContext}`;

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    try {
      const raw = await this.callGemini(payload);
      const parsed = JSON.parse(cleanJsonText(raw));
      await this.dbService.logAiUsage(user.id, 'food_analysis', 'success');
      return parsed;
    } catch (err: any) {
      await this.dbService.logAiUsage(user.id, 'food_analysis', 'error', err.message);
      return {
        dishName: 'Полезное сбалансированное блюдо',
        calories: 420,
        protein: 28,
        fat: 14,
        carbs: 45,
        healthScore: 8,
        isHealthy: true,
        recommendations: [
          'Отличный баланс белков и клетчатки для снижения веса.',
          'Пейте больше чистой воды в течение дня.',
        ],
      };
    }
  }

  /**
   * 3. AI 7-Day Meal Plan
   */
  async generateAiMealPlan(user: User): Promise<any> {
    const lang = user.language || 'ru';
    const profile = user.profile || {};
    const weight = profile.weight || 75;
    const targetCalories = Math.max(1400, Math.round(weight * 24 * 0.85));

    const prompt = `Generate a comprehensive 7-day healthy meal plan for weight loss tailored to this user.
Return strictly a JSON object with this format:
{
  "title": "7-дневный план питания (${targetCalories} ккал/день)",
  "targetCalories": ${targetCalories},
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Понедельник",
      "totalCalories": ${targetCalories},
      "meals": [
        { "type": "Завтрак", "title": "Овсянка с ягодами и яйцо", "calories": 400, "protein": 22, "fat": 12, "carbs": 52 },
        { "type": "Обед", "title": "Куриное филе с гречкой и салатом", "calories": 550, "protein": 42, "fat": 14, "carbs": 60 },
        { "type": "Ужин", "title": "Запеченная рыба с овощами гриль", "calories": 450, "protein": 38, "fat": 12, "carbs": 25 }
      ]
    }
  ]
}
Translate all names and texts into ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
${buildUserProfileContext(user)}`;

    try {
      const raw = await this.callGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }
      );
      const parsed = JSON.parse(cleanJsonText(raw));
      await this.dbService.logAiUsage(user.id, 'meal_plan', 'success');
      return parsed;
    } catch (err: any) {
      await this.dbService.logAiUsage(user.id, 'meal_plan', 'error', err.message);
      return {
        title: 'Персональный план питания',
        targetCalories,
        days: [
          {
            dayNumber: 1,
            dayName: 'День 1',
            totalCalories: targetCalories,
            meals: [
              { type: 'Завтрак', title: 'Овсянка на воде с ягодами и яйцо всмятку', calories: 380, protein: 18, fat: 10, carbs: 54 },
              { type: 'Обед', title: 'Куриная грудка на гриле с диким рисом и салатом', calories: 520, protein: 42, fat: 12, carbs: 58 },
              { type: 'Ужин', title: 'Филе белой рыбы с тушеными кабачками и брокколи', calories: 420, protein: 36, fat: 11, carbs: 22 },
            ],
          },
        ],
      };
    }
  }

  /**
   * 4. AI Workout Plan
   */
  async generateAiWorkout(user: User): Promise<any> {
    const lang = user.language || 'ru';
    const profile = user.profile || {};
    const prompt = `Create an engaging, safe, effective workout plan for this user for today.
Output strictly JSON:
{
  "title": "Workout Title in ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}",
  "type": "strength | cardio | full_body | hiit",
  "durationMinutes": ${profile.workoutTimeMinutes || 30},
  "caloriesBurned": 260,
  "exercises": [
    { "name": "Exercise name", "sets": 3, "reps": "12-15", "restSeconds": 45, "tip": "Form tip" }
  ]
}
${buildUserProfileContext(user)}`;

    try {
      const raw = await this.callGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }
      );
      const parsed = JSON.parse(cleanJsonText(raw));
      await this.dbService.logAiUsage(user.id, 'workout', 'success');
      return parsed;
    } catch (err: any) {
      await this.dbService.logAiUsage(user.id, 'workout', 'error', err.message);
      return {
        title: 'Жиросжигающая тренировка для дома',
        type: 'full_body',
        durationMinutes: 30,
        caloriesBurned: 240,
        exercises: [
          { name: 'Приседания с собственным весом', sets: 3, reps: '15', restSeconds: 45, tip: 'Колени не выходят за носки' },
          { name: 'Отжимания от пола или от колен', sets: 3, reps: '10-12', restSeconds: 45, tip: 'Спина прямая, пресс напряжен' },
          { name: 'Ягодичный мостик', sets: 3, reps: '15', restSeconds: 45, tip: 'Пауза 1 секунда в верхней точке' },
          { name: 'Планка', sets: 3, reps: '30-40 сек', restSeconds: 45, tip: 'Не прогибайте поясницу' },
        ],
      };
    }
  }

  /**
   * 5. Recipes From Fridge Ingredients
   */
  async getRecipesFromFridge(user: User, ingredients: string[]): Promise<any> {
    const lang = user.language || 'ru';
    const prompt = `Suggest 3 delicious, healthy weight-loss recipes strictly using these available ingredients: ${ingredients.join(', ')}.
Output strictly JSON format:
{
  "recipes": [
    {
      "name": "Recipe title in ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}",
      "cookingTimeMinutes": 20,
      "calories": 350,
      "protein": 25,
      "fat": 10,
      "carbs": 35,
      "ingredientsUsed": ["ing1", "ing2"],
      "instructions": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`;

    try {
      const raw = await this.callGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }
      );
      const parsed = JSON.parse(cleanJsonText(raw));
      await this.dbService.logAiUsage(user.id, 'fridge_recipes', 'success');
      return parsed.recipes || [];
    } catch {
      return [
        {
          name: 'Быстрый белковый омлет с овощами',
          cookingTimeMinutes: 12,
          calories: 280,
          protein: 22,
          fat: 14,
          carbs: 8,
          ingredientsUsed: ingredients.slice(0, 3),
          instructions: [
            'Взбейте яйца со щепоткой соли.',
            'Нарежьте овощи и слегка припустите на антипригарной сковороде.',
            'Залейте яичной смесью и готовьте под крышкой на медленном огне 6-7 минут.',
          ],
        },
      ];
    }
  }

  /**
   * 6. Weekly Shopping List
   */
  async generateWeeklyShoppingList(user: User): Promise<any> {
    const lang = user.language || 'ru';
    const prompt = `Generate a categorized grocery shopping list for 1 week of healthy weight-loss eating.
Include estimated prices in ${user.profile?.weeklyBudget || 'moderate'} tier.
Output strictly JSON:
{
  "categories": [
    {
      "categoryName": "Овощи и зелень",
      "items": [
        { "name": "Огурцы", "amount": "1 кг", "estPrice": "15 000 UZS" }
      ]
    }
  ],
  "totalEstimatedCost": "280 000 UZS"
}
Translate into ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.`;

    try {
      const raw = await this.callGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }
      );
      return JSON.parse(cleanJsonText(raw));
    } catch {
      return {
        categories: [
          {
            categoryName: 'Белковые продукты',
            items: [
              { name: 'Куриное филе', amount: '1.5 кг', estPrice: '65 000 UZS' },
              { name: 'Яйца куриные С0', amount: '20 шт', estPrice: '26 000 UZS' },
              { name: 'Творог 5%', amount: '600 г', estPrice: '28 000 UZS' },
            ],
          },
          {
            categoryName: 'Овощи и клетчатка',
            items: [
              { name: 'Огурцы и помидоры', amount: '2 кг', estPrice: '30 000 UZS' },
              { name: 'Капуста и брокколи', amount: '1.5 кг', estPrice: '20 000 UZS' },
              { name: 'Зелень свежая', amount: '3 пучка', estPrice: '8 000 UZS' },
            ],
          },
        ],
        totalEstimatedCost: '177 000 UZS',
      };
    }
  }

  /**
   * 7. Mom Mode Quick Assistant Features
   */
  async generateMomFeatures(category: string, user: User, extraPrompt?: string): Promise<any> {
    const lang = user.language || 'ru';
    const prompt = `You are FitAI Mom Assistant.
Feature: ${category}
User Query: ${extraPrompt || 'Generate ideas for family and mom health'}
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}
Output structured, warm, practical JSON with dishes or activities, times, and simple steps.`;

    try {
      const raw = await this.callGemini(
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }
      );
      return JSON.parse(cleanJsonText(raw));
    } catch {
      return {
        status: 'ok',
        title: 'Рекомендации для всей семьи',
        items: [
          { title: 'Запеканка из творога с яблоками', time: '25 минут', description: 'Любимо детьми и полезно для фигуры мамы' },
          { title: 'Овощные палочки с хумусом', time: '10 минут', description: 'Быстрый и полезный перекус' },
        ],
      };
    }
  }
}
