import 'dotenv/config';

import {GoogleGenAI} from '@google/genai';
import express, {type Request, type Response} from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import {createServer as createViteServer} from 'vite';

type QualityMode = 'fast' | 'pro';

type GenerateStyleBody = {
  imageBase64?: string;
  userPrompt?: string;
  scanStep?: 'front';
  qualityMode?: QualityMode;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);

const FAST_IMAGE_MODEL = 'gemini-2.5-flash-image';
const PRO_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const PROMPT_MODEL = 'gemini-3-flash-preview';

const app = express();

app.use(express.json({limit: '16mb'}));

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  return new GoogleGenAI({apiKey});
};

const isQualityMode = (value: unknown): value is QualityMode =>
  value === 'fast' || value === 'pro';

const stripDataUrlPrefix = (imageBase64: string) =>
  imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

const buildSalonBriefPrompt = (userPrompt: string) => `
You are Aura, a high-end AI hair stylist and image-editing prompt director.
Convert the user's short hair request into a precise salon technical brief for a
text-and-image-to-image model.

User request: "${userPrompt}"

Return a compact but detailed English prompt. Include:
- haircut shape, length, layering, volume, texture, sheen, and color details
- realistic hairline blending around forehead, temples, ears, and neck
- high-end salon lighting, natural strand detail, and photorealistic finish
- preserve the person's exact face, age, skin texture, expression, pose, clothing, and background
- edit only hair; do not modify eyes, eyebrows, nose, lips, jaw, ears, skin, body, or environment

Return only the expanded prompt text.
`;

const buildImagePrompt = (expandedPrompt: string) => `
TASK: Photorealistic AI hair styling edit.

STYLE BRIEF:
${expandedPrompt}

CRITICAL IDENTITY AND REGION RULES:
- Generate an edited image from the provided photo.
- Modify only the visible hair: cut, color, texture, volume, hair strands, shine, and styling.
- Preserve the person's exact facial identity, face shape, age, skin texture, expression, gaze, and pose.
- Preserve clothing, accessories, background, camera angle, lighting direction, and image composition.
- Blend the new hair naturally into the existing hairline, temples, ears, sideburn area, and neck.
- Keep skin, eyes, eyebrows, nose, lips, teeth, ears, jawline, hands, and body untouched.

NEGATIVE INSTRUCTIONS:
- Do not redraw the face.
- Do not change facial symmetry, age, gender presentation, ethnicity, skin tone, makeup, or expression.
- Do not alter the background, clothing, jewelry, camera crop, or body shape.
- Do not create wigs, helmets, hats, plastic hair, painted blocks, extra people, text, logos, or watermarks.

OUTPUT:
- Return one high-fidelity image.
- If a requested style is ambiguous, choose the most natural professional salon interpretation.
`;

const expandStylingPrompt = async (ai: GoogleGenAI, userPrompt: string) => {
  const response = await ai.models.generateContent({
    model: PROMPT_MODEL,
    contents: buildSalonBriefPrompt(userPrompt),
  });

  return response.text?.trim() || userPrompt;
};

const extractImageDataUrl = (response: any) => {
  const parts = response?.candidates?.[0]?.content?.parts || response?.parts || [];

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) {
      const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
      return `data:${mimeType};base64,${inlineData.data}`;
    }
  }

  return null;
};

const generateImage = async (
  ai: GoogleGenAI,
  imageBase64: string,
  expandedPrompt: string,
  qualityMode: QualityMode,
) => {
  const preferredModel = qualityMode === 'pro' ? PRO_IMAGE_MODEL : FAST_IMAGE_MODEL;
  const warnings: string[] = [];

  const run = (model: string) =>
    ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: stripDataUrlPrefix(imageBase64),
              mimeType: 'image/jpeg',
            },
          },
          {
            text: buildImagePrompt(expandedPrompt),
          },
        ],
      },
    });

  try {
    const response = await run(preferredModel);
    const imageDataUrl = extractImageDataUrl(response);
    if (!imageDataUrl) {
      throw new Error('The model returned no image data.');
    }

    return {imageDataUrl, modelUsed: preferredModel, warnings};
  } catch (error) {
    if (preferredModel === FAST_IMAGE_MODEL) {
      throw error;
    }

    warnings.push('Pro quality model was unavailable; generated with fast mode.');
    const response = await run(FAST_IMAGE_MODEL);
    const imageDataUrl = extractImageDataUrl(response);
    if (!imageDataUrl) {
      throw new Error('The fallback model returned no image data.');
    }

    return {imageDataUrl, modelUsed: FAST_IMAGE_MODEL, warnings};
  }
};

app.post('/api/generate-style', async (req: Request, res: Response) => {
  const {imageBase64, userPrompt, qualityMode = 'fast'} = req.body as GenerateStyleBody;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({error: 'A front scan image is required.'});
  }

  if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
    return res.status(400).json({error: 'Describe the desired hairstyle before generating.'});
  }

  if (!isQualityMode(qualityMode)) {
    return res.status(400).json({error: 'qualityMode must be "fast" or "pro".'});
  }

  try {
    const ai = getAI();
    const expandedPrompt = await expandStylingPrompt(ai, userPrompt.trim());
    const {imageDataUrl, modelUsed, warnings} = await generateImage(
      ai,
      imageBase64,
      expandedPrompt,
      qualityMode,
    );

    return res.json({
      imageDataUrl,
      expandedPrompt,
      modelUsed,
      warnings,
    });
  } catch (error) {
    console.error('Style generation failed:', error);
    const message =
      error instanceof Error && error.message === 'GEMINI_API_KEY is not configured.'
        ? 'Gemini API key is not configured on the server.'
        : 'Style generation failed. Please try a clearer prompt or a better-lit scan.';

    return res.status(500).json({error: message});
  }
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr:
        process.env.DISABLE_HMR === 'true'
          ? false
          : {port: Number(process.env.HMR_PORT || port + 10000)},
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Aura server running at http://127.0.0.1:${port}/`);
});
