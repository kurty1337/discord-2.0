import { GoogleGenAI } from '@google/genai';

class GeminiService {
  private getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

  private async ensureApiKey() {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        await window.aistudio.openSelectKey();
    }
  }

  private handleApiError(e: any): Error {
    console.error("Gemini API error:", e);
    const errorMessage = e.message || (typeof e === 'object' && e !== null ? JSON.stringify(e) : String(e));

    if (errorMessage.includes("RESOURCE_EXHAUSTED")) {
        window.aistudio.openSelectKey(); // Fire-and-forget, will open a dialog for the user.
        return new Error("Ваш лимит API исчерпан. Пожалуйста, выберите другой ключ и попробуйте снова.");
    }

    if (errorMessage.includes("API key not valid") || errorMessage.includes("Requested entity was not found")) {
        window.aistudio.openSelectKey();
        return new Error("Ваш API ключ недействителен или отсутствует. Пожалуйста, убедитесь, что вы выбрали действующий ключ, и попробуйте снова.");
    }
    return new Error(errorMessage || "Произошла неизвестная ошибка при обращении к Gemini API.");
  }


  async generateText(prompt: string, history?: any[]): Promise<string> {
    try {
        await this.ensureApiKey();
        const ai = this.getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        throw this.handleApiError(error);
    }
  }

  async generateImage(prompt:string): Promise<string> {
      try {
        await this.ensureApiKey();
        const ai = this.getAI();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        // Return a full data URL for consistent rendering in the chat
        return `data:image/jpeg;base64,${base64Image}`;
      } catch(error) {
        throw this.handleApiError(error);
      }
  }

  async generateVideo(prompt: string): Promise<string> {
      try {
        await this.ensureApiKey();
        const ai = this.getAI();

        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Не удалось сгенерировать видео, ссылка для скачивания отсутствует.");
        }
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Не удалось загрузить видео: ${response.statusText}. Детали: ${errorText}`);
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

      } catch (e: any) {
        throw this.handleApiError(e);
      }
  }
}

export const geminiService = new GeminiService();