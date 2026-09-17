export type Language = 'ru' | 'uz' | 'en';

export type AppTab =
  | 'home'
  | 'ai_trainer'
  | 'nutrition'
  | 'workouts'
  | 'food_photo'
  | 'progress'
  | 'recipes'
  | 'shopping'
  | 'mom'
  | 'profile'
  | 'premium'
  | 'admin';

export interface UserProfile {
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  weight?: number;
  targetWeight?: number;
  waist?: number;
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
  // Mom Mode Profile
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
  language: Language;
  isPremium: boolean;
  premiumUntil?: string;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
  profile: UserProfile;
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
  date: string;
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
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dishName: string;
  weightGrams: number;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  createdAt: string;
}

export interface ProgressLog {
  id: string;
  userId: string;
  date: string;
  weight: number;
  waist?: number;
  photoUrl?: string;
  notes?: string;
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
  receiptImage: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface AiChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// --- Mom Module Interfaces ---
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

export interface MomWhatToCook {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  dish: string;
  timeMinutes: number;
  calories: number;
  ingredients: string[];
  instructions: string[];
  whyItFitsGoal: string;
}

export interface MomDayPlan {
  id: string;
  userId: string;
  date: string;
  breakfast: { dish: string; momCal: number; familyTip: string };
  lunch: { dish: string; momCal: number; familyTip: string };
  dinner: { dish: string; momCal: number; familyTip: string };
  snack: { dish: string; momCal: number; familyTip: string };
  childActivity: { title: string; duration: string; desc: string };
  shoppingChecklist: Array<{ id: string; text: string; done: boolean }>;
  createdAt: string;
}
