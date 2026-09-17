import { GoogleGenAI, Type } from '@google/genai';
import { db, User } from './db.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Builds user contextual health string for AI prompt
 */
function buildUserProfileContext(user: User): string {
  const p = user.profile;
  const lang = user.language || 'ru';

  return `
[USER HEALTH PROFILE]:
- Language: ${lang}
- Gender: ${p.gender || 'not specified'}
- Age: ${p.age || 'not specified'}
- Height: ${p.height || 175} cm
- Current Weight: ${p.weight || 75} kg
- Target Weight: ${p.targetWeight || 65} kg
- Waist: ${p.waist ? p.waist + ' cm' : 'not measured'}
- Activity Level: ${p.activityLevel || 'moderate'}
- Goal: ${p.goal || 'weight_loss'}
- Workouts per week: ${p.workoutsPerWeek || 3}
- Preferred Workout Location: ${p.workoutLocation || 'home'}
- Equipment: ${(p.equipment && p.equipment.length) ? p.equipment.join(', ') : 'no special equipment / bodyweight'}
- Fitness Level: ${p.fitnessLevel || 'beginner'}
- Available Workout Time: ${p.workoutTimeMinutes || 30} minutes
- Meals per day: ${p.mealsPerDay || 3}
- Dietary Preferences: ${(p.dietaryPreferences && p.dietaryPreferences.length) ? p.dietaryPreferences.join(', ') : 'standard healthy'}
- Allergies: ${(p.allergies && p.allergies.length) ? p.allergies.join(', ') : 'none'}
- Disliked Foods: ${(p.dislikedFoods && p.dislikedFoods.length) ? p.dislikedFoods.join(', ') : 'none'}
- Weekly Grocery Budget: ${p.weeklyBudget || 'moderate'}
- Sleep: ${p.sleepHours || 7} hours/day
`;
}

/**
 * 1. AI Trainer Chat
 */
export async function askAiTrainer(user: User, userMessage: string, history: { role: string; content: string }[]): Promise<string> {
  const ai = getAiClient();
  const profileContext = buildUserProfileContext(user);
  const lang = user.language || 'ru';

  const systemPrompt = `You are FitAI, an elite, compassionate, and science-grounded personal AI Fitness Coach and Clinical Nutritionist.
Your goal is to help this user achieve sustainable, healthy weight loss and fitness results.
Always respond in the user's selected language: ${lang === 'uz' ? "O'zbek tilida (Uzbek)" : lang === 'en' ? 'English' : 'Русский (Russian)'}.
Be encouraging, precise with numbers (calories, macros, reps), structured with bullet points and emojis, and tailor all advice directly to the user profile below.
Do not give dangerous extreme diets; recommend healthy caloric deficits (300-500 kcal deficit).
If they ask for plan corrections, adjust their targets logically.

${profileContext}`;

  if (!ai) {
    db.logAiUsage(user.id, 'trainer_chat', 'success');
    if (lang === 'uz') {
      return `Salom! Men sizning FitAI shaxsiy murabbiyingizman. Hozirgi vazningiz ${user.profile.weight || 75} kg, maqsadingiz esa ${user.profile.targetWeight || 65} kg. Sizga kunlik 1800-1900 kkal va haftasiga 3 marta mashg'ulot tavsiya etiladi. Qanday savolingiz bor?`;
    } else if (lang === 'en') {
      return `Hello! I am your personal FitAI coach. Based on your current weight of ${user.profile.weight || 75} kg and target of ${user.profile.targetWeight || 65} kg, I recommend a moderate 400 kcal deficit with 1,850 kcal/day and 3 strength sessions per week. How can I assist you today?`;
    }
    return `Привет! Я твой персональный AI-тренер FitAI. С твоим текущим весом ${user.profile.weight || 75} кг и целью ${user.profile.targetWeight || 65} кг, наш ориентир — здоровый дефицит в 1850 ккал в день и 3 тренировки в неделю. Какой у тебя вопрос по тренировкам или питанию?`;
  }

  try {
    const formattedHistory = history.slice(-6).map((h) => `${h.role === 'user' ? 'User' : 'FitAI'}: ${h.content}`).join('\n');
    const prompt = `${systemPrompt}\n\nRecent conversation:\n${formattedHistory}\n\nUser: ${userMessage}\nFitAI:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const reply = response.text || 'Ответ от AI сформирован.';
    db.logAiUsage(user.id, 'trainer_chat', 'success');
    return reply;
  } catch (err: any) {
    console.error('Error calling Gemini for AI Trainer:', err);
    db.logAiUsage(user.id, 'trainer_chat', 'error', err?.message || String(err));
    return `Извините, сервис временно занят. Попробуйте еще раз через несколько секунд.`;
  }
}

/**
 * 2. Generate Structured Meal Plan for Today
 */
export async function generateAiMealPlan(user: User): Promise<any> {
  const ai = getAiClient();
  const profileContext = buildUserProfileContext(user);
  const lang = user.language || 'ru';

  const fallbackPlan = {
    breakfast: {
      dish: lang === 'uz' ? "Suli bo'tqasi rezavorlar va tuxum bilan" : lang === 'en' ? 'Oatmeal with berries and 2 boiled eggs' : 'Овсяная каша с ягодами и 2 вареных яйца',
      ingredients: ['Овсяные хлопья 50г', 'Яйца куриные 2шт', 'Ягоды 50г', 'Миндаль 15г'],
      portionGrams: 320,
      calories: 420,
      proteins: 22,
      fats: 14,
      carbs: 48,
      recipeInstructions: 'Сварите овсянку на воде или нежирном молоке. Отварите яйца всмятку (5 минут). Украсьте кашу ягодами и дробленым миндалем.',
    },
    lunch: {
      dish: lang === 'uz' ? "Tovuq filesi jigarrang guruch va sabzavotlar bilan" : lang === 'en' ? 'Grilled chicken breast with brown rice and steamed veggies' : 'Куриное филе на гриле с бурым рисом и свежими овощами',
      ingredients: ['Куриное филе 160г', 'Бурый рис 60г (сухой вес)', 'Огурцы и помидоры 150г', 'Оливковое масло 5г'],
      portionGrams: 420,
      calories: 540,
      proteins: 45,
      fats: 10,
      carbs: 62,
      recipeInstructions: 'Замаринуйте филе в соевом соусе с лимоном и травами, обжарьте на сухой сковороде гриль. Отварите рис. Нарежьте салат.',
    },
    dinner: {
      dish: lang === 'uz' ? "Dimlangan baliq va brokkoli" : lang === 'en' ? 'Baked white fish with broccoli and lemon' : 'Запеченный судак или треска с брокколи на пару',
      ingredients: ['Филе белой рыбы 180г', 'Брокколи 180г', 'Лимонный сок 10г', 'Зелень и специи'],
      portionGrams: 380,
      calories: 360,
      proteins: 38,
      fats: 6,
      carbs: 18,
      recipeInstructions: 'Выложите рыбу в форму, сбрызните лимонным соком, посыпьте укропом и запекайте 18 минут при 180°C. Брокколи бланшируйте 4 минуты.',
    },
    snack: {
      dish: lang === 'uz' ? "Gretsiya yogurti va olma" : lang === 'en' ? 'Greek yogurt with cinnamon and green apple' : 'Греческий йогурт 2% с корицей и зеленое яблоко',
      ingredients: ['Греческий йогурт 150г', 'Яблоко зеленое 120г', 'Корица по вкусу'],
      portionGrams: 270,
      calories: 190,
      proteins: 15,
      fats: 3,
      carbs: 24,
      recipeInstructions: 'Нарежьте яблоко тонкими ломтиками, посыпьте корицей и макайте в греческий йогурт.',
    },
    totalCalories: 1510,
    totalProteins: 120,
    totalFats: 33,
    totalCarbs: 152,
  };

  if (!ai) {
    db.logAiUsage(user.id, 'meal_plan', 'success');
    return fallbackPlan;
  }

  try {
    const prompt = `Create a 1-day personalized healthy weight-loss meal plan (Breakfast, Lunch, Dinner, Snack) in ${lang === 'uz' ? 'Uzbek language' : lang === 'en' ? 'English language' : 'Russian language'}.
Account for this user profile:
${profileContext}

Return JSON with exact keys:
breakfast, lunch, dinner, snack (each having: dish, ingredients [array of strings with grams], portionGrams, calories, proteins, fats, carbs, recipeInstructions), totalCalories, totalProteins, totalFats, totalCarbs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'meal_plan', 'success');
    return { ...fallbackPlan, ...parsed };
  } catch (err: any) {
    console.error('Error generating meal plan with Gemini:', err);
    db.logAiUsage(user.id, 'meal_plan', 'error', err?.message);
    return fallbackPlan;
  }
}

