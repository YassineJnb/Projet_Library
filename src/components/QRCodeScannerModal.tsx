import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Image as ImageIcon, QrCode, RefreshCw, RotateCcw, Upload, X } from 'lucide-react';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  hint?: string;
  onDetected: (result: {
    rawText: string;
    title?: string;
    isbn?: string;
    author?: string;
    printingHouse?: string;
    copyId?: string;
    copyNumber?: number;
    barcode?: string;
  }) => void;
}

export const QRCodeScannerModal: React.FC<QRCodeScannerModalProps> = ({
  isOpen,
  onClose,
  title: modalTitle,
  hint,
  onDetected,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Start live video stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsPermissionDenied(false);
    setHasScanned(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your current browser or connection (requires HTTPS or localhost).');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Try back / environment camera first (ideal for QR codes)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
      } catch {
        // Fallback to default user camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      const isDenied =
        err instanceof Error &&
        (err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message.toLowerCase().includes('permission') ||
          err.message.toLowerCase().includes('denied'));

      if (isDenied) {
        setIsPermissionDenied(true);
        setCameraError(
          'Camera permission was denied. Your browser or preview frame blocked access to the camera.'
        );
      } else {
        setCameraError(
          'Unable to access camera on this device. Make sure no other application is using the camera.'
        );
      }
    }
  };

  // Process live camera frames
  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || hasScanned) return;

    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDecodedPayload(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Parse decoded QR data
  const handleDecodedPayload = (rawText: string) => {
    setHasScanned(true);
    stopCamera();

    let title: string | undefined;
    let isbn: string | undefined;
    let author: string | undefined;
    let printingHouse: string | undefined;
    let copyId: string | undefined;
    let copyNumber: number | undefined;
    let barcode: string | undefined;

    try {
      const parsed = JSON.parse(rawText);
      if (typeof parsed === 'object' && parsed !== null) {
        title = parsed.title;
        isbn = parsed.isbn;
        author = parsed.author;
        printingHouse = parsed.printingHouse;
        copyId = parsed.copyId;
        copyNumber = typeof parsed.copyNumber === 'number' ? parsed.copyNumber : undefined;
        barcode = parsed.barcode;
      }
    } catch {
      const trimmed = rawText.trim();
      // Not JSON, might be raw copyId/barcode, ISBN, or title
      if (/^(BK|bk)-\d+-C\d+$/i.test(trimmed) || /^FD-\d+-\d+$/i.test(trimmed)) {
        copyId = trimmed;
        barcode = trimmed;
      } else if (/^97[89][-0-9X]+$/i.test(trimmed)) {
        isbn = trimmed;
      } else {
        title = trimmed;
      }
    }

    onDetected({
      rawText,
      title,
      isbn,
      author,
      printingHouse,
      copyId,
      copyNumber,
      barcode,
    });
    onClose();
  };

  // Handle uploaded image file
  const handleImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setUploadError('Canvas context could not be initialized.');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleDecodedPayload(code.data);
        } else {
          setUploadError(
            'No readable QR code found in this image. Please try another image or screenshot.'
          );
        }
      };
      img.onerror = () => {
        setUploadError('Failed to load image. Please try another file.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHasScanned(false);
      setUploadError(null);
      setCameraError(null);
      setIsPermissionDenied(false);
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-stone-900" />
            <h2 className="text-sm font-bold text-stone-900">{modalTitle || 'QR Code Scanner'}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 bg-stone-50/50">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Use Camera</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'text-stone-900 border-b-2 border-stone-900 bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 text-left">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                    <Camera className="w-4 h-4 text-amber-700" />
                    <span>{isPermissionDenied ? 'Camera Permission Denied' : 'Camera Unavailable'}</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {cameraError}
                  </p>

                  <div className="pt-2 text-[11px] text-stone-600 bg-white/70 p-2.5 rounded border border-amber-100 space-y-1">
                    <p className="font-semibold text-stone-800">How to allow camera:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-stone-600">
                      <li>Click the <strong>Lock / Camera icon</strong> in your browser URL bar.</li>
                      <li>Switch <strong>Camera</strong> permission to <strong>Allow</strong>.</li>
                      <li>Click <strong>&ldquo;Retry Camera&rdquo;</strong> below or refresh the page.</li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-square max-w-[280px] mx-auto bg-stone-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Viewfinder Target Frame */}
                  <div className="absolute inset-8 pointer-events-none border-2 border-white/60 rounded-lg flex flex-col justify-between p-2 shadow-2xs">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    {/* Animated scanning beam */}
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {!isScanning && (
                    <div className="absolute inset-0 bg-stone-950/80 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-stone-300" />
                      <span>Requesting camera permission...</span>
                    </div>
                  )}
                </div>
              )}

              {!cameraError && (
                <p className="text-center text-xs text-stone-500">
                  {hint || 'Point your camera at any book QR code. It will detect and open the book automatically.'}
                </p>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-xl p-8 text-center bg-stone-50/70 hover:bg-stone-50 transition-colors cursor-pointer space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-stone-200/80 flex items-center justify-center text-stone-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900">
                    Click to browse or drag & drop an image
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Supports PNG, JPG, or screenshots of the book QR code
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {uploadError && (
                <div className="text-xs p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-center">
                  {uploadError}
                </div>
              )}

              <div className="text-center">
                <span className="text-[11px] text-stone-400 font-mono">
                  Tip: You can use any saved QR code downloaded from the book list.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
