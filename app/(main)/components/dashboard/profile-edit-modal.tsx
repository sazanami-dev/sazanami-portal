"use client"

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { updateUserProfile, uploadAvatar, UserProfileData } from '@/app/actions/profile'
import Cropper, { Point, Area } from 'react-easy-crop'

type ProfileEditModalProps = {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfileData
  onUpdated: () => void
}

// Utility to crop image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Set standard sizes for avatar
  canvas.width = 256
  canvas.height = 256

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/jpeg', 0.9)
  })
}

export function ProfileEditModal({ isOpen, onClose, userProfile, onUpdated }: ProfileEditModalProps) {
  const [bio, setBio] = useState(userProfile.user_profiles?.bio || '')
  
  // Image crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('画像サイズは2MB以下にしてください')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMsg('jpg, png, webp形式の画像を選択してください')
        return
      }
      setErrorMsg('')
      const reader = new FileReader()
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null))
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsUploading(true)
    setErrorMsg('')
    try {
      let avatarUrl = userProfile.user_profiles?.avatar_url || null

      // If there is a new image to crop and upload
      if (imageSrc && croppedAreaPixels) {
        const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
        if (croppedImageBlob) {
          const fileName = `${userProfile.id}/${Date.now()}.jpg`
          
          const formData = new FormData()
          formData.append('file', croppedImageBlob, 'avatar.jpg')
          formData.append('fileName', fileName)

          try {
            const result = await uploadAvatar(formData)
            avatarUrl = result.path
          } catch (uploadError: unknown) {
            const message = uploadError instanceof Error ? uploadError.message : '画像のアップロードに失敗しました'
            throw new Error(`アップロード失敗: ${message}`)
          }
        }
      }

      await updateUserProfile(bio, avatarUrl)
      onUpdated()
      onClose()
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : '保存に失敗しました'
      setErrorMsg(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>プロフィール編集</DialogTitle>
          <DialogDescription>
            あなたの情報を更新します。名前や学籍番号は変更できません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errorMsg && <p className="text-sm font-medium text-destructive">{errorMsg}</p>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">名前 (読取専用)</label>
            <div className="text-sm px-3 py-2 border rounded-md bg-muted text-muted-foreground">
              {userProfile.name}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">クラス (読取専用)</label>
              <div className="text-sm px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {userProfile.className || '未設定'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">学籍番号 (読取専用)</label>
              <div className="text-sm px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                {userProfile.studentId || '未設定'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">アバター画像</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                画像を選択...
              </Button>
              {imageSrc && (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setImageSrc(null)}>
                  クリア
                </Button>
              )}
            </div>
            
            {imageSrc && (
              <div className="relative mt-4 h-64 w-full bg-black rounded-md overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">自己紹介 (マークダウン対応)</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="自己紹介を入力してください..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>キャンセル</Button>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