/**
 * 3. Generate Workout Plan
 */
export async function generateAiWorkout(user: User): Promise<any> {
  const ai = getAiClient();
  const profileContext = buildUserProfileContext(user);
  const lang = user.language || 'ru';

  const fallbackWorkout = {
    title: lang === 'uz' ? 'Yog‘ yoqish va tana tonusi (Home)' : lang === 'en' ? 'Fat Burn & Core Toning (Home)' : 'Жиросжигание и тонус всего тела (Дом)',
    durationMinutes: user.profile.workoutTimeMinutes || 35,
    fitnessLevel: user.profile.fitnessLevel || 'beginner',
    location: user.profile.workoutLocation || 'home',
    exercises: [
      {
        name: lang === 'uz' ? 'Klassik cho‘qqayish (Squats)' : lang === 'en' ? 'Bodyweight Squats' : 'Приседания с собственным весом',
        sets: 3,
        reps: '15-18',
        restSeconds: 45,
        technique: 'Спина прямая, колени направлены в сторону носков, опускайтесь до параллели бедер с полом.',
        targetMuscles: 'Квадрицепсы, ягодицы, кор',
      },
      {
        name: lang === 'uz' ? 'Otjimaniye (Push-ups)' : lang === 'en' ? 'Knee or Floor Push-ups' : 'Отжимания от пола (или с колен)',
        sets: 3,
        reps: '10-12',
        restSeconds: 60,
        technique: 'Тело в одну линию, пресс напряжен, локти под углом 45 градусов к корпусу.',
        targetMuscles: 'Грудные мышцы, трицепсы, плечи',
      },
      {
        name: lang === 'uz' ? 'Qadam tashlash (Lunges)' : lang === 'en' ? 'Walking Lunges' : 'Выпады назад попеременно',
        sets: 3,
        reps: '12 на каждую ногу',
        restSeconds: 45,
        technique: 'Шаг назад, переднее колено строго над пяткой, угол в обоих коленях 90 градусов.',
        targetMuscles: 'Ягодицы, бицепс бедра',
      },
      {
        name: lang === 'uz' ? 'Yagodiya ko‘prigi (Glute Bridge)' : lang === 'en' ? 'Glute Bridge' : 'Ягодичный мостик',
        sets: 3,
        reps: '16-20',
        restSeconds: 30,
        technique: 'Лежа на спине, стопы на полу на ширине плеч, мощно выталкивайте таз вверх и сжимайте ягодицы в верхней точке на 2 секунды.',
        targetMuscles: 'Ягодичные мышцы',
      },
      {
        name: lang === 'uz' ? 'Planka (Plank)' : lang === 'en' ? 'Elbow Plank' : 'Классическая планка на предплечьях',
        sets: 3,
        reps: '40-60 сек',
        restSeconds: 45,
        technique: 'Не прогибайте поясницу, держите корпус жестко натянутой струной.',
        targetMuscles: 'Мышцы кора, пресс, спина',
      },
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'workout', 'success');
    return fallbackWorkout;
  }

  try {
    const prompt = `Generate a fat-loss workout tailored to this user profile in ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Profile:
${profileContext}

Return JSON with exact keys:
title (string), durationMinutes (number), fitnessLevel (string), location (string), exercises (array of objects with: name, sets, reps, restSeconds, technique, targetMuscles).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'workout', 'success');
    return { ...fallbackWorkout, ...parsed };
  } catch (err: any) {
    console.error('Error generating workout with Gemini:', err);
    db.logAiUsage(user.id, 'workout', 'error', err?.message);
    return fallbackWorkout;
  }
}

/**
 * 4. Food Photo Analyzer (Multimodal Gemini Vision)
 */
export async function analyzeFoodPhoto(
  user: User,
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';

  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const fallbackAnalysis = {
    dishName: lang === 'uz' ? 'Sabzavotli va tovuqli salat' : lang === 'en' ? 'Grilled Chicken Salad' : 'Салат с курицей гриль и зеленью',
    portionWeight: '250-280 г',
    calories: 320,
    proteins: 28,
    fats: 11,
    carbs: 16,
    recommendations:
      lang === 'uz'
        ? 'Ajoyib muvozanatli taom! Oqsil miqdori yuqori, yog‘ miqdori kam. Kechki ovqat yoki tushlik uchun juda mos.'
        : lang === 'en'
        ? 'Excellent balanced meal! High protein, clean greens, healthy fats. Great for fat loss.'
        : 'Отличное сбалансированное блюдо! Высокое содержание чистого белка и клетчатки. Прекрасно вписывается в дневной калораж для похудения.',
  };

  if (!ai) {
    db.logAiUsage(user.id, 'food_photo', 'success');
    return fallbackAnalysis;
  }

  try {
    const prompt = `You are a world-class AI Nutritionist and Food Computer Vision specialist.
Analyze this meal image carefully.
Respond strictly in ${lang === 'uz' ? 'Uzbek language' : lang === 'en' ? 'English language' : 'Russian language'}.
Estimate the dish name, approximate portion weight in grams (e.g. "300 г"), calories (kcal), proteins (g), fats (g), carbohydrates (g), and actionable dietary recommendations for someone losing weight.

Return ONLY valid JSON matching this schema:
{
  "dishName": "string",
  "portionWeight": "string",
  "calories": number,
  "proteins": number,
  "fats": number,
  "carbs": number,
  "recommendations": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'food_photo', 'success');
    return {
      dishName: parsed.dishName || fallbackAnalysis.dishName,
      portionWeight: parsed.portionWeight || fallbackAnalysis.portionWeight,
      calories: Number(parsed.calories) || fallbackAnalysis.calories,
      proteins: Number(parsed.proteins) || fallbackAnalysis.proteins,
      fats: Number(parsed.fats) || fallbackAnalysis.fats,
      carbs: Number(parsed.carbs) || fallbackAnalysis.carbs,
      recommendations: parsed.recommendations || fallbackAnalysis.recommendations,
    };
  } catch (err: any) {
    console.error('Error analyzing food photo with Gemini:', err);
    db.logAiUsage(user.id, 'food_photo', 'error', err?.message);
    return fallbackAnalysis;
  }
}

