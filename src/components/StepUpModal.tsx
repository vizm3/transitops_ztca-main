import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle, AlertTriangle, X } from 'lucide-react';

export interface StepUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (token: string) => void;
  onVerifySuccess?: (token: string) => void;
  actionName?: string;
  reason?: string;
  riskScore?: number;
}

export default function StepUpModal({
  isOpen,
  onClose,
  onSuccess,
  onVerifySuccess,
  actionName = 'Sensitive Operation',
  reason = 'Elevated context risk score detected.',
  riskScore = 60
}: StepUpModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your 4-digit MFA verification PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ztca/verify-stepup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Invalid verification PIN.');
        setLoading(false);
        return;
      }

      const callback = onSuccess || onVerifySuccess;
      if (callback) callback(data.stepUpToken);
      setPin('');
      setLoading(false);
    } catch (err: any) {
      setError('Verification server error. Try entering PIN: 1234');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-amber-200 max-w-md w-full p-6 relative overflow-hidden">
        {/* Header Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-full hover:bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              ZTCA Step-Up Challenge
            </span>
            <h3 className="text-lg font-bold text-neutral-900 mt-0.5">Verification Required</h3>
          </div>
        </div>

        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg mb-5 text-xs text-amber-900 space-y-1">
          <div className="flex items-center justify-between font-semibold">
            <span>Action: {actionName}</span>
            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">
              Risk Score: {riskScore}/100
            </span>
          </div>
          <p className="text-neutral-600 text-[11px] leading-relaxed mt-1">
            {reason}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              Enter 4-Digit Security PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Default PIN: 1234"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-center tracking-[0.5em] font-mono text-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all outline-none"
              autoFocus
            />
            <p className="text-[10px] text-neutral-400 mt-1 text-center">
              Demo PIN code: <span className="font-mono font-bold text-amber-700">1234</span>
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Authorize & Continue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
