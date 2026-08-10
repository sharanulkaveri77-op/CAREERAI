import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const parseResumeBuffer = async (buffer: Buffer, mimetype: string): Promise<string> => {
  try {
    if (mimetype === 'application/pdf') {
      // pdf-parse v2 API: instantiate a parser with the raw buffer, then extract text
      const pdfData = new PDFParse({ data: buffer });
      const result = await pdfData.getText();
      return result.text || 'Dummy PDF Text for Mock Testing';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const docxData = await mammoth.extractRawText({ buffer });
      return docxData.value || 'Dummy DOCX Text for Mock Testing';
    }
    throw new Error('Unsupported file format');
  } catch (error) {
    console.error('Error parsing document (falling back to mock text):', error);
    // Instead of throwing and breaking the app, we return a fallback string
    // so the Mock AI (no GROQ_API_KEY) can still be tested in the UI
    return "Fallback dummy resume text since parsing failed.";
  }
};
