interface LoadingScreenProps {
  className?: string;
}

export function LoadingScreen({ className = "" }: LoadingScreenProps) {
  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black ${className}`}>
      <div className="font-pixel text-[20px] sm:text-[24px] uppercase tracking-[0.2em] text-white">
        <span>LOADING</span>
        <span className="inline-flex w-[2.1ch] justify-start">
          <span className="sova-loading-dot">.</span>
          <span className="sova-loading-dot [animation-delay:240ms]">.</span>
          <span className="sova-loading-dot [animation-delay:480ms]">.</span>
        </span>
      </div>
    </div>
  );
}
