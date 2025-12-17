import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignerInfo, ContractTemplate } from '../types';

// Helper to sanitize text for Standard Fonts (Helvetica supports only Latin characters)
// If text contains non-latin characters (like Korean), replace it to prevent PDF generation crash.
const sanitizeForPdf = (text: string, fallback: string) => {
  // Regex to check if text contains only ASCII characters
  const isAscii = /^[\x00-\x7F]*$/.test(text);
  return isAscii ? text : fallback;
};

export const pdfService = {
  /**
   * Generates a PDF by creating a fresh document.
   * Note: This demo uses StandardFonts (Helvetica) which DOES NOT support Korean characters.
   * Passing Korean text to drawText will throw an error and fail the signing process.
   * We fallback to English text for the PDF content to ensure the app works.
   */
  async generateContractPDF(
    template: ContractTemplate,
    signer: SignerInfo,
    signatureDataUrl: string
  ): Promise<string> {
    try {
      // 1. Create a new PDF Document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
      const { width, height } = page.getSize();
      
      // 2. Embed Fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 3. Draw Header
      // Sanitize: Korean Template Name -> "Electronic Contract"
      const displayTitle = sanitizeForPdf(template.name, "Electronic Contract Agreement");
      
      const fontSize = 20;
      page.drawText(displayTitle.toUpperCase(), {
        x: 50,
        y: height - 60,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 50,
        y: height - 90,
        size: 12,
        font: font,
      });

      // 4. Draw Agreement Text
      // We rely on English static text because dynamic Korean text will crash the generator without a custom font file.
      const safeSignerName = sanitizeForPdf(signer.name, "Member");
      const safeAddress = sanitizeForPdf(signer.address, "[Address on File]");
      
      const bodyText = `
      This Agreement is entered into between ${safeSignerName} ("Member") and the Facility.
      
      1. TERMS OF SERVICE
      The Member agrees to abide by all rules and regulations of the facility. The facility reserves the right
      to terminate membership for violation of these rules.

      2. LIABILITY WAIVER
      I, the undersigned, acknowledge the risks involved in physical activity and hereby release the facility 
      from any liability for injuries sustained on the premises.

      3. PAYMENT
      The Member agrees to pay all fees associated with this membership.
      
      4. PERSONAL INFORMATION
      Phone: ${signer.phone}
      Email: ${signer.email}
      DOB: ${signer.dob}
      Address: ${safeAddress}
      `;

      page.drawText(bodyText, {
        x: 50,
        y: height - 150,
        size: 12,
        font: font,
        lineHeight: 18,
        maxWidth: width - 100,
      });

      // 5. Embed Signature Image
      if (signatureDataUrl) {
        // Fix: Use direct Base64 decoding instead of fetch for reliability
        // fetch(dataUrl) can fail in some environments causing the app to hang ("doesn't move on")
        try {
          const base64Data = signatureDataUrl.split(',')[1];
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const signatureImageBytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            signatureImageBytes[i] = binaryString.charCodeAt(i);
          }
          
          const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
          const sigDims = signatureImage.scale(0.5); // Scale down to 50%

          page.drawImage(signatureImage, {
            x: 50,
            y: 100,
            width: sigDims.width,
            height: sigDims.height,
          });
        } catch (imgError) {
          console.error("Failed to embed signature image", imgError);
          // Proceed without signature image rather than crashing entirely
          page.drawText('(Signature Image Failed to Load)', {
            x: 50, 
            y: 100, 
            size: 10, 
            font: font, 
            color: rgb(1, 0, 0)
          });
        }

        page.drawText('Signed By:', {
          x: 50,
          y: 100 + 100, // Adjusted Y since we might not have sigDims if it failed
          size: 10,
          font: boldFont,
        });
        
        page.drawText(safeSignerName, {
          x: 110,
          y: 100 + 100,
          size: 10,
          font: font,
        });
      }

      // 6. Serialize to Base64 (Data URL)
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = _arrayBufferToBase64(pdfBytes);
      return `data:application/pdf;base64,${pdfBase64}`;
    } catch (error) {
      console.error("PDF Generation failed:", error);
      throw error;
    }
  },
};

// Helper to convert ArrayBuffer to Base64
function _arrayBufferToBase64(buffer: Uint8Array) {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}