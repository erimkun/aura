export type QualityMode = 'fast' | 'pro';

export type GenerateStyleRequest = {
  imageBase64: string;
  userPrompt: string;
  scanStep?: 'front';
  qualityMode?: QualityMode;
};

export type GenerateStyleResponse = {
  imageDataUrl: string;
  expandedPrompt: string;
  modelUsed: string;
  warnings?: string[];
};

export async function generateStyledHair(
  request: GenerateStyleRequest,
): Promise<GenerateStyleResponse> {
  const response = await fetch('/api/generate-style', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error ||
      'Style generation failed. Please check the image and try again.';
    throw new Error(message);
  }

  return payload as GenerateStyleResponse;
}
