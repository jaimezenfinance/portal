const STEPS = ['Titulares', 'Inmueble', 'Documentos']

export default function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4 px-4">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all
                ${isDone ? 'bg-[#0f3693] border-[#0f3693] text-white' : ''}
                ${isActive ? 'bg-white border-[#0f3693] text-[#0f3693]' : ''}
                ${!isDone && !isActive ? 'bg-white border-gray-300 text-gray-400' : ''}
              `}>
                {isDone ? '✓' : stepNum}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'text-[#0f3693] font-semibold' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 mx-1 mb-5 ${isDone ? 'bg-[#0f3693]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
