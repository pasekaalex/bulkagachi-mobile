import { useRef, forwardRef, useImperativeHandle, type ReactNode } from 'react'

interface ThreeCanvasProps {
  children?: ReactNode
  className?: string
  letterboxed?: boolean
  fullWidth?: boolean
}

export const ThreeCanvas = forwardRef<HTMLDivElement, ThreeCanvasProps>(
  function ThreeCanvas({ children, className = '', letterboxed = false, fullWidth = false }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => containerRef.current!)

    return (
      <div className={`relative w-full h-dvh overflow-hidden bg-black touch-none ${className}`}>
        {/* Letterbox bars for mobile */}
        {letterboxed && !fullWidth && (
          <>
            <div className="absolute top-0 left-0 right-0 h-[10vh] bg-black z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-[10vh] bg-black z-20 pointer-events-none" />
          </>
        )}
        {letterboxed && fullWidth && (
          <>
            <div className="absolute top-0 left-0 right-0 h-[5vh] bg-black z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-[5vh] bg-black z-20 pointer-events-none" />
          </>
        )}
        <div 
          ref={containerRef} 
          className={fullWidth ? "absolute inset-x-0 inset-y-[5vh]" : "absolute inset-[10vh]"} 
        />
        {children}
      </div>
    )
  },
)
