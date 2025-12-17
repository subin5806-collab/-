import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onEnd: (dataUrl: string | null) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd }) => {
  const sigPad = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Function to handle canvas resizing for Retina/High-DPI displays
  // This fixes the "doesn't follow well" issue on iPads/Tablets
  const resizeCanvas = () => {
    if (sigPad.current && containerRef.current) {
      const canvas = sigPad.current.getCanvas();
      const container = containerRef.current;
      
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      // Store current content to restore after resize if needed (optional)
      // For this simple implementation, we might clear it or keep it. 
      // To keep it simple and performant, we just set dimensions.
      // If preserving data is needed during rotate, we'd need to save/restore data.
      
      canvas.width = container.offsetWidth * ratio;
      canvas.height = container.offsetHeight * ratio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
      }
      
      // Reset signature pad internal state for the new dimensions
      // This allows the library to calculate coordinates correctly
      // Note: This clears the canvas. In a real scenario, you might want to debounce this 
      // or save/restore the stroke data.
      sigPad.current.clear(); 
      setIsEmpty(true);
      onEnd(null);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    // Initial resize
    setTimeout(resizeCanvas, 100); 

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const clear = () => {
    sigPad.current?.clear();
    setIsEmpty(true);
    onEnd(null);
  };

  const handleEnd = () => {
    if (sigPad.current) {
      if (sigPad.current.isEmpty()) {
        setIsEmpty(true);
        onEnd(null);
      } else {
        setIsEmpty(false);
        // Save as PNG
        onEnd(sigPad.current.getTrimmedCanvas().toDataURL('image/png'));
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 
        touch-action: none is critical for preventing page scroll while signing on touch devices.
        Ref is added to container to calculate dimensions.
      */}
      <div 
        ref={containerRef}
        className="border border-stone-200 rounded-lg bg-white overflow-hidden relative shadow-inner h-64"
        style={{ touchAction: 'none' }} 
      >
        <SignatureCanvas
          ref={sigPad}
          penColor="#1c1917" // Stone-900
          minWidth={1.0}
          maxWidth={2.5}
          velocityFilterWeight={0.7} // Adjusts smoothness
          canvasProps={{
            className: "w-full h-full block bg-stone-50/30",
            style: { width: '100%', height: '100%' } // Force full size
          }}
          onEnd={handleEnd}
        />
        <div className="absolute top-4 right-4 pointer-events-none opacity-30">
          <span className="font-serif text-stone-900 italic text-lg">서명(Sign)</span>
        </div>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-stone-400 text-sm">이 영역에 서명해 주세요</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={clear}
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-red-600 transition-colors px-3 py-2 rounded hover:bg-stone-100"
        >
          <Eraser size={14} />
          서명 지우기
        </button>
      </div>
    </div>
  );
};