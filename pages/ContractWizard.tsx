import React, { useState, useEffect } from 'react';
import { ContractTemplate, SignerInfo } from '../types';
import { Button } from '../components/ui/Button';
import { SignaturePad } from '../components/SignaturePad';
import { backendService } from '../services/mockBackend';
import { pdfService } from '../services/pdfService';
import { ChevronLeft, ChevronRight, CheckCircle, FileText, User, PenTool, Check } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, title: '계약서 선택', icon: FileText },
  { id: 2, title: '회원 정보', icon: User },
  { id: 3, title: '서명 및 완료', icon: PenTool },
];

export const ContractWizard: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  
  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [signer, setSigner] = useState<SignerInfo>({
    name: '',
    phone: '',
    email: '',
    address: '',
    dob: ''
  });
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    backendService.getTemplates().then(setTemplates);
  }, []);

  const handleSign = async () => {
    if (!selectedTemplate || !signature || !agreed) return;
    
    setLoading(true);
    try {
      // 1. Generate PDF (Note: PDF content is in English for demo stability)
      const pdfDataUrl = await pdfService.generateContractPDF(selectedTemplate, signer, signature);
      
      // 2. Save to Backend
      await backendService.saveSignedContract({
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        signerName: signer.name,
        signerPhone: signer.phone,
        signerEmail: signer.email,
        signedAt: new Date().toISOString(),
        pdfDataUrl: pdfDataUrl
      });

      // 3. Complete
      onComplete();
    } catch (error) {
      console.error("Signing failed", error);
      alert("계약 처리에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return !!selectedTemplate;
      case 2: return !!signer.name && !!signer.phone && isValidEmail(signer.email) && !!signer.address;
      case 3: return !!signature && agreed;
      default: return false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 font-sans">
      {/* Header / Stepper */}
      <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 z-10 sticky top-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-stone-900 serif">전자 계약서 작성</h1>
            <Button variant="outline" size="sm" onClick={onCancel} className="border-stone-200 text-stone-500">취소</Button>
          </div>
          
          <div className="flex justify-between relative px-2">
            {/* Progress Bar Background */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-stone-200 -z-10 -translate-y-1/2"></div>
            {/* Active Progress */}
            <div 
              className="absolute top-1/2 left-0 h-px bg-stone-800 -z-10 -translate-y-1/2 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>

            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 shadow-sm
                    ${isActive ? 'border-stone-800 bg-stone-800 text-stone-50 scale-110' : 
                      isCompleted ? 'border-stone-800 bg-white text-stone-800' : 'border-stone-200 bg-white text-stone-300'}
                  `}>
                    {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} strokeWidth={2} />}
                  </div>
                  <span className={`text-xs mt-3 font-medium tracking-wide ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg shadow-stone-200/50 border border-stone-100 p-10 min-h-[500px]">
          
          {/* Step 1: Select Template */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-stone-900 serif mb-2">진행하실 계약을 선택해주세요</h2>
                <p className="text-stone-500 text-sm">회원님께 해당하는 계약서 종류를 선택해 주십시오.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-6 text-left border rounded-lg transition-all duration-200 group relative overflow-hidden
                      ${selectedTemplate?.id === tpl.id 
                        ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800 shadow-md' 
                        : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/50'
                      }`}
                  >
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <h3 className={`font-bold text-lg ${selectedTemplate?.id === tpl.id ? 'text-stone-900' : 'text-stone-700'}`}>
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-stone-400 mt-2 uppercase tracking-wider">{tpl.type}</p>
                      </div>
                      {selectedTemplate?.id === tpl.id && <CheckCircle className="text-stone-800" size={24} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Information */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-900 serif mb-2">회원 정보 입력</h2>
                <p className="text-stone-500 text-sm">계약서 작성을 위해 정확한 정보를 입력해 주십시오.</p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">성함 (Name)</label>
                  <input 
                    type="text" 
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all placeholder:text-stone-300"
                    placeholder="홍길동"
                    value={signer.name}
                    onChange={e => setSigner({...signer, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">연락처 (Phone)</label>
                  <input 
                    type="tel" 
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all placeholder:text-stone-300"
                    placeholder="010-0000-0000"
                    value={signer.phone}
                    onChange={e => setSigner({...signer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">이메일 (Email)</label>
                  <input 
                    type="email" 
                    className={`w-full p-3.5 bg-stone-50 border rounded-lg focus:ring-2 outline-none transition-all placeholder:text-stone-300 ${
                      signer.email && !isValidEmail(signer.email) 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-stone-200 focus:ring-stone-800 focus:border-stone-800'
                    }`}
                    placeholder="example@email.com"
                    value={signer.email}
                    onChange={e => setSigner({...signer, email: e.target.value})}
                  />
                  {signer.email && !isValidEmail(signer.email) && (
                    <p className="text-[11px] text-red-500 pl-1 font-medium">유효한 이메일 주소를 입력해주세요.</p>
                  )}
                  <p className="text-[11px] text-stone-400 pl-1">완료된 계약서 사본이 발송될 이메일 주소입니다.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">생년월일 (Birth Date)</label>
                  <input 
                    type="date" 
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all text-stone-700"
                    value={signer.dob}
                    onChange={e => setSigner({...signer, dob: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">주소 (Address)</label>
                  <input 
                    type="text" 
                    className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all placeholder:text-stone-300"
                    placeholder="서울특별시 강남구..."
                    value={signer.address}
                    onChange={e => setSigner({...signer, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Sign */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-stone-900 serif mb-2">약관 동의 및 서명</h2>
                <p className="text-stone-500 text-sm">내용을 확인하신 후 서명해 주십시오.</p>
              </div>

              <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                 <h3 className="text-sm font-bold text-stone-800 mb-3 uppercase tracking-wider border-b border-stone-200 pb-2">이용 약관 및 동의</h3>
                 <div className="h-48 overflow-y-auto text-sm text-stone-600 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
                    <p><strong>제1조 (목적)</strong> 본 약관은 {selectedTemplate?.name}와 관련하여 회원의 권리와 의무를 규정함을 목적으로 합니다.</p>
                    <p><strong>제2조 (면책 조항)</strong> 회원은 시설 이용 중 본인의 부주의로 발생한 사고에 대해 센터에 책임을 묻지 않습니다.</p>
                    <p><strong>제3조 (환불 규정)</strong> 중도 해지 시 위약금 10%가 발생하며...</p>
                    <p className="text-stone-400 text-xs mt-4">* 본 내용은 예시 텍스트입니다. 실제 계약 내용은 관리자가 업로드한 PDF 템플릿에 따릅니다.</p>
                 </div>
                 
                 <div className="mt-6 pt-4 border-t border-stone-200">
                   <label className="flex items-center cursor-pointer gap-3 group">
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${agreed ? 'bg-stone-800 border-stone-800' : 'bg-white border-stone-300 group-hover:border-stone-500'}`}>
                       {agreed && <Check size={14} className="text-white" />}
                     </div>
                     <input 
                      type="checkbox" 
                      className="hidden"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                     />
                     <span className={`font-medium transition-colors ${agreed ? 'text-stone-900' : 'text-stone-600'}`}>
                       위 약관을 모두 확인하였으며 이에 동의합니다.
                     </span>
                   </label>
                 </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider">전자 서명</h3>
                  <span className="text-xs text-stone-400">아래 박스에 서명해 주세요</span>
                </div>
                <SignaturePad onEnd={setSignature} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer / Actions */}
      <div className="bg-white/90 backdrop-blur border-t border-stone-200 p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button 
            variant="secondary" 
            size="lg"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || loading}
            className="text-stone-500"
          >
            <ChevronLeft className="mr-1" size={18} /> 이전 단계
          </Button>

          {currentStep < 3 ? (
            <Button 
              size="lg"
              variant="primary"
              onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
              disabled={!isStepValid()}
            >
              다음 단계 <ChevronRight className="ml-1" size={18} />
            </Button>
          ) : (
            <Button 
              size="lg" 
              variant="primary"
              onClick={handleSign}
              disabled={!isStepValid() || loading}
              isLoading={loading}
              className="w-64 bg-stone-900 text-amber-50 shadow-stone-800/20"
            >
              {loading ? '처리 중...' : '계약 완료 및 서명'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};