/**
 * 5. "What to cook?" - Recipes from fridge ingredients
 */
export async function getRecipesFromFridge(user: User, ingredientsText: string): Promise<any[]> {
  const ai = getAiClient();
  const lang = user.language || 'ru';

  const fallbackRecipes = [
    {
      title: lang === 'uz' ? 'Sabzavotli fitnes quymoq (Omlet)' : lang === 'en' ? 'Protein Veggie Scramble' : 'Фитнес-омлет с овощами',
      prepTime: '10 мин',
      calories: 240,
      macros: 'Белки: 18г | Жиры: 12г | Углеводы: 8г',
      ingredientsUsed: ['Яйца', 'Помидоры', 'Зелень'],
      steps: [
        'Взбейте яйца со щепоткой соли и перца.',
        'Нарежьте овощи небольшими кубиками и слегка припустите на антипригарной сковороде 2 минуты.',
        'Залейте яичной смесью, накройте крышкой и готовьте на медленном огне 5-6 минут.',
      ],
    },
    {
      title: lang === 'uz' ? 'Tovuqli qaynatilgan guruch kosasi' : lang === 'en' ? 'Lean Chicken & Rice Bowl' : 'Легкий боул с курицей и рисом',
      prepTime: '20 мин',
      calories: 380,
      macros: 'Белки: 34г | Жиры: 7г | Углеводы: 42г',
      ingredientsUsed: ['Курица', 'Рис', 'Овощи'],
      steps: [
        'Отварите рис до рассыпчатого состояния.',
        'Куриное филе нарежьте соломкой и обжарьте на сухой сковороде с добавлением любимых трав.',
        'Соберите боул: выложите рис, сверху курицу и свежие нарезанные овощи.',
      ],
    },
  ];

  if (!ai) {
    db.logAiUsage(user.id, 'fridge_recipe', 'success');
    return fallbackRecipes;
  }

  try {
    const prompt = `The user has these available food ingredients at home: "${ingredientsText}".
Suggest 2-3 healthy, delicious, weight-loss friendly fitness recipes that can be prepared primarily using these ingredients.
Respond in ${lang === 'uz' ? 'Uzbek language' : lang === 'en' ? 'English language' : 'Russian language'}.

Return JSON array of recipes with fields:
title (string), prepTime (string), calories (number), macros (string, e.g. "Белки: 25г | Жиры: 8г | Углеводы: 30г"), ingredientsUsed (array of strings), steps (array of strings).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    db.logAiUsage(user.id, 'fridge_recipe', 'success');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackRecipes;
  } catch (err: any) {
    console.error('Error generating fridge recipes with Gemini:', err);
    db.logAiUsage(user.id, 'fridge_recipe', 'error', err?.message);
    return fallbackRecipes;
  }
}

/**
 * 6. Generate Weekly Shopping List with Budget
 */
export async function generateWeeklyShoppingList(user: User): Promise<any> {
  const ai = getAiClient();
  const profileContext = buildUserProfileContext(user);
  const lang = user.language || 'ru';

  const fallbackList = {
    title: lang === 'uz' ? '1 haftalik sog‘lom taomlar xaridi' : lang === 'en' ? 'Weekly Fat-Loss Grocery List' : 'Список продуктов для похудения на неделю',
    weeklyBudget: 280000,
    estimatedTotal: 265000,
    currency: 'UZS',
    items: [
      { id: '1', name: 'Куриное филе или индейка', amount: '1.5 кг', estimatedPrice: 85000, category: 'Белки', checked: false },
      { id: '2', name: 'Яйца куриные (отборные)', amount: '2 дес.', estimatedPrice: 32000, category: 'Белки', checked: false },
      { id: '3', name: 'Творог 5% или греческий йогурт', amount: '600 г', estimatedPrice: 28000, category: 'Молочные продукты', checked: false },
      { id: '4', name: 'Овсяные хлопья длительной варки', amount: '800 г', estimatedPrice: 18000, category: 'Сложные углеводы', checked: false },
      { id: '5', name: 'Бурый рис или гречка', amount: '1 кг', estimatedPrice: 22000, category: 'Сложные углеводы', checked: false },
      { id: '6', name: 'Огурцы, помидоры, зелень', amount: '2 кг', estimatedPrice: 35000, category: 'Клетчатка и овощи', checked: false },
      { id: '7', name: 'Брокколи или цветная капуста', amount: '800 г', estimatedPrice: 25000, category: 'Клетчатка и овощи', checked: false },
      { id: '8', name: 'Зеленые яблоки или ягоды', amount: '1 кг', estimatedPrice: 20000, category: 'Фрукты', checked: false },
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'shopping_list', 'success');
    return fallbackList;
  }

  try {
    const prompt = `Generate a smart, cost-effective weekly grocery shopping list for a user losing weight.
Respond in ${lang === 'uz' ? 'Uzbek language' : lang === 'en' ? 'English language' : 'Russian language'}.
Account for this user profile and budget:
${profileContext}

Return JSON with keys:
title (string), weeklyBudget (number in local currency e.g. 300000 UZS), estimatedTotal (number), currency (string, default "UZS"), items (array of objects: id (string), name (string), amount (string), estimatedPrice (number), category (string), checked (false)).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'shopping_list', 'success');
    return { ...fallbackList, ...parsed };
  } catch (err: any) {
    console.error('Error generating shopping list with Gemini:', err);
    db.logAiUsage(user.id, 'shopping_list', 'error', err?.message);
    return fallbackList;
  }
}

// ==========================================
// --- MOM MODULE AI FUNCTIONS ---
// ==========================================

/**
 * 1. Mom: Dinner Ideas from fridge products or photo
 */
