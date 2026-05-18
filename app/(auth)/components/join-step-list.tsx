import React from 'react'

// アイコン(ReactNode)を受け取れるように型を拡張
export type StepItem = {
  label: string
  status: 'done' | 'current' | 'upcoming'
  icon: React.ReactNode
}

export function JoinStepList({ steps }: { steps: StepItem[] }) {
  return (
    <div className="w-full max-w-4xl mx-auto my-10 p-10  rounded-xl">
      <ol className="flex justify-between items-start w-full">
        {steps.map((step, i) => {
          // 完了(done)または現在地(current)であれば、そこまでのラインやバッジを青くする
          const isReached = step.status === 'done' || step.status === 'current'

          return (
            <li
              key={step.label}
              className={`
                relative flex flex-col items-center flex-1
                
                /* アイコン（h-12）の真ん中（top-6）を通る横線を引く */
                before:content-[''] before:absolute before:top-6 before:-left-1/2 before:w-full before:h-[3px] before:z-0
                
                /* 最初のステップの左側には線を引かない */
                first:before:hidden
                
                /* 進捗状況に応じて線の色を切り替え */
                ${isReached ? 'before:bg-blue-600' : 'before:bg-gray-300'}
              `}
            >
              {/* アイコンバッジ */}
              <div
                className={`
                  relative z-10 flex justify-center items-center w-12 h-12 rounded-full text-white mb-3
                  ${isReached ? 'bg-blue-600' : 'bg-slate-300'}
                  ${step.status === 'current' ? 'ring-4 ring-blue-100' : ''} /* 現在地を少し強調するリング */
                `}
              >
                {step.icon}
              </div>

              {/* ラベル */}
              <span
                className={`text-sm font-bold text-center whitespace-nowrap ${
                  step.status === 'current'
                    ? 'text-gray-950 font-extrabold'
                    : 'text-gray-500'
                }`}
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