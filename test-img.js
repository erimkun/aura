import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
async function run() {
  console.log('Testing gemini-2.5-flash-image...');
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          inlineData: {
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
            mimeType: 'image/png'
          }
        },
        'Make the hair blue.'
      ]
    });
    const parts = res?.candidates?.[0]?.content?.parts || res?.parts || [];
    const hasImage = parts.some(p => p.inlineData || p.inline_data);
    console.log('Image generated successfully:', hasImage);
  } catch (err) {
    console.error('Error generating image:', err.message);
  }
}
run();
