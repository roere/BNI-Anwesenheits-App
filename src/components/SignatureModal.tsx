"use client";

import { useRef, useEffect, useState } from "react";
import SignaturePad from "signature_pad";

interface SignatureModalProps {
  name: string;
  disclaimerText: string;
  isGuest?: boolean;
  needsBreakfast?: boolean;
  visitCount?: number;
  onComplete: (signatureData: string) => void;
  onClose: () => void;
}

export default function SignatureModal({
  name,
  disclaimerText,
  isGuest,
  needsBreakfast,
  visitCount,
  onComplete,
  onClose,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const container = canvas.parentElement!;

      canvas.width = container.offsetWidth * ratio;
      canvas.height = 250 * ratio;
      canvas.style.width = `${container.offsetWidth}px`;
      canvas.style.height = "250px";

      const ctx = canvas.getContext("2d")!;
      ctx.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });

      signaturePadRef.current.addEventListener("endStroke", () => {
        setIsEmpty(signaturePadRef.current?.isEmpty() ?? true);
      });
    }

    return () => {
      signaturePadRef.current?.off();
    };
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) return;
    if (!disclaimerAccepted) return;
    const data = signaturePadRef.current.toDataURL("image/png");
    onComplete(data);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-bni-red text-white rounded-t-2xl">
          <h2 className="text-2xl font-bold">{name}</h2>
          {isGuest && (
            <p className="text-sm opacity-90">
              Gast - Besuch #{(visitCount || 0) + 1}
              {needsBreakfast && " | Frühstück erforderlich"}
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="p-6 border-b">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-bni-gray max-h-40 overflow-y-auto mb-4">
            {disclaimerText}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-1 w-6 h-6 accent-bni-red flex-shrink-0"
            />
            <span className="text-base font-medium text-bni-gray">
              Ich bestätige die obige Erklärung
            </span>
          </label>
        </div>

        {/* Frühstück-Hinweis für Gäste */}
        {isGuest && needsBreakfast && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
            <p className="font-bold text-yellow-800">
              Frühstück bitte bezahlen (ab 2. Besuch)
            </p>
          </div>
        )}

        {/* Signature Pad */}
        <div className="p-6">
          <p className="text-sm text-bni-gray mb-2 font-medium">
            Unterschrift:
          </p>
          <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="touch-none" />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleClear}
              className="flex-1 p-3 rounded-xl border-2 border-gray-300 text-bni-gray font-medium active:scale-95 transition-all"
            >
              Löschen
            </button>
            <button
              onClick={handleConfirm}
              disabled={isEmpty || !disclaimerAccepted}
              className="flex-1 p-3 rounded-xl bg-green-500 text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40"
            >
              Bestätigen
            </button>
          </div>
        </div>

        {/* Abbrechen */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full p-3 rounded-xl text-bni-gray font-medium hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
