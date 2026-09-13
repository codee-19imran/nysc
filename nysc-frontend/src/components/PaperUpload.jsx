import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { request } from '../lib/api';
import DeadlineCountdown from './DeadlineCountdown';

export default function PaperUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [deadlineData, setDeadlineData] = useState(null);

  useEffect(() => {
    request('/settings/public/deadlines').then(data => {
      setDeadlineData(data.paper_submission);
    }).catch(console.error);
  }, []);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, complete, submitting, done, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files allowed');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }
    
    setError('');
    setFile(selectedFile);
    uploadFile(selectedFile);
  };

  const uploadFile = (file) => {
    setUploadState('uploading');
    setProgress(0);
    
    const token = localStorage.getItem('nysc_token');
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState('complete');
        setProgress(100);
      } else {
        setUploadState('error');
        setError('Upload failed. Please try again.');
      }
    };
    
    xhr.onerror = () => {
      setUploadState('error');
      setError('Network error. Please check your connection.');
    };
    
    xhr.open('POST', 'http://127.0.0.1:8000/paper/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleSubmit = async () => {
    setUploadState('submitting');
    try {
      await request('/paper/submit', { method: 'POST' });
      setUploadState('done');
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setUploadState('error');
      setError(err.message || 'Submission failed');
    }
  };

  const handleRetry = () => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
    setError('');
  };

  // If closed, show closed message and don't render upload UI
  if (deadlineData?.status === 'closed') {
    return (
      <div className="bg-white rounded-xl border border-ink/10 p-6">
        <DeadlineCountdown type="paper_submission" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-6">
      <div className="mb-4">
        <DeadlineCountdown type="paper_submission" />
      </div>
      
      <h3 className="text-lg font-display font-bold text-navy mb-4">Upload Your Paper</h3>
      
      {/* IDLE STATE: File selection */}
      {uploadState === 'idle' && (
        <div className="border-2 border-dashed border-ink/20 rounded-xl p-8 text-center hover:border-ochre transition-colors">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="paper-upload"
          />
          <label htmlFor="paper-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-ochre mx-auto mb-3" />
            <p className="text-sm font-bold text-navy mb-1">Click to upload PDF</p>
            <p className="text-xs text-ink-soft">Max 10MB • Progress will be shown</p>
          </label>
        </div>
      )}

      {/* UPLOADING STATE: Progress bar */}
      {uploadState === 'uploading' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-ochre" />
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">{file.name}</p>
              <p className="text-xs text-ink-soft">Uploading... {progress}%</p>
            </div>
            <Loader2 className="w-5 h-5 text-ochre animate-spin" />
          </div>
          <div className="w-full bg-atmosphere rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-ochre to-ochre/80 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-ink-soft text-center">
            Please don't close this page
          </p>
        </div>
      )}

      {/* COMPLETE STATE: Ready to submit */}
      {uploadState === 'complete' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-800">Upload complete ✓</p>
              <p className="text-xs text-green-700">{file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-ochre text-white font-bold rounded-xl hover:bg-ochre/90"
          >
            Submit Paper for Review
          </button>
        </div>
      )}

      {/* SUBMITTING STATE */}
      {uploadState === 'submitting' && (
        <div className="flex items-center justify-center gap-3 p-6">
          <Loader2 className="w-6 h-6 text-ochre animate-spin" />
          <p className="text-sm font-bold text-navy">Submitting for review...</p>
        </div>
      )}

      {/* DONE STATE */}
      {uploadState === 'done' && (
        <div className="text-center p-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-navy mb-1">Paper Submitted!</p>
          <p className="text-sm text-ink-soft">Your paper is now under review. You'll be notified of the decision.</p>
        </div>
      )}

      {/* ERROR STATE */}
      {uploadState === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800">Upload failed</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="w-full py-2 border border-ink/15 rounded-xl text-sm font-bold"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
