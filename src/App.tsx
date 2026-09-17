import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { AiTrainerTab } from './components/AiTrainerTab';
import { NutritionTab } from './components/NutritionTab';
import { WorkoutsTab } from './components/WorkoutsTab';
import { FoodPhotoTab } from './components/FoodPhotoTab';
import { ProgressTab } from './components/ProgressTab';
import { ShoppingTab } from './components/ShoppingTab';
import { ProfileTab } from './components/ProfileTab';
import { MomTab } from './components/MomTab';
import { AdminPanel } from './components/AdminPanel';
import { OnboardingModal } from './components/OnboardingModal';
import { PaywallModal } from './components/PaywallModal';
import { PaymentModal } from './components/PaymentModal';

const MainContent: React.FC = () => {
  const { activeTab, toastMessage } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative select-none">
      {/* App Header */}
      <Header />

      {/* Main Tab Screen */}
      <main className="flex-1 w-full overflow-x-hidden">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'ai_trainer' && <AiTrainerTab />}
        {activeTab === 'nutrition' && <NutritionTab />}
        {activeTab === 'workouts' && <WorkoutsTab />}
        {activeTab === 'food_photo' && <FoodPhotoTab />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'shopping' && <ShoppingTab />}
        {activeTab === 'mom' && <MomTab />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Bottom Navigation (shown on all standard tabs) */}
      {activeTab !== 'admin' && <BottomNav />}

      {/* Global Modals */}
      <OnboardingModal />
      <PaywallModal />
      <PaymentModal />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-xl animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
