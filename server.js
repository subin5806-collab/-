/**
 * WELLNESS THE HANNAM - Backend Server
 * 
 * Instructions to run:
 * 1. npm init -y
 * 2. npm install express cors body-parser nodemailer
 * 3. node server.js
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development convenience
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Limit increased for PDF base64 payloads
app.use(bodyParser.json({ limit: '50mb' })); 

// Ensure base storage directory exists
const BASE_STORAGE_DIR = path.join(__dirname, 'contracts_storage');
if (!fs.existsSync(BASE_STORAGE_DIR)) {
  fs.mkdirSync(BASE_STORAGE_DIR);
}

// Serve stored files as static resources (allows direct download via URL)
// e.g., http://localhost:3001/files/2024/05/contract.pdf
app.use('/files', express.static(BASE_STORAGE_DIR));

// Nodemailer Transporter Configuration
// Replace with actual SMTP credentials for help@thehannam.com
const transporter = nodemailer.createTransport({
  host: "smtp.your-email-provider.com", // e.g., smtp.gmail.com or AWS SES
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "help@thehannam.com", 
    pass: process.env.EMAIL_PASSWORD // Set via environment variable
  }
});

/**
 * API: Save Contract & Send Email
 */
app.post('/api/contracts', async (req, res) => {
  try {
    const { 
      templateName, 
      signerName, 
      signerPhone, 
      signerEmail, 
      signedAt, 
      pdfDataUrl 
    } = req.body;

    console.log(`[REQUEST] Receiving contract for: ${signerName}`);

    // 1. Prepare Directory Structure (YYYY/MM)
    const date = signedAt ? new Date(signedAt) : new Date();
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const yearDir = path.join(BASE_STORAGE_DIR, year);
    if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir);
    
    const monthDir = path.join(yearDir, month);
    if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir);

    // 2. Save PDF to Disk
    // Filename: Name_Phone_Timestamp.pdf
    const safeName = signerName.replace(/[^a-zA-Z0-9가-힣]/g, "");
    const filename = `${safeName}_${signerPhone}_${Date.now()}.pdf`;
    const filePath = path.join(monthDir, filename);
    
    // Remove "data:application/pdf;base64," header
    const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, "");
    
    fs.writeFileSync(filePath, base64Data, 'base64');
    console.log(`[FILE] Contract saved: ${filePath}`);

    // 3. Send Email
    // Note: If SMTP is not configured correctly, this block will fail. 
    // We catch the error to ensure the client gets a response, but log the failure.
    try {
      const mailOptions = {
        from: '"WELLNESS THE HANNAM" <help@thehannam.com>',
        to: signerEmail,
        cc: "admin@thehannam.com", // Admin copy
        subject: `[WELLNESS THE HANNAM] ${templateName} 계약서 완료 안내`,
        text: `안녕하세요 ${signerName} 회원님,\n\n진행하신 ${templateName} 계약이 완료되었습니다.\n첨부된 계약서를 확인해 주시기 바랍니다.\n\n감사합니다.\nWELLNESS THE HANNAM 드림.`,
        attachments: [
          {
            filename: `${templateName}.pdf`,
            path: filePath
          }
        ]
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Sent to ${signerEmail}: ${info.messageId}`);
    } catch (emailError) {
      console.error("[EMAIL ERROR] Failed to send email. Check SMTP config.", emailError);
      // We don't fail the request if email fails, as the contract is already saved.
    }

    // 4. Respond with the static file URL
    // This allows the frontend to potentially link to the server file instead of base64
    const fileUrl = `/files/${year}/${month}/${filename}`;

    res.status(200).json({ 
      success: true, 
      message: "Contract saved successfully.",
      contractId: filename,
      fileUrl: fileUrl
    });

  } catch (error) {
    console.error("[SERVER ERROR] Processing contract:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Optional: API for Templates if you want to expand backend features later
app.post('/api/templates', (req, res) => {
  // Placeholder for server-side template upload
  res.status(200).json({ success: true, message: "Template upload API ready" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Email sender configured as: help@thehannam.com`);
  console.log(`Storage root: ${BASE_STORAGE_DIR}`);
  console.log(`Contracts are organized by YYYY/MM folders.`);
});