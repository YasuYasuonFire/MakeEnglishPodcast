'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios, { AxiosError } from 'axios';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.flac', '.m4a']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      try {
        setIsProcessing(true);
        setError(null);
        setStatus('音声ファイルをアップロード中...');
        
        const formData = new FormData();
        formData.append('audio', acceptedFiles[0]);
        
        const response = await axios.post('/api/convert', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            setStatus(`アップロード中... ${progress}%`);
          },
        });
        
        setDownloadUrl(response.data.url);
        setStatus('変換が完了しました！');
      } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'エラーが発生しました。もう一度お試しください。';
        
        if (error instanceof AxiosError && error.response?.data?.error) {
          errorMessage = error.response.data.error;
          console.error('API Error Details:', error.response.data.details);
        }
        
        setError(errorMessage);
        setStatus('');
      } finally {
        setIsProcessing(false);
      }
    }
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          音声変換アプリ
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
          >
            <input {...getInputProps()} />
            <p className="text-lg mb-2">
              {isDragActive
                ? 'ここにファイルをドロップ'
                : '音声ファイルをドラッグ＆ドロップ、またはクリックして選択'}
            </p>
            <p className="text-sm text-gray-500">
              対応形式: MP3, WAV, FLAC, M4A (最大100MB)
            </p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {isProcessing && (
            <div className="mt-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg">{status}</p>
            </div>
          )}

          {downloadUrl && !isProcessing && (
            <div className="mt-8 text-center">
              <a
                href={downloadUrl}
                download
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                変換された音声をダウンロード
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
