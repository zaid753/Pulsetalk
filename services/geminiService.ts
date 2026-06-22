import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { BookAppointmentArgs } from "../types";

const ai = new GoogleGenAI({
  apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY,
});

const bookAppointmentTool: FunctionDeclaration = {
  name: "bookAppointment",
  description: "Schedule a medical appointment for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      specialty: {
        type: Type.STRING,
        description: "Doctor specialty",
      },
      date: {
        type: Type.STRING,
        description: "Appointment date",
      },
      time: {
        type: Type.STRING,
        description: "Appointment time",
      },
      reason: {
        type: Type.STRING,
        description: "Reason for visit",
      },
    },
    required: ["specialty", "date", "time", "reason"],
  },
};

export const startChatSession = () => {
  return true;
};

const parseBase64 = (base64String: string) => {
  if (base64String.startsWith("data:")) {
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);

    if (matches && matches.length === 3) {
      return {
        mimeType: matches[1],
        data: matches[2],
      };
    }
  }

  return {
    mimeType: "image/png",
    data: base64String,
  };
};

export const sendMessageToGemini = async (
  message: string,
  imageBase64?: string,
  onToolCall?: (args: BookAppointmentArgs) => Promise<string>
): Promise<string> => {
  try {
    const parts: any[] = [];

    if (imageBase64) {
      const { mimeType, data } = parseBase64(imageBase64);

      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }

    parts.push({
      text: message || "Analyze this image.",
    });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [bookAppointmentTool],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls;

    if (
      functionCalls &&
      functionCalls.length > 0 &&
      onToolCall
    ) {
      const call = functionCalls[0];

      if (call.name === "bookAppointment") {
        const args = call.args as unknown as BookAppointmentArgs;

        const toolResult = await onToolCall(args);

        const finalResponse = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
            {
              role: "model",
              parts: [
                {
                  functionCall: {
                    name: call.name,
                    args: call.args,
                  },
                },
              ],
            },
            {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: {
                      result: toolResult,
                    },
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });

        return finalResponse.text || "Appointment processed.";
      }
    }

    return response.text || "I'm listening...";
  } catch (error) {
    console.error("Gemini Error:", error);

    return "I'm sorry, I'm having trouble connecting right now. Please try again.";
  }
};

export const generateSymptomAnalysis = async (
  prompt: string,
  imageBase64?: string
): Promise<string> => {
  try {
    const parts: any[] = [];

    if (imageBase64) {
      const { mimeType, data } = parseBase64(imageBase64);

      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }

    parts.push({
      text: prompt,
    });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    return response.text || "Unable to generate analysis report.";
  } catch (error) {
    console.error("Analysis Error:", error);

    return "I encountered an error while analyzing symptoms.";
  }
};

export const analyzeSymptomsRealtime = async (
  text: string
): Promise<string> => {
  if (!text || text.length < 8) {
    return "";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `You are a medical triage autocomplete assistant.
Analyze this partial input: "${text}".
If it contains symptoms, return a very short label (max 5 words).
If it is conversational, return nothing.`,
      config: {
        maxOutputTokens: 20,
        temperature: 0.1,
      },
    });

    return response.text?.trim() || "";
  } catch {
    return "";
  }
};