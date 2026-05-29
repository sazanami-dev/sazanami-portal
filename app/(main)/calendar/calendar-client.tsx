"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CalendarClient({ googleCalendarId }: { googleCalendarId: string | null }) {
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false)
    const [loaded, setLoaded] = useState<boolean>(false)
    const [iframeError, setIframeError] = useState<boolean>(false)

    useEffect(() => {

        // 編集権限のチェック（サーバーAPIを参照）
        let cancelledAuth = false
            ; (async () => {
                try {
                    const res = await fetch('/api/calendar/authorized', { credentials: 'same-origin' })
                    if (!res.ok) return
                    const j = await res.json()
                    if (cancelledAuth) return
                    setIsAuthorized(!!j.isAuthorized)
                } catch (e) {
                    console.error('Failed to check calendar authorization', e)
                }
            })()

        return () => {
            cancelledAuth = true
        }
    }, [])

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
    }

    const innerStyle: React.CSSProperties = { width: '100%', height: '100%', maxWidth: '80rem' }

    if (googleCalendarId) {
        const src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleCalendarId)}&ctz=Asia%2FTokyo&mode=MONTH&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0`
        return (
            <div style={containerStyle}>
                {/* 編集ボタン */}
                {isAuthorized && (
                    <div style={{ position: 'absolute', top: 3, right: 72, zIndex: 30 }}>
                        <Link href="/calendar/edit">
                            <button style={{ padding: '6px 10px', fontSize: '13px', background: '#2563eb', color: 'white', borderRadius: 6, cursor: 'pointer', border: 'none' }}>
                                編集
                            </button>
                        </Link>
                    </div>
                )}

                <div style={innerStyle}>
                    {/* 読み込み中オーバーレイ */}
                    {!loaded && !iframeError && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                            <div className="rounded bg-white/70 px-4 py-2 shadow">読み込み中…</div>
                        </div>
                    )}

                    <iframe src={src} onLoad={() => setLoaded(true)} onError={() => setIframeError(true)} className="w-full h-full border-0 block" aria-label="Google Calendar" scrolling="no" />
                    {iframeError && (
                        <div className="p-8 text-center text-gray-500">
                            Google カレンダーを読み込むことが出来ませんでした。<br />
                            お手数ですが、開発班までお問い合わせください。
                        </div>
                    )}
                </div>
            </div>
        )
    }
    return (
        <div style={containerStyle}>
            <div className="p-8 text-center text-gray-500">
                Google カレンダーのIDが設定されていません。<br />
                お手数ですが、開発班までお問い合わせください。
            </div>
        </div>
    )
}