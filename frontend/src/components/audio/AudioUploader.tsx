import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  onFileSelected: (file: File) => void
}

export default function AudioUploader({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = (file: File) => {
    setSelectedFile(file)
    onFileSelected(file)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
      {selectedFile ? (
        <p className="text-blue-600 font-medium">{selectedFile.name}</p>
      ) : (
        <>
          <p className="text-gray-600 font-medium">파일을 여기에 드래그하거나 클릭하여 선택</p>
          <p className="text-gray-400 text-sm mt-1">MP3, MP4, WAV, M4A, WebM (최대 200MB)</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