export async function generateMomDinnerIdeas(
  user: User,
  params: {
    productsText?: string;
    photoBase64?: string;
    portions?: number;
    budgetUZS?: number;
    preferences?: string;
  }
): Promise<any[]> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const profileContext = buildUserProfileContext(user);
  const mom = user.profile;

  const fallbackIdeas = [
    {
      title: lang === 'uz' ? 'Tovuq va sabzavotli dimlama' : lang === 'en' ? 'Lean Chicken & Veggie Skillet' : 'Нежное куриное филе с овощами на сковороде',
      prepTime: '20 мин',
      calories: 340,
      portionGrams: 300,
      proteins: 34,
      fats: 8,
      carbs: 22,
      ingredients: [
        'Куриное филе 350 г',
        'Кабачок или брокколи 250 г',
        'Морковь 1 шт (100 г)',
        'Сметана 10% или натуральный йогурт 2 ст. л.',
        'Чеснок и укроп',
      ],
      steps: [
        'Нарежьте куриное филе кубиками и обжарьте на сухой сковороде 5 минут.',
        'Добавьте нарезанные кабачок и морковь соломкой, тушите под крышкой 10 минут.',
        'Заправьте ложкой легкой сметаны с зеленью и чесноком, выключите огонь и дайте настояться 3 минуты.',
      ],
      budgetNote: 'Очень экономично: базовые доступные овощи и куриное филе',
      forMomTip: 'Для мамы: без добавления масла, порция 300г идеальна для вечернего жиросжигания.',
    },
    {
      title: lang === 'uz' ? 'Tvorog va ko‘katli issiq fitnes-quymoq' : lang === 'en' ? 'Cottage Cheese & Herb Frittata' : 'Пышный белковый омлет с творогом и томатами',
      prepTime: '15 мин',
      calories: 290,
      portionGrams: 260,
      proteins: 28,
      fats: 11,
      carbs: 12,
      ingredients: [
        'Яйца куриные 3 шт (1 целое + 2 белка для мамы)',
        'Творог 5% 100 г',
        'Помидоры 1 шт',
        'Свежая зелень (петрушка, зеленый лук)',
      ],
      steps: [
        'Взбейте яйца венчиком, добавьте творог и мелко порубленную зелень.',
        'Помидор нарежьте кружочками и выложите на дно теплой сковороды.',
        'Залейте творожно-яичной смесью, накройте крышкой и томите на минимальном огне 10 минут.',
      ],
      budgetNote: 'Бюджетный ужин из базовых продуктов из холодильника',
      forMomTip: 'Богат медленным белком (казеином), предотвращает ночной голод.',
    },
  ];

  if (!ai) {
    db.logAiUsage(user.id, 'mom_dinner_ideas', 'success');
    return fallbackIdeas;
  }

  try {
    const prompt = `You are an elite Family Nutritionist helping a mom who is on a healthy weight loss plan.
Generate 2-3 delicious, family-friendly, budget-conscious dinner ideas from what's available at home.
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Mom's Health Profile: ${profileContext}
Input products available: "${params.productsText || 'Курица, яйца, овощи, творог, крупы'}"
Portions needed: ${params.portions || mom.familyMembersCount || 3}
User target budget note: ${params.budgetUZS ? params.budgetUZS + ' UZS' : 'economical family dinner'}
Preferences: "${params.preferences || mom.momPreferences?.join(', ') || 'быстро, без жарки в масле'}"

Return JSON array of 2-3 dinner objects with EXACT structure:
[{
  "title": "string",
  "prepTime": "string (e.g. 15-20 мин)",
  "calories": number (approx kcal per mom's serving),
  "portionGrams": number,
  "proteins": number,
  "fats": number,
  "carbs": number,
  "ingredients": ["string with exact grams, e.g. Куриное филе 300г"],
  "steps": ["step 1...", "step 2...", "step 3..."],
  "budgetNote": "string explaining why this is affordable",
  "forMomTip": "specific weight-loss tip for mom (portion control, sauce adjustments)"
}]`;

    let response;
    if (params.photoBase64) {
      const cleanBase64 = params.photoBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
            { text: prompt + '\nNotice the ingredients in the uploaded photo of the fridge/kitchen counter.' },
          ],
        },
        config: { responseMimeType: 'application/json' },
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
    }

    const parsed = JSON.parse(response.text || '[]');
    db.logAiUsage(user.id, 'mom_dinner_ideas', 'success');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackIdeas;
  } catch (err: any) {
    console.error('Error generating mom dinner ideas:', err);
    db.logAiUsage(user.id, 'mom_dinner_ideas', 'error', err?.message);
    return fallbackIdeas;
  }
}

/**
 * 2. Mom: Child Activities (Safe developmental & physical movement games)
 */
