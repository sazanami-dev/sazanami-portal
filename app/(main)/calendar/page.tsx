import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import CalendarClient from './calendar-client'

export default async function CalendarOnlyPage() {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) redirect('/signin')

	const googleCalendarId = process.env.GOOGLE_CALENDAR_ID ?? null

	return (
		<div className="fixed inset-0 pt-[100px] pb-4 px-4 flex items-center justify-center bg-zinc-50 dark:bg-black overflow-hidden">
			<CalendarClient googleCalendarId={googleCalendarId} />
		</div>
	)
}