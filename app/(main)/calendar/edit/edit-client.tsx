"use client"

import { useState } from "react"

type Ev = { id: string; title: string; date: string; category?: string; location?: string; colorId?: string }

type ApiResponse = {
    error?: string
    results?: Array<{ clientId?: string; id?: string; error?: string } | null>
}

const colorChoices = [
    { id: '9', color: '#5484ed', label: '青' },
    { id: '1', color: '#a4bdfc', label: '薄青' },
    { id: '7', color: '#46d6db', label: 'ティール' },
    { id: '2', color: '#7ae7bf', label: '薄緑' },
    { id: '10', color: '#51b749', label: '緑' },
    { id: '5', color: '#fbd75b', label: '黄' },
    { id: '6', color: '#ffb878', label: '橙' },
    { id: '4', color: '#ff887c', label: '薄赤' },
    { id: '11', color: '#dc2127', label: '赤' },
    { id: '3', color: '#dbadff', label: '紫' },
    { id: '8', color: '#e1e1e1', label: '灰' },
]

const colorMap: Record<string, string> = Object.fromEntries(colorChoices.map(c => [c.id, c.color]))
const colorLabelMap: Record<string, string> = Object.fromEntries(colorChoices.map(c => [c.id, c.label]))

export default function CalendarClient() {

    const [evTitle, setEvTitle] = useState("")
    const [evDate, setEvDate] = useState("")
    const [evCategory, setEvCategory] = useState<'internal' | 'external' | string>('internal')
    const [evLocation, setEvLocation] = useState("")
    const [evColor, setEvColor] = useState<string>("6")

    const [cancelDate, setCancelDate] = useState("")
    const [canceling, setCanceling] = useState(false)



    const [events, setEvents] = useState<Ev[]>([])

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    function generateId() {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
        } catch (_) { }
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    }

    function addEvent() {
        if (loading) return
        if (!evDate || !evTitle) {
            setMessage('日付とタイトルは必須です')
            return
        }
        if (events.some(e => e.date === evDate && e.title.trim() === evTitle.trim())) {
            setMessage('同じ日付とタイトルの予定が既にあります')
            return
        }
        const id = generateId()
        setEvents(prev => [...prev, { id, title: evTitle, date: evDate, category: evCategory, location: evLocation, colorId: evColor }])
        setEvTitle("")
        setEvDate("")
        setEvLocation("")
        setEvColor("6")
        setEvCategory("internal")
        setMessage(null)
    }

    function removeEvent(id: string) {
        if (loading) return
        setEvents(prev => prev.filter((e) => e.id !== id))
    }

    async function handleSubmit() {
        setMessage(null)
        if (events.length === 0) {
            setMessage("少なくとも1つの予定をリストに追加してください")
            return
        }

        setLoading(true)
        try {
            const items = events.map(ev => ({ clientId: ev.id, title: ev.title, startDate: ev.date, allDay: true, category: ev.category, location: ev.location, colorId: ev.colorId }))
            const body = { items }

            const res = await fetch('/api/calendar/add', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            let data: ApiResponse | null = null
            try {
                data = await res.json() as ApiResponse
            } catch (_) { }

            if (res.status === 401) {
                window.location.href = '/signin'
                return
            }
            if (res.status === 403) {
                setMessage('権限がありません')
                return
            }

            if (!res.ok) {
                setMessage(data?.error ?? `サーバーエラー (${res.status})`)
                return
            }

            if (data?.results && Array.isArray(data.results)) {
                const successes = data.results.filter((r) => r && r.id).length
                const errors = data.results.filter((r) => r && r.error)

                const successClientIds = data.results
                    .filter((r): r is NonNullable<typeof r> => Boolean(r && r.clientId && r.id))
                    .map((r) => r.clientId as string)
                if (successClientIds.length > 0) {
                    setEvents(prev => prev.filter(e => !successClientIds.includes(e.id)))
                }

                if (errors.length === 0) {
                    setMessage(`作成結果: 成功 ${successes} 件`)
                    setEvTitle("")
                    setEvDate("")
                    setEvLocation("")
                    setEvColor("6")
                    setEvCategory("internal")
                } else {
                    setMessage(`作成結果: 成功 ${successes} 件、失敗 ${errors.length} 件 — 最初のエラー: ${errors[0]?.error}`)
                }
            } else {
                setMessage('サーバーから予期しないレスポンスが返されました。')
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setMessage(err.message)
            } else {
                setMessage(String(err))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
            <div className="w-full max-w-5xl bg-white rounded shadow p-6">
                <h1 className="text-2xl font-semibold mb-4">さざなみカレンダーに予定を追加</h1>

                <div className="flex gap-6">
                    <div className="w-3/4">
                        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                            <div className="p-2 border rounded space-y-2">
                                <div>
                                    <label className="block text-sm">イベントタイトル</label>
                                    <input className="w-full border p-2" value={evTitle} onChange={e => setEvTitle(e.target.value)} disabled={loading} />
                                </div>

                                <div>
                                    <label className="block text-sm">日付</label>
                                    <input type="date" className="w-full border p-2" value={evDate} onChange={e => setEvDate(e.target.value)} disabled={loading} />
                                </div>

                                <div>
                                    <label className="block text-sm">区分</label>
                                    <select className="w-full border p-2" value={evCategory} onChange={e => setEvCategory(e.target.value)} disabled={loading}>
                                        <option value="internal">内部</option>
                                        <option value="external">外部</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm">活動場所</label>
                                    <input className="w-full border p-2" value={evLocation} onChange={e => setEvLocation(e.target.value)} placeholder="会議室A、オンライン等" disabled={loading} />
                                </div>

                                <div>
                                    <label className="block text-sm mb-2">色</label>
                                    <div className="flex gap-2" role="radiogroup" aria-label="color choices">
                                        {colorChoices.map(({ id, color, label }) => (
                                            <div key={id} className="relative">
                                                <input
                                                    id={`color-${id}`}
                                                    type="radio"
                                                    name="evColor"
                                                    value={id}
                                                    checked={evColor === id}
                                                    onChange={() => setEvColor(id)}
                                                    className="sr-only"
                                                    disabled={loading}
                                                />
                                                <label
                                                    htmlFor={`color-${id}`}
                                                    title={label}
                                                    aria-label={label}
                                                    className={`w-8 h-8 rounded-full border inline-block cursor-pointer`}
                                                    style={{ backgroundColor: color, boxShadow: evColor === id ? '0 0 0 3px rgba(0,0,0,0.15)' : undefined }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button type="button" onClick={addEvent} className="px-3 py-2 bg-gray-200 rounded" disabled={loading}>イベントをリストに追加</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="w-1/4">
                        <div className="sticky top-6 space-y-6">

                            <div className="p-3 border rounded bg-red-50 border-red-200 space-y-2">
                                <h3 className="text-sm font-semibold text-red-800">指定した日の予定を削除

                                </h3>
                                <div className="flex flex-col gap-2">
                                    <label className="sr-only">指定日をキャンセル</label>
                                    <input aria-label="cancel-date" type="date" className="border p-2 w-full bg-white" value={cancelDate} onChange={e => setCancelDate(e.target.value)} disabled={loading || canceling} />
                                    <button type="button" onClick={async () => {
                                        if (!cancelDate) return setMessage('キャンセルする日付を選択してください')
                                        setCanceling(true)
                                        try {
                                            const res = await fetch('/api/calendar/cancel', {
                                                method: 'POST',
                                                credentials: 'same-origin',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ date: cancelDate }),
                                            })
                                            const data = await res.json() as ApiResponse
                                            if (res.status === 401) { window.location.href = '/signin'; return }
                                            if (res.status === 403) { setMessage('権限がありません'); return }
                                            if (!res.ok) { setMessage(data?.error ?? `サーバーエラー (${res.status})`); return }
                                            if (data?.results && Array.isArray(data.results)) {
                                                const successes = data.results.filter((r) => r && r.id).length
                                                const errors = data.results.filter((r) => r && r.error)
                                                setMessage(`キャンセル結果: 成功 ${successes} 件、失敗 ${errors.length} 件`)
                                                setCancelDate("")
                                            } else {
                                                setMessage('キャンセル完了')
                                                setCancelDate("")
                                            }
                                        } catch (err: unknown) {
                                            setMessage(err instanceof Error ? err.message : String(err))
                                        } finally { setCanceling(false) }
                                    }} className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm font-medium" disabled={canceling || loading}>
                                        {canceling ? 'キャンセル中...' : '削除する'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 border rounded bg-white shadow-sm space-y-4">
                                <h2 className="text-lg font-medium border-b pb-2">追加予定リスト</h2>
                                {events.length === 0 ? (
                                    <div className="text-sm text-gray-400 py-2 text-center">まだ予定は追加されていません</div>
                                ) : (
                                    <ul className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                                        {events.map((ev) => (
                                            <li key={ev.id} className="flex items-start justify-between border p-3 rounded bg-white">
                                                <div className="flex items-center gap-3">
                                                    <span style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colorMap[ev.colorId ?? '6'] }} />
                                                    <div>
                                                        <div className="font-medium text-sm break-all">{ev.title}</div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {ev.date}<br />
                                                            {ev.category === 'internal' ? '内部' : ev.category === 'external' ? '外部' : ev.category}
                                                            {ev.location && ` ・ ${ev.location}`}<br />
                                                            色: {colorLabelMap[ev.colorId ?? '6'] ?? (ev.colorId ?? '不明')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex-shrink-0">
                                                    <button type="button" onClick={() => removeEvent(ev.id)} className="text-xs text-red-600" disabled={loading}>削除</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className="pt-2 border-t">
                                    <button type="button" onClick={handleSubmit} className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium shadow-sm" disabled={loading || canceling}>
                                        {loading ? '送信中...' : 'まとめて追加'}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {message && <p className="mt-3">{message}</p>}
            </div>
        </div>
    )
}