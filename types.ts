export interface ContractTemplate {
  id: string;
  name: string;
  type: 'MEMBERSHIP' | 'WAIVER' | 'PT_AGREEMENT' | 'OTHER';
  createdAt: string; // ISO Date
  basePdfUrl?: string; // In a real app, this is an S3 URL. Here we simulate or use a placeholder.
  fileSize?: string; // Metadata for UI
  pageCount?: number; // Metadata for UI
}

export interface SignerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string; // YYYY-MM-DD
}

export interface SignedContract {
  id: string;
  templateId: string;
  templateName: string;
  signerName: string;
  signerPhone: string;
  signerEmail: string;
  signedAt: string; // ISO Date
  pdfDataUrl: string; // The final generated PDF (Base64)
  status: 'COMPLETED' | 'SENT';
}

export type AppView = 'DASHBOARD' | 'WIZARD' | 'TEMPLATE_MANAGER';

export interface WizardState {
  step: number;
  selectedTemplate: ContractTemplate | null;
  signerInfo: SignerInfo;
  signatureDataUrl: string | null;
  agreedToTerms: boolean;
}