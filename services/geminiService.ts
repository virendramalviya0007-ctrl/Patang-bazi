
import { GoogleGenAI, Modality } from "@google/genai";

let voiceAudioCtx: AudioContext | null = null;
let isTtsCoolingDown = false;
let lastTtsErrorTime = 0;
const COOL_DOWN_PERIOD = 30000; // 30 seconds wait after a 429 error

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Plays voice commentary using Gemini TTS.
 * Includes rate-limiting protection to avoid 429 Resource Exhausted errors.
 */
export const playVoiceCommentary = async (text: string, voice: string = 'Kore'): Promise<void> => {
  const now = Date.now();
  
  // Check if we are in a cooling-down period after a 429 error
  if (isTtsCoolingDown) {
    if (now - lastTtsErrorTime < COOL_DOWN_PERIOD) {
      console.warn("TTS is cooling down due to previous rate limit error. Skipping voice.");
      return;
    } else {
      isTtsCoolingDown = false;
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (!voiceAudioCtx) {
      voiceAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (voiceAudioCtx.state === 'suspended') {
      await voiceAudioCtx.resume();
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Act as a rooftop kite flyer. Say this naturally in Hinglish: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio && voiceAudioCtx) {
      const audioBuffer = await decodeAudioData(decode(base64Audio), voiceAudioCtx, 24000, 1);
      const source = voiceAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(voiceAudioCtx.destination);
      source.start();
    }
  } catch (error: any) {
    console.error("TTS Voice Error:", error);
    
    // Specifically handle 429 (Resource Exhausted)
    if (error?.message?.includes("429") || error?.status === 429 || error?.code === 429) {
      isTtsCoolingDown = true;
      lastTtsErrorTime = now;
      console.error(`Rate limit hit. Cooling down for ${COOL_DOWN_PERIOD / 1000} seconds.`);
    }
  }
};

export const getCommentary = async (event: string, score: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Kite combat event: ${event}. Score: ${score}. Short Hinglish reaction (max 5 words).`,
      config: { maxOutputTokens: 30 }
    });
    return response.text?.trim() || "Kai Po Che!";
  } catch (error) {
    return "Maza aa gaya!";
  }
};
