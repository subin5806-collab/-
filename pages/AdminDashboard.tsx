import React, { useEffect, useState, useRef } from 'react';
import { backendService } from '../services/mockBackend';
import { SignedContract, ContractTemplate } from '../types';
import { Button } from '../components/ui/Button';
import { Search, FileText, Download, Plus, Calendar, User, Clock, Settings, Eye, HardDrive, FileType, X, ChevronDown, Archive, FileSpreadsheet } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

interface Props {
  onStartContract: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onStartContract }) => {
  const [activeTab, setActiveTab] = useState<'contracts' | 'templates'>('contracts');
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  const [isZipping, setIsZipping] = useState<string | null>(null); // Tracks which group is currently zipping
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const refreshData = async () => {
    const [c, t] = await Promise.all([
      backendService.searchContracts(search),
      backendService.getTemplates()
    ]);
    setContracts(c);
    setTemplates(t);
  };

  useEffect(() => {
    refreshData();
  }, [search]); // Re-fetch when search changes

  const handleDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (contracts.length === 0) {
      alert("내보낼 계약 데이터가 없습니다.");
      return;
    }
    
    // CSV Header
    const headers = ['Contract ID', 'Template', 'Signer Name', 'Phone', 'Email', 'Signed Date'];
    
    // CSV Rows
    const rows = contracts.map(c => [
      c.id,
      c.templateName,
      c.signerName,
      c.signerPhone,
      c.signerEmail,
      new Date(c.signedAt).toLocaleString()
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(item => `"${item}"`).join(',')) // Quote fields to handle commas
    ].join('\n');
    
    // BOM for Excel (Korean characters support)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contracts_Export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async (groupKey: string, groupContracts: SignedContract[]) => {
    setIsZipping(groupKey);
    try {
      const zip = new JSZip();
      const folderName = `Contracts_${groupKey}`;
      const folder = zip.folder(folderName);
      
      if (!folder) return;

      let count = 0;
      groupContracts.forEach(contract => {
        if (contract.pdfDataUrl) {
          // Extract base64 content
          const base64Data = contract.pdfDataUrl.split(',')[1];
          if (base64Data) {
            const fileName = `${contract.signerName}_${contract.templateName}_${contract.id.slice(-4)}.pdf`;
            folder.file(fileName, base64Data, { base64: true });
            count++;
          }
        }
      });

      if (count === 0) {
        alert("다운로드할 PDF 데이터가 없습니다.");
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("ZIP Generation failed:", error);
      alert("압축 파일 생성 중 오류가 발생했습니다.");
    } finally {
      setIsZipping(null);
    }
  };

  // Trigger hidden file input
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Helper: Read file as Base64
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    try {
      // 1. Calculate File Size
      const sizeInMB = file.size / (1024 * 1024);
      const formattedSize = sizeInMB < 1 
        ? `${(file.size / 1024).toFixed(1)} KB` 
        : `${sizeInMB.toFixed(1)} MB`;

      // 2. Read PDF to count pages
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      // 3. Get Data URL for preview
      const basePdfUrl = await readFileAsDataURL(file);

      // 4. Determine Template Type based on filename (Simple logic for demo)
      let type: ContractTemplate['type'] = 'OTHER';
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes('가입') || lowerName.includes('member')) type = 'MEMBERSHIP';
      else if (lowerName.includes('동의') || lowerName.includes('waiver')) type = 'WAIVER';
      else if (lowerName.includes('레슨') || lowerName.includes('pt')) type = 'PT_AGREEMENT';

      // 5. Upload to Service
      await backendService.uploadTemplate({
        name: file.name.replace('.pdf', ''),
        type: type,
        fileSize: formattedSize,
        pageCount: pageCount,
        basePdfUrl: basePdfUrl
      });

      // 6. Refresh List & Reset Input
      await refreshData();
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('서식이 성공적으로 업로드되었습니다.');

    } catch (error) {
      console.error('File upload failed:', error);
      alert('파일 처리 중 오류가 발생했습니다. 올바른 PDF 파일인지 확인해주세요.');
    }
  };

  // Group Contracts Logic (YYYY-MM)
  const getGroupKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // Key for sorting: "2024-05"
  };

  const groupedContracts = contracts.reduce((groups, contract) => {
    const key = getGroupKey(contract.signedAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(contract);
    return groups;
  }, {} as Record<string, SignedContract[]>);

  // Sort keys descending (Newest month first)
  const sortedGroupKeys = Object.keys(groupedContracts).sort().reverse();

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="application/pdf" 
        className="hidden" 
      />

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-stone-900 p-2.5 rounded-lg shadow-sm">
                <FileText className="text-amber-50" size={20} />
              </div>
              <div>
                <span className="block text-lg font-bold text-stone-900 tracking-tight serif">WELLNESS THE HANNAM</span>
                <span className="block text-[10px] text-stone-500 uppercase tracking-widest font-medium">Premium Electronic Contract</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-stone-500 mr-2 hidden sm:inline-block">관리자님, 환영합니다</span>
              <Button size="md" onClick={onStartContract} className="shadow-stone-400/20">
                <Plus size={18} className="mr-2" /> 새 계약 작성
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 hover:border-stone-200 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">사용 중인 서식</h3>
              <div className="p-2 bg-stone-50 rounded-full text-stone-400"><Settings size={16}/></div>
            </div>
            <p className="text-3xl font-bold text-stone-900 serif">{templates.length} <span className="text-sm font-sans font-normal text-stone-400">종</span></p>
          </div>
          
          {/* New Management Card: Total Contracts & CSV Export */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 hover:border-stone-200 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-stone-500 text-xs font-bold uppercase tracking-wider">누적 계약 건수</h3>
                <div className="p-2 bg-stone-50 rounded-full text-stone-400"><Archive size={16}/></div>
              </div>
              <p className="text-3xl font-bold text-stone-900 serif">
                {contracts.length} <span className="text-sm font-sans font-normal text-stone-400">건</span>
              </p>
            </div>
            <button 
              onClick={handleExportCSV}
              className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-stone-600 bg-stone-50 rounded hover:bg-stone-100 transition-colors border border-stone-100"
            >
              <FileSpreadsheet size={14} /> 전체 목록 엑셀 저장
            </button>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden min-h-[500px]">
          <div className="border-b border-stone-100 px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex space-x-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('contracts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'contracts' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                계약 보관함
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'templates' 
                    ? 'bg-white text-stone-900 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                서식 관리
              </button>
            </div>

            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-stone-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg bg-stone-50 placeholder-stone-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-stone-400 focus:border-stone-400 sm:text-sm transition-colors"
                placeholder="회원명 또는 연락처 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            {activeTab === 'contracts' ? (
              <table className="min-w-full divide-y divide-stone-100">
                <thead className="bg-stone-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">회원 정보</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">연락처</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">계약 종류</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">계약일</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-stone-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-100">
                  {contracts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-stone-400">
                        <div className="flex flex-col items-center gap-3">
                          <FileText size={40} className="text-stone-200" />
                          <span>아직 완료된 계약이 없습니다.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedGroupKeys.map(key => {
                      const [year, month] = key.split('-');
                      return (
                        <React.Fragment key={key}>
                          {/* Month Header Group - Sticky */}
                          <tr className="bg-stone-50/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                            <td colSpan={5} className="px-6 py-3 border-y border-stone-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-stone-200 shadow-sm">
                                    <Calendar size={14} className="text-stone-500"/>
                                  </span>
                                  <span className="font-bold text-stone-800 text-sm">{year}년 {month}월</span>
                                  <span className="text-xs text-stone-400 font-medium ml-1">({groupedContracts[key].length}건)</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-xs bg-white hover:bg-stone-100 border-stone-300"
                                  onClick={() => handleDownloadZip(key, groupedContracts[key])}
                                  isLoading={isZipping === key}
                                  disabled={!!isZipping}
                                >
                                  <Archive size={14} className="mr-1.5"/> 
                                  {isZipping === key ? '압축 중...' : '전체 다운로드 (ZIP)'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Contract Rows for this Month */}
                          {groupedContracts[key].map((contract) => (
                            <tr key={contract.id} className="hover:bg-stone-50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap pl-8 border-l-4 border-l-transparent hover:border-l-stone-800">
                                <div className="flex items-center">
                                  <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 mr-3 border border-stone-200">
                                    <User size={16} />
                                  </div>
                                  <div className="text-sm font-semibold text-stone-900">{contract.signerName}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                <div className="font-mono text-xs">{contract.signerPhone}</div>
                                <div className="text-xs text-stone-400 mt-0.5">{contract.signerEmail}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 inline-flex text-xs leading-4 font-medium rounded-full bg-amber-50 text-amber-900 border border-amber-100">
                                  {contract.templateName}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={14} className="text-stone-400" />
                                  {new Date(contract.signedAt).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button 
                                  onClick={() => handleDownload(contract.pdfDataUrl, `${contract.signerName}_${contract.templateName}.pdf`)}
                                  className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200"
                                >
                                  <Download size={14} /> PDF 다운로드
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              // Templates List (Grid View)
              <div className="p-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map(tpl => (
                  <div key={tpl.id} className="relative group bg-white border border-stone-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-stone-300 transition-all duration-300">
                    {/* Header / Preview Area */}
                    <div className="bg-stone-50 h-36 border-b border-stone-100 flex items-center justify-center relative group-hover:bg-stone-100 transition-colors cursor-pointer" onClick={() => setPreviewTemplate(tpl)}>
                       {/* Mock Document Preview */}
                       <div className="w-20 h-28 bg-white shadow-sm border border-stone-200 flex flex-col p-3 gap-2 items-center justify-start transform group-hover:-translate-y-1 transition-transform duration-300">
                          <div className="w-full h-1.5 bg-stone-100 rounded-full"></div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full"></div>
                          <div className="w-2/3 h-1.5 bg-stone-100 rounded-full mr-auto"></div>
                          <div className="w-full h-px bg-stone-50 my-1"></div>
                          <div className="w-full h-1 bg-stone-50 rounded-full"></div>
                          <div className="w-full h-1 bg-stone-50 rounded-full"></div>
                          <div className="w-full h-1 bg-stone-50 rounded-full"></div>
                          <div className="mt-auto text-[8px] text-stone-300 font-serif self-end">PDF</div>
                       </div>
                       
                       <div className="absolute top-3 right-3">
                          <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-stone-500 border border-stone-100 shadow-sm uppercase tracking-wider">
                            {tpl.type.replace('_', ' ')}
                          </span>
                       </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      <div className="mb-4 h-12">
                         <h3 className="font-bold text-sm text-stone-900 leading-tight line-clamp-2 cursor-pointer hover:text-stone-600 transition-colors" onClick={() => setPreviewTemplate(tpl)} title={tpl.name}>{tpl.name}</h3>
                      </div>
                      
                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] text-stone-500 mb-4">
                         <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-stone-400" />
                            <span>{new Date(tpl.createdAt).toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <FileType size={12} className="text-stone-400" />
                            <span>{tpl.pageCount || 1} Pages</span>
                         </div>
                         <div className="flex items-center gap-1.5 col-span-2">
                            <HardDrive size={12} className="text-stone-400" />
                            <span>{tpl.fileSize || 'Unknown Size'}</span>
                         </div>
                      </div>

                      <div className="pt-4 border-t border-stone-100 flex gap-2">
                         <button onClick={onStartContract} className="flex-1 bg-stone-900 text-stone-50 text-xs font-bold py-2.5 rounded hover:bg-stone-800 transition-colors shadow-sm">
                            사용하기
                         </button>
                         <button 
                            className="px-3 border border-stone-200 rounded hover:bg-stone-50 text-stone-500 transition-colors" 
                            title="미리보기"
                            onClick={() => setPreviewTemplate(tpl)}
                         >
                            <Eye size={16} />
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Upload Template Button triggers file input */}
                <button 
                  onClick={handleUploadClick}
                  className="border-2 border-dashed border-stone-200 rounded-xl p-6 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-all group min-h-[300px]"
                >
                  <div className="p-4 bg-stone-50 rounded-full group-hover:bg-white transition-colors mb-4 shadow-sm">
                    <Plus size={24} />
                  </div>
                  <span className="font-medium text-sm">새 서식 업로드</span>
                  <span className="text-xs text-stone-300 mt-2">PDF 파일만 가능</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="bg-stone-200 p-2 rounded-lg">
                    <FileText size={20} className="text-stone-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-stone-900 leading-tight">{previewTemplate.name}</h3>
                    <p className="text-xs text-stone-500">문서 미리보기 및 상세 정보</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 hover:bg-stone-200 rounded-full text-stone-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* PDF Viewer / Placeholder Area */}
                <div className="flex-1 bg-stone-100 relative flex items-center justify-center p-4">
                  {previewTemplate.basePdfUrl ? (
                    <iframe 
                      src={previewTemplate.basePdfUrl} 
                      className="w-full h-full rounded shadow-sm bg-white" 
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="text-center p-10">
                      <div className="w-32 h-44 bg-white shadow-lg mx-auto mb-6 rounded-sm border border-stone-200 flex flex-col p-6 gap-4">
                        <div className="w-full h-2 bg-stone-100 rounded"></div>
                        <div className="w-full h-2 bg-stone-100 rounded"></div>
                        <div className="w-3/4 h-2 bg-stone-100 rounded"></div>
                        <div className="flex-1"></div>
                        <div className="w-full h-1 bg-stone-100 rounded"></div>
                        <div className="w-full h-1 bg-stone-100 rounded"></div>
                      </div>
                      <p className="text-stone-500 font-medium">미리보기를 불러올 수 없습니다</p>
                      <p className="text-xs text-stone-400 mt-1">실제 PDF 데이터가 없는 샘플 데이터입니다.</p>
                    </div>
                  )}
                </div>

                {/* Sidebar Metadata */}
                <div className="w-full md:w-80 bg-white border-l border-stone-200 p-6 overflow-y-auto">
                  <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-6">문서 정보 (Metadata)</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-stone-400 font-medium block mb-1">문서 ID</label>
                      <p className="text-sm font-mono text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 break-all">
                        {previewTemplate.id}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-stone-400 font-medium block mb-1">문서 유형</label>
                      <span className="inline-block px-3 py-1 bg-amber-50 text-amber-900 text-xs font-bold rounded-full border border-amber-100">
                        {previewTemplate.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-stone-400 font-medium block mb-1">파일 크기</label>
                        <div className="flex items-center gap-2 text-stone-700">
                          <HardDrive size={14} />
                          <span className="text-sm font-medium">{previewTemplate.fileSize || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-stone-400 font-medium block mb-1">페이지 수</label>
                        <div className="flex items-center gap-2 text-stone-700">
                          <FileType size={14} />
                          <span className="text-sm font-medium">{previewTemplate.pageCount || '-'} 쪽</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-stone-400 font-medium block mb-1">업로드 일시</label>
                      <div className="flex items-center gap-2 text-stone-700">
                        <Calendar size={14} />
                        <span className="text-sm">{new Date(previewTemplate.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-stone-100">
                    <button 
                       onClick={() => { setPreviewTemplate(null); onStartContract(); }}
                       className="w-full bg-stone-900 text-stone-50 py-3 rounded-lg text-sm font-bold hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
                    >
                      이 서식으로 계약 작성
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};