export async function generateMomChildActivities(
  user: User,
  params: {
    ageGroup?: string;
    durationMinutes?: number;
    location?: 'home' | 'outdoor';
    category?: 'movement' | 'development' | 'calm';
  }
): Promise<any[]> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const age = params.ageGroup || user.profile.childAge || '3-4 года';
  const duration = params.durationMinutes || 20;
  const loc = params.location || 'home';
  const cat = params.category || 'movement';

  const fallbackActivities = [
    {
      title: lang === 'uz' ? 'Qahramonlar to‘siqlar yo‘lagi' : lang === 'en' ? 'Living Room Obstacle Adventure' : '«Полоса препятствий для супергероя»',
      ageGroup: age,
      durationMinutes: duration,
      location: loc,
      category: cat,
      instructions: [
        'Разложите на полу диванные подушки («кочки на болоте»).',
        'Протяните шарф или ленту между двумя стульями («лазерный луч»), под которым нужно аккуратно проползти.',
        'Положите обруч или полотенце — финишную базу, куда нужно доставить 3 игрушки по очереди.',
      ],
      materialsNeeded: ['2-3 подушки', 'Шарф или лента', '2 стула', 'Любимые мягкие игрушки'],
      benefits: 'Развивает вестибулярный аппарат, ловкость, крупную моторику и координацию движений.',
      safetyNote: 'Уберите скользкие носки и острые углы. Играть только на ковре или мягком покрытии под присмотром мамы.',
    },
    {
      title: lang === 'uz' ? 'Rangli ovchilar' : lang === 'en' ? 'Color Detective Quest' : '«Цветной детектив»',
      ageGroup: age,
      durationMinutes: duration,
      location: loc,
      category: 'development',
      instructions: [
        'Мама называет цвет (например, «Ищем всё желтое!»).',
        'Ребенок бегает по комнате и приносит 5 безопасных предметов этого цвета в корзинку за отведенное время.',
        'Затем считаем вместе вслух и переходим к следующему цвету.',
      ],
      materialsNeeded: ['Корзинка или коробка', 'Бытовые безопасные предметы разных цветов'],
      benefits: 'Изучение цветов, счет предметов, внимание и активное движение.',
      safetyNote: 'Исключить мелкие детали (до 3 лет) и бьющиеся предметы.',
    },
  ];

  if (!ai) {
    db.logAiUsage(user.id, 'mom_child_activities', 'success');
    return fallbackActivities;
  }

  try {
    const prompt = `You are a certified child play therapist and pediatric movement coach.
Generate 2 safe, engaging, joyful activities for a child.
Strict guidelines:
- Child age: ${age}
- Target duration: ${duration} minutes (must fit exactly into ${duration} min)
- Location: ${loc === 'home' ? 'Home indoors' : 'Outdoors (park/playground)'}
- Focus: ${cat === 'movement' ? 'Active movement & physical agility' : cat === 'development' ? 'Cognitive development & sensory play' : 'Calm creative focus'}
- Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}
- SAFETY RULE: DO NOT provide medical diagnoses or medical treatment advice. Recommend only safe, family-friendly, positive games with clear adult supervision.

Return JSON array of 2 activity objects with EXACT keys:
[{
  "title": "string",
  "ageGroup": "${age}",
  "durationMinutes": ${duration},
  "location": "${loc}",
  "category": "${cat}",
  "instructions": ["step 1...", "step 2...", "step 3..."],
  "materialsNeeded": ["household item 1", "household item 2"],
  "benefits": "string explaining developmental/movement value",
  "safetyNote": "string with crucial safety reminder"
}]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '[]');
    db.logAiUsage(user.id, 'mom_child_activities', 'success');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackActivities;
  } catch (err: any) {
    console.error('Error generating child activities:', err);
    db.logAiUsage(user.id, 'mom_child_activities', 'error', err?.message);
    return fallbackActivities;
  }
}

/**
 * 3. Mom: Family Menu - "One dish for the entire family" with mom calorie/goal adjustments
 */
export async function generateMomFamilyMenu(
  user: User,
  params: {
    mealType?: 'breakfast' | 'lunch' | 'dinner';
    familySize?: number;
    preferences?: string;
  }
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const profileContext = buildUserProfileContext(user);
  const size = params.familySize || user.profile.familyMembersCount || 3;
  const meal = params.mealType || 'dinner';

  const fallbackMenu = {
    title: lang === 'uz' ? 'Butun oila uchun pishirilgan tovuq va kartoshka/brokkoli' : lang === 'en' ? 'Family Roasted Herb Chicken with Dual Sides' : 'Запеченное филе с травами и раздельными гарнирами для мамы и семьи',
    mealType: meal,
    momDish: {
      name: 'Легкая порция для мамы (дефицит калорий)',
      calories: 350,
      proteins: 38,
      fats: 8,
      carbs: 24,
      portionGrams: 300,
      customTips: 'Для мамы: чистое филе со специями без майонеза, гарнир — брокколи на пару + 50г печеного картофеля.',
    },
    familyDish: {
      name: 'Сытная семейная порция',
      standardPortionGrams: 450,
      familyServings: size - 1 || 2,
      servingTips: 'Для папы и детей: куриное филе с золотистой сырной корочкой, щедрая порция запеченного картофеля со сливочным маслом.',
    },
    sharedIngredients: [
      'Куриное филе 800 г',
      'Картофель молодой 600 г',
      'Брокколи или цветная капуста 400 г',
      'Сыр сулугуни или легкий 70 г (для семейной части)',
      'Оливковое масло 1 ст. л.',
      'Прованские травы, паприка, чеснок',
    ],
    onePotInstructions: [
      '1. Подготовка: все куриное филе маринуем вместе в паприке, чесноке и соли без жирных соусов.',
      '2. Выкладка на противень: на одну половину противня кладем картофель кубиками (для семьи), на другую — брокколи (для мамы). По центру — все филе.',
      '3. Запекание: ставим в духовку при 190°C на 25 минут.',
      '4. Разделение: за 5 минут до готовности семейную часть картофеля и 2 филе посыпаем сыром, а мамину порцию оставляем чистой с зеленью!',
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_family_menu', 'success');
    return fallbackMenu;
  }

  try {
    const prompt = `You are a family chef and clinical dietitian specializing in helping busy mothers lose weight without cooking separate meals for everyone.
Design a "One Dish for the Entire Family" recipe where the base meal is cooked simultaneously, but portioned and adjusted intelligently for:
1. Mom: strict healthy caloric deficit (~300-400 kcal, high protein, clean carbs/veggies).
2. Family (${size} members total): hearty, delicious standard portions satisfying husband/kids.
Meal type: ${meal}.
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Mom's Profile: ${profileContext}
Family size: ${size} people.
Preferences: "${params.preferences || user.profile.momPreferences?.join(', ') || 'простые сезонные продукты'}"

Return JSON object with EXACT keys:
{
  "title": "string (dish title)",
  "mealType": "${meal}",
  "momDish": {
    "name": "string",
    "calories": number,
    "proteins": number,
    "fats": number,
    "carbs": number,
    "portionGrams": number,
    "customTips": "exact guidance how mom modifies her plate"
  },
  "familyDish": {
    "name": "string",
    "standardPortionGrams": number,
    "familyServings": number,
    "servingTips": "guidance for family plate"
  },
  "sharedIngredients": ["string with total grams for all family"],
  "onePotInstructions": ["step 1...", "step 2...", "step 3..."]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_family_menu', 'success');
    return { ...fallbackMenu, ...parsed };
  } catch (err: any) {
    console.error('Error generating mom family menu:', err);
    db.logAiUsage(user.id, 'mom_family_menu', 'error', err?.message);
    return fallbackMenu;
  }
}

/**
 * 4. Mom: Weekly Shopping List categorized with family size & budget
 */
