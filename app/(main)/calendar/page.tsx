import { redirect } from 'next/navigation'

import { getAuthenticatedViewerId } from '@/lib/members/route-helpers'
import CalendarClient from './calendar-client'

export default async function CalendarOnlyPage() {
	// getUser() ではなく getClaims() ベースで認証確認（Auth往復を1回削減）
	const userId = await getAuthenticatedViewerId()
	if (!userId) redirect('/signin')

	const googleCalendarId = process.env.GOOGLE_CALENDAR_ID ?? null

	return (
		<div className="fixed inset-0 pt-[100px] pb-4 px-4 flex items-center justify-center bg-zinc-50 dark:bg-black overflow-hidden">
			<CalendarClient googleCalendarId={googleCalendarId} />
		</div>
	)
}
