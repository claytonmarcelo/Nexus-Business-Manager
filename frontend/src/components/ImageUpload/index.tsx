import { useState, useRef, useCallback } from 'react'
import { PhotoIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (imageUrl: string) => void
  label: string
  size?: 'sm' | 'md' | 'lg'
  aspectRatio?: 'square' | 'landscape' | 'portrait'
}

export function ImageUpload({ currentImage, onImageChange, label, size = 'md', aspectRatio = 'square' }: ImageUploadProps) {
  const [preview, setPreview] = useState(currentImage || '')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadIntervalRef = useRef<number | null>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const aspectRatioClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo é muito grande. Máximo 5MB.')
      return
    }

    setUploading(true)
    setProgress(0)
    setTimeRemaining(0)

    // Criar preview local
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Simular upload com progresso
    let currentProgress = 0
    const totalSize = file.size
    const uploadSpeed = 1024 * 1024 // 1MB/s simulado
    const estimatedTime = totalSize / uploadSpeed

    uploadIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 10
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(uploadIntervalRef.current!)
        setUploading(false)
        onImageChange(preview || reader.result as string)
      }
      setProgress(currentProgress)
      
      const remainingBytes = totalSize * (1 - currentProgress / 100)
      const remainingSeconds = Math.ceil(remainingBytes / uploadSpeed)
      setTimeRemaining(remainingSeconds)
    }, 200)
  }, [onImageChange, preview])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemove = useCallback(() => {
    setPreview('')
    onImageChange('')
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current)
    }
    setUploading(false)
    setProgress(0)
    setTimeRemaining(0)
  }, [onImageChange])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
        {label}
      </label>
      
      <div className="flex items-start gap-4">
        <div
          className={`${sizeClasses[size]} ${aspectRatioClasses[aspectRatio]} rounded-lg flex items-center justify-center border-2 border-dashed transition-all duration-200 relative overflow-hidden`}
          style={{
            borderColor: dragOver ? 'var(--nexus-gold)' : 'var(--nexus-border)',
            background: 'var(--nexus-bg)',
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {preview ? (
            <>
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white text-sm font-medium">{Math.round(progress)}%</div>
                    <div className="text-white/70 text-xs">{formatTime(timeRemaining)}</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-2">
              <CloudArrowUpIcon className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--nexus-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                {dragOver ? 'Solte a imagem' : 'Arraste ou clique'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--nexus-card-soft)',
              border: '1px solid var(--nexus-border)',
              color: 'var(--nexus-text)',
            }}
          >
            Selecionar Imagem
          </button>

          {preview && (
            <button
              onClick={handleRemove}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: 'rgba(var(--nexus-rose-rgb), 0.1)',
                border: '1px solid var(--nexus-rose)',
                color: 'var(--nexus-rose)',
              }}
            >
              <XMarkIcon className="w-4 h-4" />
              Remover
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      </div>

      {uploading && (
        <div className="mt-2">
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--nexus-border)' }}>
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--nexus-gold), var(--nexus-bronze))',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--nexus-muted)' }}>
            <span>Enviando...</span>
            <span>{formatTime(timeRemaining)} restantes</span>
          </div>
        </div>
      )}
    </div>
  )
}
