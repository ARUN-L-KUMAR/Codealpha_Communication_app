import React, { useState, useRef } from 'react'
import { Upload, Download, File, X, FileText, Image, Video, Music } from 'lucide-react'
import toast from 'react-hot-toast'

const FileSharing = ({ socket, roomId, files, onClose }) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      return <Image size={20} className="text-blue-500" />
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension)) {
      return <Video size={20} className="text-purple-500" />
    } else if (['mp3', 'wav', 'flac', 'aac'].includes(extension)) {
      return <Music size={20} className="text-green-500" />
    } else if (['txt', 'doc', 'docx', 'pdf'].includes(extension)) {
      return <FileText size={20} className="text-red-500" />
    } else {
      return <File size={20} className="text-gray-500" />
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileSelect = (files) => {
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const fileData = {
          fileName: file.name,
          fileSize: file.size,
          fileData: e.target.result,
          roomId
        }

        socket?.emit('file-share', fileData)
        toast.success(`File ${file.name} shared successfully!`)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    handleFileSelect(droppedFiles)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInputChange = (e) => {
    const selectedFiles = e.target.files
    if (selectedFiles.length > 0) {
      handleFileSelect(selectedFiles)
    }
  }

  const downloadFile = (file) => {
    try {
      const link = document.createElement('a')
      link.href = file.data
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Downloaded ${file.name}`)
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const isImage = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">File Sharing</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-4 border-b">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              Drag and drop files here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="font-medium mb-3">Shared Files ({files.length})</h4>
          
          {files.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <File size={48} className="mx-auto mb-2 opacity-50" />
              <p>No files shared yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>by {file.sender.name}</span>
                        <span>•</span>
                        <span>{new Date(file.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isImage(file.name) && (
                      <button
                        onClick={() => {
                          const img = new Image()
                          img.src = file.data
                          const newWindow = window.open()
                          newWindow.document.write(`<img src="${file.data}" style="max-width:100%;height:auto;" />`)
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-100 rounded"
                        title="Preview"
                      >
                        <Image size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => downloadFile(file)}
                      className="p-2 text-green-500 hover:bg-green-100 rounded"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileSharing
