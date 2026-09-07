"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { updateUserProfile, uploadAvatar, UserProfileData } from '@/app/actions/profile'
import Cropper, { Point, Area } from 'react-easy-crop'
import { useRouter } from 'next/navigation'
import { User, ArrowLeft, Upload, X, Eye, Edit3 } from 'lucide-react'
import Link from 'next/link'

import DOMPurify from 'isomorphic-dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'

// Inline-styled markdown components to avoid CSS module/Tailwind conflicts
const markdownComponents = {
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.75rem 0 0.5rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.3rem' }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.75rem 0 0.4rem 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.2rem' }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0.6rem 0 0.3rem 0' }} {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: React.ComponentPropsWithoutRef<'h4'>) => (
    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0.5rem 0 0.25rem 0' }} {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: React.ComponentPropsWithoutRef<'h5'>) => (
    <h5 style={{ fontSize: '0.925rem', fontWeight: 600, margin: '0.4rem 0 0.2rem 0' }} {...props}>{children}</h5>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p style={{ fontSize: '0.875rem', margin: '0 0 0.6rem 0', lineHeight: 1.7 }} {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', margin: '0.3rem 0 0.6rem 0' }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', margin: '0.3rem 0 0.6rem 0' }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li style={{ margin: '0.2rem 0', display: 'list-item' }} {...props}>{children}</li>
  ),
  a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a style={{ color: '#2563eb', textDecoration: 'underline' }} {...props}>{children}</a>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote style={{ borderLeft: '3px solid #d1d5db', margin: '0.75rem 0', padding: '0.15rem 1rem', color: '#6b7280', fontStyle: 'normal' }} {...props}>{children}</blockquote>
  ),
  code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return <code style={{ background: 'transparent', padding: 0, display: 'block', whiteSpace: 'pre', overflow: 'auto', fontFamily: 'monospace' }} className={className} {...props}>{children}</code>
    }
    return <code style={{ backgroundColor: '#f3f4f6', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>{children}</code>
  },
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre style={{ backgroundColor: '#f6f8fa', padding: '10px', borderRadius: '6px', overflow: 'auto', margin: '0.5rem 0', border: '1px solid #e5e7eb' }} {...props}>{children}</pre>
  ),
  hr: (props: React.ComponentPropsWithoutRef<'hr'>) => (
    <hr style={{ border: 'none', height: '1px', backgroundColor: '#e5e7eb', margin: '1rem 0' }} {...props} />
  ),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0.5rem 0', fontSize: '0.85rem' }} {...props}>{children}</table>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
    <th style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.6rem', textAlign: 'left', backgroundColor: '#f9fafb', fontWeight: 600 }} {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
    <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.6rem', textAlign: 'left' }} {...props}>{children}</td>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong style={{ fontWeight: 700 }} {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: React.ComponentPropsWithoutRef<'em'>) => (
    <em style={{ fontStyle: 'italic' }} {...props}>{children}</em>
  ),
  del: ({ children, ...props }: React.ComponentPropsWithoutRef<'del'>) => (
    <del style={{ textDecoration: 'line-through', color: '#9ca3af' }} {...props}>{children}</del>
  ),
  img: (props: React.ComponentPropsWithoutRef<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0.5rem 0', borderRadius: '6px' }} alt="" {...props} />
  ),
}


type ProfileEditFormProps = {
  userProfile: UserProfileData
  avatarSignedUrl: string | null
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

export function ProfileEditForm({ userProfile, avatarSignedUrl }: ProfileEditFormProps) {
  const [bio, setBio] = useState(userProfile.user_profiles?.bio || '')
  const [previewMode, setPreviewMode] = useState(false)

  // Image crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
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
      setSuccessMsg('')
      const reader = new FileReader()
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null))
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      let avatarUrl = userProfile.user_profiles?.avatar_url || null

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
      setSuccessMsg('プロフィールを保存しました')
      setImageSrc(null)
      router.refresh()
    } catch (err: unknown) {
      console.error(err)
      const message = err instanceof Error ? err.message : '保存に失敗しました'
      setErrorMsg(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            プロフィール編集
          </h1>
          <p className="text-sm text-muted-foreground">
            あなたの情報を更新します。名前や学籍番号は変更できません。
          </p>
        </div>
      </div>

      {/* Status messages */}
      {errorMsg && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Main content in two-column layout on larger screens */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column: Avatar & basic info */}
        <div className="space-y-6">
          {/* Avatar section */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">アバター画像</h2>
            <div className="flex flex-col items-center gap-4">
              {/* Current avatar display */}
              {!imageSrc && (
                avatarSignedUrl ? (
                  <img
                    src={avatarSignedUrl}
                    alt="現在のアバター"
                    className="h-32 w-32 rounded-full object-cover bg-muted"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )
              )}

              {/* Cropper */}
              {imageSrc && (
                <div className="relative h-64 w-full rounded-lg bg-black overflow-hidden">
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

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  画像を選択
                </Button>
                {imageSrc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setImageSrc(null)}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    クリア
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                jpg, png, webp形式 / 2MB以下
              </p>
            </div>
          </div>

          {/* Read-only info */}
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground">基本情報（読取専用）</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">名前</label>
                <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  {userProfile.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">クラス</label>
                  <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {userProfile.className || '未設定'}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">学籍番号</label>
                  <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    {userProfile.studentId || '未設定'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Bio editor */}
        <div className="md:col-span-2">
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                自己紹介
              </h2>
              <div className="flex gap-1 rounded-lg border bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    !previewMode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    previewMode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  プレビュー
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="min-h-[300px] rounded-md border bg-muted/30 px-4 py-3" style={{ fontSize: '0.875rem', lineHeight: 1.7, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {bio ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                  >
                    {DOMPurify.sanitize(bio)}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    自己紹介が入力されていません
                  </p>
                )}
              </div>
            ) : (
              <textarea
                className="min-h-[300px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="自己紹介を入力してください...&#10;&#10;マークダウン記法が使えます:&#10;**太字** _斜体_ ~~取り消し線~~&#10;- リスト項目&#10;[リンク](https://example.com)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            )}

            <p className="mt-2 text-xs text-muted-foreground">
              マークダウン記法に対応しています。プレビュータブで表示を確認できます。
            </p>
          </div>
        </div>
      </div>

      {/* Footer action buttons */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button variant="outline" asChild>
          <Link href="/">キャンセル</Link>
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存する'}
        </Button>
      </div>
    </div>
  )
}
