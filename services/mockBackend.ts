import { ContractTemplate, SignedContract } from '../types';

// Constants for LocalStorage keys
const STORAGE_KEYS = {
  TEMPLATES: 'signease_templates',
  CONTRACTS: 'signease_contracts',
};

// Initial Mock Data (Korean Context)
const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'tpl_001',
    name: '프리미엄 멤버십 가입 신청서',
    type: 'MEMBERSHIP',
    createdAt: new Date().toISOString(),
    fileSize: '1.2 MB',
    pageCount: 3
  },
  {
    id: 'tpl_002',
    name: '시설 이용 및 면책 동의서',
    type: 'WAIVER',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    fileSize: '850 KB',
    pageCount: 1
  },
  {
    id: 'tpl_003',
    name: '1:1 프라이빗 레슨 계약서',
    type: 'PT_AGREEMENT',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    fileSize: '1.5 MB',
    pageCount: 2
  },
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const backendService = {
  // --- Template Methods ---
  
  async getTemplates(): Promise<ContractTemplate[]> {
    await delay(300);
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(stored);
  },

  async uploadTemplate(template: Omit<ContractTemplate, 'id' | 'createdAt'>): Promise<ContractTemplate> {
    await delay(500);
    const newTemplate: ContractTemplate = {
      ...template,
      id: `tpl_${Date.now()}`,
      createdAt: new Date().toISOString(),
      // Use provided metadata or fallback defaults
      fileSize: template.fileSize || '1.0 MB', 
      pageCount: template.pageCount || 1,      
    };
    
    const current = await this.getTemplates();
    const updated = [newTemplate, ...current];
    
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    } catch (e) {
      console.warn("LocalStorage quota exceeded. Saving template without PDF body.");
      // If storage is full, try saving without basePdfUrl
      const fallbackTemplate = { ...newTemplate, basePdfUrl: undefined };
      const fallbackUpdated = [fallbackTemplate, ...current];
      try {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(fallbackUpdated));
      } catch (e2) {
        console.error("Critical: Cannot save template metadata", e2);
        throw e2;
      }
    }
    
    return newTemplate;
  },

  // --- Contract Methods ---

  async getSignedContracts(): Promise<SignedContract[]> {
    await delay(300);
    const stored = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
    return stored ? JSON.parse(stored) : [];
  },

  async searchContracts(query: string): Promise<SignedContract[]> {
    const contracts = await this.getSignedContracts();
    const lowerQ = query.toLowerCase();
    return contracts.filter(c => 
      c.signerName.toLowerCase().includes(lowerQ) ||
      c.signerPhone.includes(query) ||
      c.templateName.toLowerCase().includes(lowerQ)
    );
  },

  async saveSignedContract(contract: Omit<SignedContract, 'id' | 'status'>): Promise<SignedContract> {
    // 1. Prepare new contract object
    const newContract: SignedContract = {
      ...contract,
      id: `cnt_${Date.now()}`,
      status: 'SENT',
    };

    // 2. Save to Local Storage (Client-side persistence)
    const current = await this.getSignedContracts();
    const updated = [newContract, ...current];
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(updated));
    
    // 3. Attempt to send to REAL Backend (if running)
    // This allows the email to be actually sent via the Node.js server
    try {
      console.log('Attemping to send to backend server...');
      const response = await fetch('http://localhost:3001/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContract),
      });

      if (response.ok) {
        console.log('Successfully sent to backend server for emailing.');
      } else {
        console.warn('Backend server returned error:', await response.text());
      }
    } catch (err) {
      console.warn('Backend server is not reachable. Email might not be sent.', err);
      // We don't throw error here to allow the UI to complete successfully in "Offline/Demo" mode.
    }
    
    return newContract;
  }
};