export async function generateMomWeeklyShopping(
  user: User,
  params: {
    familyMembersCount?: number;
    budgetUZS?: number;
    preferences?: string;
  }
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const size = params.familyMembersCount || user.profile.familyMembersCount || 3;
  const budget = params.budgetUZS || user.profile.maxWeeklyBudget || 450000;

  const fallbackShopping = {
    title: lang === 'uz' ? `${size} kishilik oilaviy 1 haftalik xarid` : lang === 'en' ? `Weekly Family Grocery (${size} members)` : `Семейная закупка на неделю (${size} чел.)`,
    familyMembersCount: size,
    weeklyBudget: budget,
    estimatedTotal: Math.min(budget, 415000),
    currency: 'UZS',
    items: [
      { id: '1', name: 'Куриное филе и бедра (охлажденные)', amount: '2.5 кг', estimatedPrice: 125000, category: 'Мясо и птица', checked: false },
      { id: '2', name: 'Фарш говяжий нежирный', amount: '800 г', estimatedPrice: 65000, category: 'Мясо и птица', checked: false },
      { id: '3', name: 'Яйца куриные отборные', amount: '3 дес.', estimatedPrice: 42000, category: 'Молочные продукты и яйца', checked: false },
      { id: '4', name: 'Творог 5% и молоко 2.5%', amount: '1 кг + 2 л', estimatedPrice: 48000, category: 'Молочные продукты и яйца', checked: false },
      { id: '5', name: 'Овсяные хлопья «Геркулес» и гречка', amount: '1.5 кг', estimatedPrice: 28000, category: 'Крупы и макароны', checked: false },
      { id: '6', name: 'Картофель и морковь', amount: '3 кг', estimatedPrice: 24000, category: 'Овощи и зелень', checked: false },
      { id: '7', name: 'Капуста, огурцы, томаты, зелень', amount: '2.5 кг', estimatedPrice: 38000, category: 'Овощи и зелень', checked: false },
      { id: '8', name: 'Яблоки сезонные и бананы', amount: '2 кг', estimatedPrice: 35000, category: 'Фрукты', checked: false },
      { id: '9', name: 'Оливковое или подсолнечное масло', amount: '1 бут.', estimatedPrice: 18000, category: 'Бакалея', checked: false },
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_shopping', 'success');
    return fallbackShopping;
  }

  try {
    const prompt = `Generate a realistic, healthy weekly family grocery shopping list in local currency (UZS).
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Family size: ${size} people (adults and children).
Target weekly budget: ${budget} UZS.
Preferences: "${params.preferences || 'сбалансированное питание, доступные продукты, овощи, белок'}".

Group items by clear categories:
- "Мясо и птица" (Meat)
- "Молочные продукты и яйца" (Dairy & Eggs)
- "Овощи и зелень" (Vegetables)
- "Фрукты и ягоды" (Fruits)
- "Крупы и бакалея" (Grains & Pantry)

Ensure estimatedTotal is close to and preferably below ${budget} UZS.
Return JSON with EXACT keys:
{
  "title": "string",
  "familyMembersCount": ${size},
  "weeklyBudget": ${budget},
  "estimatedTotal": number,
  "currency": "UZS",
  "items": [
    { "id": "string", "name": "string", "amount": "string", "estimatedPrice": number, "category": "string", "checked": false }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_shopping', 'success');
    return { ...fallbackShopping, ...parsed };
  } catch (err: any) {
    console.error('Error generating mom weekly shopping:', err);
    db.logAiUsage(user.id, 'mom_shopping', 'error', err?.message);
    return fallbackShopping;
  }
}

/**
 * 5. Mom: Family Food Budget Planner & Optimizer
 */
export async function optimizeMomBudget(
  user: User,
  params: {
    maxMonthlyBudget?: number;
    maxWeeklyBudget?: number;
    currentItems?: any[];
  }
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const size = user.profile.familyMembersCount || 3;
  const weekly = params.maxWeeklyBudget || user.profile.maxWeeklyBudget || 450000;
  const monthly = params.maxMonthlyBudget || user.profile.maxMonthlyBudget || weekly * 4;

  const fallbackBudget = {
    weeklyBudget: weekly,
    monthlyBudget: monthly,
    estimatedWeeklyExpenses: Math.round(weekly * 0.92),
    estimatedMonthlyExpenses: Math.round(monthly * 0.92),
    currency: 'UZS',
    savingsRecommendations: [
      'Покупайте курицу целиком вместо разделанного филе: из грудки готовьте ужины для мамы, а из ножек и крыльев — супы для всей семьи (экономия до 25%).',
      'Замените дорогие импортные салатные листья на сезонную капусту, морковь и свеклу — в них больше клетчатки и витаминов при втрое меньшей цене.',
      'Крупы (гречка, овсянка, перловка) берите в больших упаковках по 1-2 кг на оптовом рынке.',
      'Замораживайте сезонные ягоды и зелень летом/осенью для круглогодичной экономии.',
    ],
    optimizedItems: [
      { original: 'Стейки лосося или импортная рыба', replacement: 'Судак, минтай или речная рыба', savings: '-80 000 UZS/кг' },
      { original: 'Готовые детские творожки с сахаром', replacement: 'Натуральный творог 5% + свежий банан', savings: '-35 000 UZS/нед' },
      { original: 'Сладкие магазинные соусы и заправки', replacement: 'Греческий йогурт с чесноком и укропом', savings: '-20 000 UZS/нед' },
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_budget_optimizer', 'success');
    return fallbackBudget;
  }

  try {
    const prompt = `You are a financial family advisor and smart grocery nutrition optimizer.
Help a family of ${size} people optimize their food budget.
Max Target Monthly Budget: ${monthly} UZS.
Max Target Weekly Budget: ${weekly} UZS.
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.

Provide actionable, practical savings recommendations and direct smart ingredient swaps that reduce expenses without compromising high-quality protein, fresh vitamins, or children's healthy development.
Return JSON with EXACT keys:
{
  "weeklyBudget": ${weekly},
  "monthlyBudget": ${monthly},
  "estimatedWeeklyExpenses": number,
  "estimatedMonthlyExpenses": number,
  "currency": "UZS",
  "savingsRecommendations": ["tip 1", "tip 2", "tip 3", "tip 4"],
  "optimizedItems": [
    { "original": "expensive item", "replacement": "smart nutritious alternative", "savings": "estimated savings in UZS" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_budget_optimizer', 'success');
    return { ...fallbackBudget, ...parsed };
  } catch (err: any) {
    console.error('Error optimizing mom budget:', err);
    db.logAiUsage(user.id, 'mom_budget_optimizer', 'error', err?.message);
    return fallbackBudget;
  }
}

/**
 * 6. Mom: Quick Recipes filtered by 10 / 15 / 20 / 30 minutes
 */
export async function generateMomQuickRecipes(
  user: User,
  params: {
    timeMinutes: 10 | 15 | 20 | 30;
    mealType?: string;
  }
): Promise<any[]> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const time = params.timeMinutes || 15;
  const meal = params.mealType || 'ужин';

  const fallbackList = [
    {
      title: time <= 10
        ? (lang === 'uz' ? '10 daqiqalik tvorogli fitnes-desert' : lang === 'en' ? '10-Min Protein Berry Whip' : '10-минутный творожный мусс с ягодами')
        : (lang === 'uz' ? 'Tovuqli tezkor dimlama' : lang === 'en' ? 'Quick Chicken Stir-Fry' : 'Быстрый куриный стир-фрай с овощами'),
      timeMinutes: time,
      mealType: meal,
      calories: time <= 10 ? 210 : 340,
      ingredientsCount: 4,
      ingredients: time <= 10
        ? ['Творог 5% 150г', 'Натуральный йогурт 50г', 'Ягоды или банан 60г', 'Щепотка корицы']
        : ['Куриное филе 200г', 'Замороженные овощи 200г', 'Соевый соус 1 ст. л.', 'Капля кунжутного масла'],
      steps: time <= 10
        ? [
            'Выложите творог и йогурт в чашу блендера.',
            'Взбейте 1 минуту до кремовой текстуры.',
            'Украсьте ягодами и корицей. Готово моментально!',
          ]
        : [
            'Нарежьте курицу тонкими полосками.',
            'Обжарьте на сухой раскаленной сковороде 4 минуты.',
            'Всыпьте овощи, сбрызните соевым соусом и тушите под крышкой еще 5 минут.',
          ],
    },
    {
      title: lang === 'uz' ? 'Tuxumli lavaş ruleti' : lang === 'en' ? 'Warm Protein Egg Wrap' : 'Теплый белковый ролл в лаваше за ' + time + ' минут',
      timeMinutes: time,
      mealType: meal,
      calories: 280,
      ingredientsCount: 4,
      ingredients: ['Тонкий армянский лаваш 40г', 'Яйца 2 шт', 'Листья салата и огурец', 'Сыр легкий 20г'],
      steps: [
        'Взбейте яйца и обжарьте тонкий блинчик-омлет на сковороде 3 минуты.',
        'Выложите омлет на лист лаваша, посыпьте тертым сыром и зеленью.',
        'Сверните в плотный ролл и прогрейте 1 минуту на сухой сковороде до хруста.',
      ],
    },
  ];

  if (!ai) {
    db.logAiUsage(user.id, 'mom_quick_recipes', 'success');
    return fallbackList;
  }

  try {
    const prompt = `You are a quick-meal chef designing lifesaver recipes for busy mothers.
Strict requirement: Preparation and cooking MUST take NO MORE than ${time} minutes in total!
Meal category: ${meal}.
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Goal: weight-loss friendly, low dirty dishes (one-pan), easily accessible ingredients (4-6 ingredients max).

Return JSON array of 2-3 recipes with EXACT structure:
[
  {
    "title": "string",
    "timeMinutes": ${time},
    "mealType": "${meal}",
    "calories": number,
    "ingredientsCount": number,
    "ingredients": ["exact ingredient with grams"],
    "steps": ["step 1...", "step 2...", "step 3..."]
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '[]');
    db.logAiUsage(user.id, 'mom_quick_recipes', 'success');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackList;
  } catch (err: any) {
    console.error('Error generating quick recipes:', err);
    db.logAiUsage(user.id, 'mom_quick_recipes', 'error', err?.message);
    return fallbackList;
  }
}

/**
 * 7. Mom: Plate Photo Analysis with Goal-Adaptation Guidance & Approximate Values Disclaimer
 */
export async function analyzeMomFoodPhoto(
  user: User,
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const fallbackAnalysis = {
    dishName: lang === 'uz' ? 'Go‘shtli va sabzavotli taom' : lang === 'en' ? 'Home-Cooked Meat & Veggie Plate' : 'Домашнее мясное блюдо с гарниром',
    portionSize: '320 г (примерно)',
    calories: 420,
    proteins: 32,
    fats: 16,
    carbs: 38,
    detectedIngredients: ['Мясной компонент (курица/говядина)', 'Углеводный гарнир', 'Соус/масло', 'Овощи'],
    goalAdaptationTips:
      lang === 'uz'
        ? 'Vazn yo‘qotish uchun: taomdagi yog‘li qaylani (sous) kamaytiring, garnirning yarmini yangi bodring va ko‘katlarga almashtiring. Bu taomdan 120-150 kkal tejaydi!'
        : lang === 'en'
        ? 'To fit your weight-loss goal: halve the heavy sauce, replace 1/3 of the carb side with crisp cucumber/greens. This easily cuts 130 kcal while keeping you full.'
        : 'Как адаптировать под цель похудения: уберите майонезный соус или замените его йогуртом (-120 ккал), уменьшите порцию картофеля/макарон на треть и добавьте большую горсть свежей зелени или капустного салата.',
    disclaimer:
      lang === 'uz'
        ? 'Diqqat: barcha kaloriya va oqsil/yog‘/uglevod ko‘rsatkichlari taxminiy bo‘lib, ovqatlanishni umumiy nazorat qilish uchun mo‘ljallangan.'
        : lang === 'en'
        ? 'Note: All calorie and macronutrient values are approximate estimates to guide your daily intake.'
        : 'Обратите внимание: все расчеты калорийности и БЖУ являются приблизительными и служат ориентиром для контроля рациона.',
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_food_photo', 'success');
    return fallbackAnalysis;
  }

  try {
    const prompt = `You are a specialist in maternal nutrition and AI food computer vision.
Analyze this meal photograph taken by a mother trying to lose weight.
Respond strictly in ${lang === 'uz' ? 'Uzbek language' : lang === 'en' ? 'English language' : 'Russian language'}.

Tasks:
1. Identify the likely dish name.
2. Estimate the approximate portion size in grams (e.g. "300 г").
3. Estimate approximate calories (kcal), proteins (g), fats (g), carbohydrates (g).
4. List the detected ingredients.
5. Provide actionable, practical advice on **how to make this dish more suited for mom's weight loss goal** (e.g., how to reduce hidden fats, adjust portion balance, swap sides, or save calories for dessert).
6. Mandatory disclaimer stating that all computer vision nutritional values are approximate.

Return ONLY valid JSON matching this schema:
{
  "dishName": "string",
  "portionSize": "string",
  "calories": number,
  "proteins": number,
  "fats": number,
  "carbs": number,
  "detectedIngredients": ["string 1", "string 2"],
  "goalAdaptationTips": "string with specific actionable tweaks to reduce calories without hunger",
  "disclaimer": "string stating that values are approximate estimates"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: mimeType || 'image/jpeg' } },
          { text: prompt },
        ],
      },
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_food_photo', 'success');
    return {
      dishName: parsed.dishName || fallbackAnalysis.dishName,
      portionSize: parsed.portionSize || fallbackAnalysis.portionSize,
      calories: Number(parsed.calories) || fallbackAnalysis.calories,
      proteins: Number(parsed.proteins) || fallbackAnalysis.proteins,
      fats: Number(parsed.fats) || fallbackAnalysis.fats,
      carbs: Number(parsed.carbs) || fallbackAnalysis.carbs,
      detectedIngredients: Array.isArray(parsed.detectedIngredients) ? parsed.detectedIngredients : fallbackAnalysis.detectedIngredients,
      goalAdaptationTips: parsed.goalAdaptationTips || fallbackAnalysis.goalAdaptationTips,
      disclaimer: parsed.disclaimer || fallbackAnalysis.disclaimer,
    };
  } catch (err: any) {
    console.error('Error analyzing mom food photo:', err);
    db.logAiUsage(user.id, 'mom_food_photo', 'error', err?.message);
    return fallbackAnalysis;
  }
}

