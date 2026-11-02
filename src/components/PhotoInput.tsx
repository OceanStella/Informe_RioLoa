import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useReport } from '../context/ReportContext';
import { createPhotoFromFile, isAcceptedImageType } from '../utils/images';
import type { PhotoData } from '../types/report';
import { ValidationMessage } from './ValidationMessage';

interface PhotoInputProps {
  activityId: string;
  which: 'before' | 'after';
  label: string;
  photo?: PhotoData;
  error?: string;
}

export function PhotoInput({ activityId, which, label, photo, error }: PhotoInputProps) {
  const { dispatch } = useReport();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImageType(file)) {
      alert('Formato no válido. Use JPEG, PNG o WebP.');
      return;
    }
    dispatch({ type: 'SET_PHOTO', activityId, which, photo: createPhotoFromFile(file) });
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_PHOTO', activityId, which });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="photo-field" data-field={`activity.${activityId}.photo.${which}`}>
      <span className="field-label">{label}</span>
      {photo ? (
        <div className="photo-preview-wrap">
          <img src={photo.previewUrl} alt={label} className="photo-preview" />
          <div className="photo-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
              <RefreshCw size={14} aria-hidden="true" />
              Reemplazar
            </button>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={handleRemove}>
              <Trash2 size={14} aria-hidden="true" />
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="photo-drop" onClick={() => inputRef.current?.click()}>
          <span className="photo-drop-icon" aria-hidden="true">
            <ImagePlus size={18} />
          </span>
          <span className="photo-drop-text">
            <span className="photo-drop-title">Seleccionar imagen</span>
            <span className="photo-drop-hint">JPEG, PNG o WebP</span>
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden-input"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <ValidationMessage message={error} />
    </div>
  );
}
