import { useState, useCallback } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';
import Cropper from 'react-easy-crop';

export default function PhotoUpload({ onPhotoSelected, currentPhoto = null }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [preview, setPreview] = useState(currentPhoto);
  const [error, setError] = useState('');
  const [isCropping, setIsCropping] = useState(false);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPG/PNG files allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      setPreview(croppedImage);
      setIsCropping(false);
      
      // Convert to blob and pass to parent
      const blob = await fetch(croppedImage).then(r => r.blob());
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      onPhotoSelected(file);
    } catch (err) {
      setError('Failed to crop image');
    }
  };

  const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 400;
        canvas.height = 400;

        ctx.drawImage(
          image,
          pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
          0, 0, 400, 400
        );

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
  };

  const handleRemove = () => {
    setImageSrc(null);
    setPreview(null);
    setIsCropping(false);
    setError('');
    onPhotoSelected(null);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-navy mb-2">
        Upload Your Photo *
      </label>

      {!isCropping && !preview && (
        <div className="border-2 border-dashed border-ink/20 rounded-xl p-8 text-center hover:border-ochre transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={onFileChange}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            <Camera className="w-12 h-12 text-ochre mx-auto mb-3" />
            <p className="text-sm font-bold text-navy mb-1">Click to upload photo</p>
            <p className="text-xs text-ink-soft">JPG/PNG, max 5MB • You'll be able to crop it</p>
          </label>
        </div>
      )}

      {isCropping && imageSrc && (
        <div className="space-y-4">
          <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink-soft">Zoom</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-ochre"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setIsCropping(false); setImageSrc(null); }}
              className="flex-1 py-2 border border-ink/15 rounded-lg text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCrop}
              className="flex-1 py-2 bg-ochre text-white rounded-lg text-sm font-bold"
            >
              Use This Photo
            </button>
          </div>
        </div>
      )}

      {!isCropping && preview && (
        <div className="flex items-center gap-4 p-4 bg-atmosphere rounded-xl">
          <img
            src={preview}
            alt="Preview"
            className="w-20 h-20 rounded-full object-cover border-2 border-ochre"
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-navy">Photo ready ✓</p>
            <p className="text-xs text-ink-soft">This will be used for your ID card</p>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 hover:bg-white rounded-lg text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <p className="text-xs text-ink-soft">
        ⓘ Your photo will be used for conference ID cards and verification. 
        You won't be able to view it after submission, but admins can access it for official purposes.
      </p>
    </div>
  );
}
