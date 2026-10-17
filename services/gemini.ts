import { GoogleGenAI, Type } from "@google/genai";
import { Exam, CourseCategory } from '../types';

const MODEL_NAME = 'gemini-3.5-flash';

export const parseExamsFromPdf = async (base64Data: string): Promise<Exam[]> => {
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Missing Gemini API Key. Please add GEMINI_API_KEY under Settings > Secrets.");
      }

      const ai = new GoogleGenAI({ 
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `
        You are an expert data extractor for university exam schedules. 
        Analyze the provided PDF document (Exam Schedule for CEID students).
        
        The document is a grid-based timeline. 
        
        CRITICAL INSTRUCTION FOR DURATION: 
        The duration of each exam must be measured by counting how many boxes (time slots/cells) are captured or spanned by the exam name in the grid.
        - Typically, each box represents 1 hour or 2 hours.
        - If an exam spans 2 boxes and each box is 1 hour, duration is 120 minutes.
        - If it spans 3 boxes of 1 hour, duration is 180 minutes.
        - Default to 120 minutes if the span is unclear but looks like a standard slot.
        
        EXTRACT THE FOLLOWING FOR EACH EXAM:
        1. **Course Code**: The alphanumeric code of the course (e.g., "CEID_101", "ΥΣ102").
        2. **Category (Curriculum)**: Classify the course based on headers or color codes into one of these exact values: "${Object.values(CourseCategory).join('", "')}".
        3. **Format (Exam Type)**: Look for specific keywords indicating the exam format, such as "Multiple Choice", "Written", "Oral", "Lab", "Proodos". If not specified, leave empty.
        
        RETURN A JSON OBJECT with a single key "exams" containing an array of objects.
        
        Each object must have:
        - "name": The subject/course name (string). Clean up newlines. DO NOT include the course code in the name.
        - "code": The course code (string). e.g., "ΥΣ101".
        - "semester": The semester (string). e.g., "1st", "A", "5", etc.
        - "room": The room(s) (string). e.g., "BA", "B4", "Amphitheater". If unknown, use "TBA".
        - "date": The date in YYYY-MM-DD format. The grid headers show only day/month (e.g. "19-23/01"), so take the YEAR from the document itself, never guess it:
            * The first page states the exam period with its year (e.g. "εξεταστική Ιανουαρίου-Φεβρουαρίου 2026", "εξεταστική Σεπτεμβρίου 2025"). Use that year for every exam.
            * The footer "Δημιουργία Προγράμματος: ..." contains the creation year as a fallback.
            * Map each weekday column to its real date using the week range above it (Δευτέρα = first weekday of that week). A week may be partial (e.g. "28-29/08" is Thursday-Friday).
        - "time": The start time in HH:MM 24-hour format.
        - "duration": The duration in MINUTES (integer).
        - "category": The curriculum category (enum).
        - "format": The exam format (string, optional).
        
        Be extremely accurate with dates and times. Ensure you extract EVERY exam listed.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data
              }
            }
          ]
        },
        config: {
          systemInstruction: prompt,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exams: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    code: { type: Type.STRING },
                    semester: { type: Type.STRING },
                    room: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    duration: { type: Type.INTEGER },
                    category: { type: Type.STRING, enum: Object.values(CourseCategory) },
                    format: { type: Type.STRING, nullable: true }
                  },
                  required: ['name', 'code', 'date', 'time', 'duration', 'category']
                }
              }
            }
          }
        }
      });

      let jsonText = response.text;
      if (!jsonText) throw new Error("No data returned from Gemini");

      // Improved Error Handling: Strip Markdown code blocks if present
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", jsonText);
        throw new Error("Failed to parse the AI response. The file might be too complex or unclear.");
      }

      if (!parsed.exams || !Array.isArray(parsed.exams)) {
        throw new Error("Invalid response structure from AI model.");
      }
      
      return parsed.exams.map((exam: any, index: number) => ({
        ...exam,
        id: `exam-${index}-${Date.now()}`,
        // Ensure category defaults to UNKNOWN if AI returns null/undefined
        category: exam.category || CourseCategory.UNKNOWN,
        // Ensure duration defaults to 120 if missing
        duration: typeof exam.duration === 'number' ? exam.duration : 120
      }));

    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("Gemini Parse Error after retries:", lastError);
  
  const errorMessage = lastError?.message || "";
  if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
    throw new Error("RATE_LIMIT_ERROR");
  }

  throw new Error(errorMessage || "Failed to process the PDF after multiple attempts. Please try again with a clearer file.");
};