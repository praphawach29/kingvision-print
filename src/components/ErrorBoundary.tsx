import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, `React render — ${info.componentStack?.split('\n')[1]?.trim() ?? ''}`);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-black text-gray-900 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-gray-500 text-sm mb-6">
            ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด ทีมงานได้รับแจ้งเตือนแล้ว
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-kv-orange text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-500 transition-colors"
          >
            <RefreshCw size={16} /> โหลดหน้าใหม่
          </button>
        </div>
      </div>
    );
  }
}

export function reportError(error: Error | unknown, context?: string) {
  if (import.meta.env.DEV) {
    console.error('[ErrorReport]', context, error);
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  fetch('/api/error-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: err.message,
      stack: err.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: context || 'unknown',
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}
