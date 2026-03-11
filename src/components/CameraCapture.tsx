import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Could not access camera. Please check permissions.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(base64);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-lg aspect-[4/3] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
              <div className="w-full h-full border-2 border-white/30 rounded-2xl" />
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} width={640} height={480} className="hidden" />

      <div className="mt-12 flex items-center space-x-8">
        <button
          onClick={onCancel}
          className="px-8 py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={takePhoto}
          className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <div className="w-20 h-20 rounded-full border-4 border-black flex items-center justify-center">
            <Camera size={40} className="text-black" />
          </div>
        </button>
        <div className="w-24" /> {/* Spacer to balance cancel button */}
      </div>
      
      <p className="mt-8 text-zinc-400 font-medium animate-pulse">
        Position your face in the center
      </p>
    </div>
  );
};
