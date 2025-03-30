import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // 環境変数のチェック
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }
    if (!process.env.ELEVENLABS_VOICE_ID) {
      throw new Error('ELEVENLABS_VOICE_ID is not set');
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: '音声ファイルが見つかりません' },
        { status: 400 }
      );
    }

    console.log('音声ファイル情報:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    try {
      const audioBuffer = await audioFile.arrayBuffer();
      console.log('音声バッファーサイズ:', audioBuffer.byteLength);

      // 1. 音声をテキストに変換（ASR）
      const sttFormData = new FormData();
      sttFormData.append('file', audioFile);
      sttFormData.append('model_id', 'scribe_v1');

      const transcriptionResponse = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: sttFormData
      });

      if (!transcriptionResponse.ok) {
        throw new Error(`音声認識に失敗しました: ${transcriptionResponse.statusText}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      console.log('文字起こし結果:', transcriptionResult);

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

      console.log('翻訳結果:', translatedText);

      // 3. 英語テキストを音声に変換
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: translatedText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!ttsResponse.ok) {
        throw new Error(`音声生成に失敗しました: ${ttsResponse.statusText}`);
      }

      // 音声データを取得
      const outputAudioBuffer = await ttsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(outputAudioBuffer).toString('base64');
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

      return NextResponse.json({ url: audioUrl });
    } catch (error) {
      console.error('処理中のエラー詳細:', error);
      throw error;
    }
  } catch (error) {
    console.error('エラー発生:', error);
    
    let errorMessage = '変換処理中にエラーが発生しました';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 