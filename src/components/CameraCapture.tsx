import { useRef } from "react";

interface CameraCaptureProps {
  disabled: boolean;
  onCapture: (file: File) => void;
}

export function CameraCapture({ disabled, onCapture }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onCapture(file);
    }
  }

  return (
    <div className="camera-capture">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
      <div className="capture-buttons">
        <button
          type="button"
          className="capture-button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
        >
          📷 Foto aufnehmen
        </button>
        <button
          type="button"
          className="capture-button capture-button-secondary"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
        >
          🖼️ Aus Galerie wählen
        </button>
      </div>
    </div>
  );
}
