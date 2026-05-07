import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function expandStylingPrompt(userRequest: string) {
  const prompt = `
    Transform the follow hair styling request into a professional, highly detailed, and technical prompt for an AI image generation model (Imagen/Stable Diffusion).
    The prompt should focus on realism, cinematic lighting, hair texture, and seamless blending.
    
    User Request: "${userRequest}"
    
    Requirements:
    - Detailed hair strands and texture.
    - Specifies hair length, volume, and sheen.
    - Mentions "hyper-realistic", "8k", "high-end salon lighting".
    - Focuses ONLY on the hair while maintaining facial identity.
    
    Return ONLY the expanded prompt as a string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || userRequest;
  } catch (error) {
    console.error("Gemini expansion failed:", error);
    return userRequest;
  }
}

export async function generateStyledHair(originalImageBase64: string, maskBase64: string, expandedPrompt: string) {
  // Using gemini-2.5-flash-image for image editing/generation
  // We emphasize "Neural Masking" in the prompt to compensate for lack of explicit SAM backend
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: originalImageBase64,
              mimeType: "image/jpeg",
            },
          },
          {
            text: `
              TASK: Neural Hair Styling & Simulation.
              STYLING PARAMETERS: ${expandedPrompt}
              
              CRITICAL INSTRUCTIONS:
              - Use internal segmentation to identify the person's hair.
              - ONLY modify the hair area. 
              - Maintain 100% facial identity, skin texture, and background detail.
              - The new hairstyle must blend seamlessly with the hairline and ears.
              - Generate a single high-fidelity image output.
            `,
          },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Hair generation failed:", error);
    throw error;
  }
}
