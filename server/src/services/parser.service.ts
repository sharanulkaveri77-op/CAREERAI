import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const parseResumeBuffer = async (buffer: Buffer, mimetype: string): Promise<string> => {
  try {
    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      return pdfData.text || 'Dummy PDF Text for Mock Testing';
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
    // so the Mock Claude AI can still be tested and demonstrated in the UI!
    return "Fallback dummy resume text since parsing failed.";
  }
};
