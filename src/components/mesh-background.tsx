'use client'

interface MeshBackgroundProps {
  variant?: 'mesh' | 'shapes'
  intensity?: 'full' | 'soft'
}

export function MeshBackground({ variant = 'mesh', intensity = 'full' }: MeshBackgroundProps) {
  const opacity = intensity === 'full' ? 1 : 0.5

  return (
    <div aria-hidden="true" className="ug-noise pointer-events-none absolute inset-0 overflow-hidden opacity-70 dark:opacity-100" style={{ opacity }}>
      <div className="ug-grid absolute inset-0" />
      {variant === 'mesh' ? (
        <>
          <div className="ug-float absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full blur-[110px]" style={{ background: '#8B5CF6', opacity: 0.45 }} />
          <div className="ug-drift absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full blur-[120px]" style={{ background: '#FF5C38', opacity: 0.32 }} />
          <div className="ug-float absolute bottom-[-14rem] left-1/3 h-[28rem] w-[28rem] rounded-full blur-[120px]" style={{ background: '#CCFF00', opacity: 0.22, animationDelay: '2.5s' }} />
          <div className="ug-drift absolute bottom-0 right-1/4 h-[20rem] w-[20rem] rounded-full blur-[100px]" style={{ background: '#22E0D6', opacity: 0.24, animationDelay: '4s' }} />
        </>
      ) : (
        <>
          <div className="ug-float absolute left-[8%] top-[18%] h-40 w-40 rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border-2" style={{ borderColor: '#CCFF00', opacity: 0.5 }} />
          <div className="ug-drift absolute right-[12%] top-[12%] h-56 w-56 rounded-full" style={{ background: '#8B5CF6', opacity: 0.28, filter: 'blur(2px)' }} />
          <div className="ug-spin-slow absolute bottom-[14%] left-[18%] h-32 w-32" style={{ background: '#FF5C38', opacity: 0.4, borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} />
          <div className="ug-float absolute bottom-[22%] right-[20%] h-24 w-24 rotate-12 rounded-3xl border-2" style={{ borderColor: '#22E0D6', opacity: 0.6, animationDelay: '1.4s' }} />
        </>
      )}
    </div>
  )
}