/**
 * 8. Mom: "What to cook today?" (1 fast decision screen)
 */
export async function generateMomWhatToCookNow(
  user: User,
  params: {
    mealType: 'breakfast' | 'lunch' | 'dinner';
    availableTimeMinutes?: number;
    fridgeProducts?: string;
    budgetLevel?: string;
  }
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const meal = params.mealType || 'dinner';
  const time = params.availableTimeMinutes || 20;

  const fallbackDish = {
    mealType: meal,
    dish: meal === 'breakfast'
      ? (lang === 'uz' ? 'Pishloqli va pomidorli fitnes quymoq' : lang === 'en' ? 'Cheese & Tomato Protein Omelette' : 'Фитнес-омлет с помидорами и зеленью')
      : meal === 'lunch'
      ? (lang === 'uz' ? 'Tovuq filesi va grechka' : lang === 'en' ? 'Buckwheat Bowl with Grilled Chicken' : 'Гречневый боул с отварной куриной грудкой и овощами')
      : (lang === 'uz' ? 'Tuxum va sabzavotli yengil tovuq dimlamasi' : lang === 'en' ? 'Pan-Seared White Fish or Chicken with Steamed Veggies' : 'Запеченное куриное филе под йогуртовым соусом с кабачками'),
    timeMinutes: time,
    calories: meal === 'breakfast' ? 290 : meal === 'lunch' ? 440 : 360,
    ingredients: [
      'Куриное филе 200г',
      'Кабачок или брокколи 200г',
      'Греческий йогурт 2 ст. л.',
      'Чеснок, соль, паприка',
    ],
    instructions: [
      '1. Нарежьте курицу и овощи одинаковыми кубиками.',
      '2. Перемешайте в миске с йогуртом и паприкой.',
      '3. Выложите в сковороду или форму и запекайте/тушите ровно ' + time + ' минут.',
    ],
    whyItFitsGoal: 'Высокое содержание чистого белка насыщает на 4 часа и ускоряет ночной метаболизм.',
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_what_to_cook', 'success');
    return fallbackDish;
  }

  try {
    const prompt = `You are an instant meal decision assistant for a mother.
The user wants ONE clear, definitive, ready-to-cook dish recommendation for right now!
Selected Meal: ${meal.toUpperCase()}.
Available time: ${time} minutes.
Products at home: "${params.fridgeProducts || 'обычные продукты из холодильника: яйца, курица, овощи, крупы, творог'}".
Budget: ${params.budgetLevel || 'доступный семейный'}.
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Mom's Profile: ${buildUserProfileContext(user)}

Return JSON with EXACT keys:
{
  "mealType": "${meal}",
  "dish": "string (dish title)",
  "timeMinutes": ${time},
  "calories": number,
  "ingredients": ["item with grams 1", "item with grams 2"],
  "instructions": ["step 1...", "step 2...", "step 3..."],
  "whyItFitsGoal": "one clear sentence on why this perfectly suits mom's fat-loss goal"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_what_to_cook', 'success');
    return { ...fallbackDish, ...parsed };
  } catch (err: any) {
    console.error('Error in what to cook today:', err);
    db.logAiUsage(user.id, 'mom_what_to_cook', 'error', err?.message);
    return fallbackDish;
  }
}

/**
 * 9. Mom: Family Day Plan (All-in-one daily schedule)
 */
export async function generateMomDayPlan(
  user: User,
  params: {
    childAge?: string;
    familySize?: number;
    preferences?: string;
  }
): Promise<any> {
  const ai = getAiClient();
  const lang = user.language || 'ru';
  const age = params.childAge || user.profile.childAge || '3-4 года';
  const size = params.familySize || user.profile.familyMembersCount || 3;

  const fallbackDayPlan = {
    breakfast: {
      dish: lang === 'uz' ? "Tvorogli quymoq va rezavorlar" : lang === 'en' ? 'Fluffy Cottage Cheese Pancakes' : 'Творожные сырники без сахара со свежими ягодами',
      momCal: 320,
      familyTip: 'Для семьи: подайте со сметаной и медом. Для мамы: с греческим йогуртом и корицей.',
    },
    lunch: {
      dish: lang === 'uz' ? "Tovuqli engil sho‘rva va butun donli non" : lang === 'en' ? 'Clear Chicken Noodle & Veggie Soup' : 'Домашний легкий куриный суп с овощами и зеленью',
      momCal: 380,
      familyTip: 'Сытно для ребенка и мужа, для мамы — двойная порция белка и зелени без избытка лапши.',
    },
    dinner: {
      dish: lang === 'uz' ? "Dimlangan baliq yoki kurka filesi sabzavotlar bilan" : lang === 'en' ? 'Baked Turkey & Colorful Roasted Veggies' : 'Запеченное филе индейки с цветной капустой и морковью',
      momCal: 340,
      familyTip: 'Одно блюдо в духовке: маме овощи аль-денте, семье дополнительно отварной рис.',
    },
    snack: {
      dish: lang === 'uz' ? "Yashil olma va bodom" : lang === 'en' ? 'Green Apple & Almonds' : 'Зеленое яблоко и 15г миндаля',
      momCal: 160,
      familyTip: 'Полезный перекус на прогулке для мамы и ребенка.',
    },
    childActivity: {
      title: lang === 'uz' ? "Qiziqarli to‘siqlar o‘yini (20 daqiqa)" : lang === 'en' ? 'Living Room Treasure Quest (20 min)' : '«Поиски сокровищ в гостиной» (20 мин)',
      duration: '20 мин',
      desc: 'Прячем 3 мягкие игрушки, ребенок ищет по подсказкам «горячо/холодно». Развивает внимание и движение!',
    },
    shoppingChecklist: [
      { id: '1', text: 'Творог 5% 400 г', done: false },
      { id: '2', text: 'Филе курицы или индейки 700 г', done: false },
      { id: '3', text: 'Свежая зелень и брокколи', done: false },
      { id: '4', text: 'Зеленые яблоки 1 кг', done: false },
    ],
  };

  if (!ai) {
    db.logAiUsage(user.id, 'mom_day_plan', 'success');
    return fallbackDayPlan;
  }

  try {
    const prompt = `You are a family lifestyle & fitness architect for mothers.
Generate an All-In-One Unified Day Plan for Mom and Family (${size} people, child age: ${age}).
Language: ${lang === 'uz' ? 'Uzbek' : lang === 'en' ? 'English' : 'Russian'}.
Mom's Profile: ${buildUserProfileContext(user)}

Requirements:
- Breakfast (healthy, quick, dual family adaptation)
- Lunch (comfort family meal with mom calorie control)
- Dinner (one-pan or oven dish for all)
- Snack (portable, healthy)
- Child Activity (safe, joyful, developmental game)
- Shopping Checklist (4-6 key grocery items needed for this day)

Return JSON with EXACT keys:
{
  "breakfast": { "dish": "string", "momCal": number, "familyTip": "string" },
  "lunch": { "dish": "string", "momCal": number, "familyTip": "string" },
  "dinner": { "dish": "string", "momCal": number, "familyTip": "string" },
  "snack": { "dish": "string", "momCal": number, "familyTip": "string" },
  "childActivity": { "title": "string", "duration": "string", "desc": "string" },
  "shoppingChecklist": [
    { "id": "string", "text": "string", "done": false }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    db.logAiUsage(user.id, 'mom_day_plan', 'success');
    return { ...fallbackDayPlan, ...parsed };
  } catch (err: any) {
    console.error('Error generating mom day plan:', err);
    db.logAiUsage(user.id, 'mom_day_plan', 'error', err?.message);
    return fallbackDayPlan;
  }
}

