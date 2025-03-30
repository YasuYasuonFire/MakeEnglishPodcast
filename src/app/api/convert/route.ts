import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Voice } from 'elevenlabs-node';

// APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const elevenLabsClient = new Voice({
  apiKey: process.env.ELEVENLABS_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: '音声ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // 1. 音声をテキストに変換（ASR）
    const audioBuffer = await audioFile.arrayBuffer();
    const transcriptionResult = await elevenLabsClient.transcribe({
      audioData: Buffer.from(audioBuffer),
      language: 'ja'
    });

    // 2. テキストを英語に翻訳（OpenAI API）
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "あなたは高性能な翻訳エンジンです。入力された日本語を、自然で流暢な英語に翻訳してください。音声用の翻訳なので、話し言葉として自然な表現を心がけてください。"
        },
        {
          role: "user",
          content: transcriptionResult.text
        }
      ],
      temperature: 0.7
    });

    const translatedText = translationResponse.choices[0].message.content;

    if (!translatedText) {
      throw new Error('翻訳に失敗しました');
    }

    // 3. 英語テキストを音声に変換
    const ttsResult = await elevenLabsClient.textToSpeech({
      text: translatedText,
      voiceId: process.env.ELEVENLABS_VOICE_ID!,
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75
    });

    // 4. 音声データをBase64エンコード
    const audioBase64 = Buffer.from(ttsResult).toString('base64');
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

    return NextResponse.json({ url: audioUrl });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '変換処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 