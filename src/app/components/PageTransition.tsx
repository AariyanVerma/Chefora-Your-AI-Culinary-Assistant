'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const prevPathnameRef = useRef(pathname);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip transition on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayChildren(children);
      return;
    }

    // Only trigger transition if pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      // Start exit animation first
      setTransitionState('exiting');
      
      // After exit, update content and start enter animation
      const exitTimer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionState('entering');
        
        // After enter animation completes, go to idle
        const enterTimer = setTimeout(() => {
          setTransitionState('idle');
        }, 500);

        return () => clearTimeout(enterTimer);
      }, 400);

      prevPathnameRef.current = pathname;

      return () => clearTimeout(exitTimer);
    } else {
      // Pathname hasn't changed, just update children
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  // Determine class based on transition state
  const getTransitionClass = () => {
    if (transitionState === 'exiting') return 'page-exiting';
    if (transitionState === 'entering') return 'page-entering';
    return 'page-idle';
  };

  return (
    <div className={`page-transition-wrapper ${getTransitionClass()}`}>
      {/* Futuristic Energy Lines */}
      {(transitionState === 'exiting' || transitionState === 'entering') && (
        <>
          <div className="energy-line energy-line-1"></div>
          <div className="energy-line energy-line-2"></div>
          <div className="energy-line energy-line-3"></div>
        </>
      )}
      {displayChildren}
    </div>
  );
}
