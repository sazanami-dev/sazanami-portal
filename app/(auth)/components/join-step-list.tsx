import React from 'react'

export type StepItem = {
  label: string
  status: 'done' | 'current' | 'upcoming'
  icon: React.ReactNode
}

export function JoinStepList({ steps }: { steps: StepItem[] }) {
  return (
    <div className="w-full max-w-4xl mx-auto my-5 p-5 rounded-xl">
      <ol className="flex justify-between items-start w-full">
        {steps.map((step, i) => {
          const isReached = step.status === 'done' || step.status === 'current'

          return (
            <li
              key={step.label}
              className={`
                relative flex flex-col items-center flex-1
                
                /* 【修正点】コンテンツの長さに依存せず均等割りさせるため min-w-0 を追加 */
                min-w-0
                
                before:content-[''] before:absolute before:top-6 before:-left-1/2 before:w-full before:h-[3px] before:z-0
                first:before:hidden
                ${isReached ? 'before:bg-blue-600' : 'before:bg-gray-300'}
              `}
            >
              <div
                className={`
                  /* 【修正点】画面が極端に狭い場合でもアイコンが潰れないように shrink-0 を追加 */
                  relative z-10 flex justify-center items-center w-12 h-12 shrink-0 rounded-full text-white mb-3
                  ${isReached ? 'bg-blue-600' : 'bg-slate-300'}
                  ${step.status === 'current' ? 'ring-4 ring-blue-100' : ''}
                `}
              >
                {step.icon}
              </div>

              <span
                className={`
                  /* 【修正点】whitespace-nowrapを削除し、折り返しを許可。
                     モバイルでは text-xs にして視認性を確保しつつはみ出しを防ぐ */
                  text-xs sm:text-sm font-bold text-center break-words px-1 w-full
                  ${
                    step.status === 'current'
                      ? 'text-gray-950 font-extrabold'
                      : 'text-gray-500'
                  }
                `}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}