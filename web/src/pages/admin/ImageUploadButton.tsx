import { useRef, useState } from 'react'
import { uploadProductImage } from '../../lib/uploadImage'
import ImageCropModal from './ImageCropModal'

interface ImageUploadButtonProps {
  onUploaded: (url: string) => void
  label?: string
  variant?: 'primary' | 'add'
  aspect?: number // width / height for the crop frame — defaults to 4:3
}

// A file-picker button: pick a photo, adjust it (zoom/pan/crop) in a modal,
// then Save uploads the cropped result to Supabase Storage and hands back
// the public URL. Discard cancels without uploading anything.
export default function ImageUploadButton({ onUploaded, label, variant = 'add', aspect = 4 / 3 }: ImageUploadButtonProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setError(null)
      setPendingFile(file)
    }
  }

  const discard = () => {
    setPendingFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const save = async (blob: Blob) => {
    setUploading(true)
    try {
      const url = await uploadProductImage(blob)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      setPendingFile(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <button
        type="button"
        className={variant === 'primary' ? 'rk-admin-primary-btn' : 'rk-admin-add-btn'}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : (label ?? '+ Upload Image')}
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleChange} />
      {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', margin: '0.375rem 0 0' }}>{error}</p>}
      {pendingFile && <ImageCropModal file={pendingFile} aspect={aspect} onSave={save} onDiscard={discard} />}
    </div>
  )
}
