
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-2.5-flash-image';

export type StudioPreset = 'editorial' | 'streetwear' | 'lifestyle' | 'minimalist';

const PRESET_PROMPTS: Record<StudioPreset, string> = {
  editorial: "High-fashion editorial style. Minimalist high-contrast studio lighting, sharp focus on the product, sophisticated female model posing with poise. Elegant background, neutral tones, 8k professional photography.",
  streetwear: "Urban lifestyle streetwear style. Candid modeling pose on a clean city street with soft natural lighting. Realistic textures, modern vibe, female model in a natural fashion-forward stance.",
  lifestyle: "Warm lifestyle setting. Soft, airy natural lighting, indoor modern boutique or clean home environment. Approachable and friendly modeling pose, emphasizing real-world product usage.",
  minimalist: "Pure product modeling. Cleanest possible studio environment, soft diffused lighting, no distractions. Female model used as a natural frame for the product details."
};

export const ANGLES = [
  "Front full view",
  "Back view",
  "45-degree side profile",
  "Close-up detail shot",
  "Low-angle heroic shot",
  "High-angle overview",
  "Dynamic motion shot",
  "Three-quarter view",
  "Atmospheric depth shot",
  "Symmetry-focused composition"
];

export const generateEcomImage = async (
  base64Image: string,
  preset: StudioPreset = 'editorial',
  angleModifier: string = "Front view"
): Promise<string> => {
  // Always create a new instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const studioDirectives = PRESET_PROMPTS[preset];
  const systemPrompt = `ACT AS A PROFESSIONAL E-COMMERCE PHOTOGRAPHER. 
  TASK: Create a world-class modeling shot using the attached product reference.
  
  ANGLE/VIEW: ${angleModifier}
  STYLE DIRECTIVES: ${studioDirectives}
  
  REQUIREMENTS:
  - Match the product design, colors, and textures with 100% accuracy.
  - The model must be a female in a professional, non-sexual, natural pose.
  - Use high-end cinematic lighting (Key, Fill, and Rim lights).
  - Ensure the product is the focal point with a shallow depth of field.
  - The result must look like a real photograph from a luxury brand's catalog.
  
  NO text, NO logos, NO watermarks. Just the pure professional image.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/png',
            },
          },
          { text: systemPrompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error(`Generation failed for ${angleModifier}:`, error);
    throw error;
  }

  throw new Error(`The AI studio failed to render the ${angleModifier} image.`);
};

export const editImageWithPrompt = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const refinedPrompt = `Refine this professional image: ${editPrompt}. 
  Maintain the high-end studio quality, lighting, and product integrity. 
  Ensure the edit is seamless and realistic.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: 'image/png',
          },
        },
        { text: refinedPrompt },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("The refine process was unsuccessful.");
};
