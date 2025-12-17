import React, { useState } from 'react';
import { AdminDashboard } from './pages/AdminDashboard';
import { ContractWizard } from './pages/ContractWizard';
import { AppView } from './types';
import { CheckCircle } from 'lucide-react';

const App = () => {
  const [view, setView] = useState<AppView>('DASHBOARD');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleContractComplete = () => {
    setView('DASHBOARD');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <>
      {view === 'DASHBOARD' && (
        <AdminDashboard onStartContract={() => setView('WIZARD')} />
      )}
      
      {view === 'WIZARD' && (
        <ContractWizard 
          onComplete={handleContractComplete}
          onCancel={() => setView('DASHBOARD')}
        />
      )}

      {/* Global Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-8 right-8 bg-stone-900 text-stone-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 animate-bounce z-50 border border-stone-700">
          <CheckCircle size={24} className="text-emerald-400" />
          <div>
            <h4 className="font-bold text-sm">계약이 완료되었습니다</h4>
            <p className="text-stone-400 text-xs mt-0.5">회원님 이메일로 사본이 발송되었습니다.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default App;