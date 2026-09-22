import { useRef } from "react";

interface CameraCaptureProps {
  disabled: boolean;
  onCapture: (file: File) => void;
}

export function CameraCapture({ disabled, onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        hidden
      />
      <button
        type="button"
        className="capture-button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        📷 Foto aufnehmen oder auswählen
      </button>
    </div>
  );
}
