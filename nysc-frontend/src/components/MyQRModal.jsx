import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, User, CheckCircle } from 'lucide-react';
import { request } from '../lib/api';

export default function MyQRModal({ onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQR();
  }, []);

  const fetchQR = async () => {
    try {
      const data = await request('/auth/me/qr');
      setQrData(data);
    } catch (err) {
      setError(err.message || 'Failed to load QR');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const svg = document.querySelector('#my-qr-code svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 600;
    canvas.height = 600;
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 0, 0, 600, 600);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `my-qr-${qrData.user_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = pngUrl;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-soft hover:text-navy hover:bg-atmosphere rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-ochre/30 border-t-ochre rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-ink-soft">Loading your QR code...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchQR} className="mt-4 text-sm text-ochre font-bold hover:underline">
              Try Again
            </button>
          </div>
        )}

        {qrData && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-full mb-3">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-display font-bold text-navy">My Personal QR</h2>
              <p className="text-xs text-ink-soft mt-1">
                Show this for attendance and meal claims
              </p>
            </div>

            {/* QR Code */}
            <div id="my-qr-code" className="flex justify-center mb-6">
              <div className="p-5 bg-white border-4 border-navy rounded-2xl">
                <QRCodeSVG
                  value={qrData.qr_data}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* User Info */}
            <div className="text-center space-y-1 mb-6">
              <p className="text-base font-bold text-navy">{qrData.user_name}</p>
              <p className="text-sm text-ink-soft">{qrData.user_email}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="px-3 py-1 text-xs font-bold bg-ochre/10 text-ochre rounded-full capitalize">
                  {qrData.role.replace('_', ' ')}
                </span>
                {qrData.department && (
                  <span className="px-3 py-1 text-xs font-bold bg-navy/10 text-navy rounded-full capitalize">
                    {qrData.department}
                  </span>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-atmosphere rounded-lg p-3 mb-4">
              <p className="text-xs text-ink-soft flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-moss flex-shrink-0 mt-0.5" />
                <span>
                  This QR is unique to you. Volunteers and admins can scan it to mark your attendance or meal claims.
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-ink/15 text-navy text-sm font-bold rounded-lg hover:bg-atmosphere transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
