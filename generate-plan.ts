import { GoogleGenAI } from '@google/genai';

export async function handler(event: any) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not configured.' }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = body.prompt || `Analyze this customer's delivery history and provide a concise fraud prevention and COD handling strategy for a Bangladeshi e-commerce seller in Bangla. Customer details: Total Orders: ${body.totalOrders ?? 0}, Delivered: ${body.delivered ?? 0}, Cancelled: ${body.cancelled ?? 0}, Success Rate: ${body.successRate ?? 0}%.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: response.text }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
}
