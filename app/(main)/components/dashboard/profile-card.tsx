import React from 'react'

export function ProfileCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 text-card-foreground shadow backdrop-blur-md">
      <div className="h-24 w-24 rounded-full bg-muted" />
      <h3 className="mt-4 text-xl font-semibold">Name Placeholder</h3>
      <p className="text-sm text-muted-foreground">Class - ID</p>
      <div className="mt-4 w-full">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          Bio preview...
        </p>
      </div>
      <button className="mt-6 w-full rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
        プロフィール編集
      </button>
    </div>
  )
}
