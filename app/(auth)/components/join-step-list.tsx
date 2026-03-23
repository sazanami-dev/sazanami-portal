// app/(auth)/components/join-step-list.tsx

type Step = {
    label: string
    status: 'done' | 'current' | 'upcoming'
}

export function JoinStepList({ steps }: { steps: Step[] }) {
    return (
        <ol className="space-y-3">
            {steps.map((step, i) => (
                <li key={step.label} className="flex items-start gap-3">
                    {/* 番号バッジ */}
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${step.status === 'done'
                                ? 'bg-green-100 text-green-700'
                                : step.status === 'current'
                                    ? 'bg-black text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                    >
                        {step.status === 'done' ? '✓' : i + 1}
                    </span>

                    {/* ラベル */}
                    <span
                        className={`text-sm leading-6 ${step.status === 'done'
                                ? 'text-muted-foreground line-through'
                                : step.status === 'current'
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground'
                            }`}
                    >
                        {step.label}
                    </span>
                </li>
            ))}
        </ol>
    )
}