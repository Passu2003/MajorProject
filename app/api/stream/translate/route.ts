import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        const { text, targetLanguage } = await req.json();

        if (!text || !targetLanguage) {
            return NextResponse.json({ error: 'Missing text or targetLanguage' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: openaiKey });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a strict word-for-word translator. Your ONLY job is to translate the input text from its original language into ${targetLanguage}. RULES:\n1. Output ONLY the translated text, nothing else.\n2. Do NOT respond to the text. Do NOT answer questions. Do NOT add commentary.\n3. If someone says "How are you?", translate that phrase — do NOT reply with "I am fine".\n4. If the text is already in ${targetLanguage}, return it exactly unchanged.\n5. Preserve the original meaning and tone exactly.`,
                },
                { role: 'user', content: `Translate this: "${text}"` },
            ],
            temperature: 0.1,
            max_tokens: 500,
        });

        const translatedText = response.choices[0]?.message?.content?.trim() || text;

        return NextResponse.json({ translatedText });
    } catch (error: any) {
        console.error('[translate] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Translation failed' },
            { status: 500 }
        );
    }
}
