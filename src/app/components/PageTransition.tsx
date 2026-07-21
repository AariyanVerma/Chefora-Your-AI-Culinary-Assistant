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
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setDisplayChildren(children);
      return;
    }

    if (prevPathnameRef.current !== pathname) {
      
      setTransitionState('exiting');
      
      const exitTimer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionState('entering');
        
        const enterTimer = setTimeout(() => {
          setTransitionState('idle');
        }, 500);

        return () => clearTimeout(enterTimer);
      }, 400);

      prevPathnameRef.current = pathname;

      return () => clearTimeout(exitTimer);
    } else {
      
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  const getTransitionClass = () => {
    if (transitionState === 'exiting') return 'page-exiting';
    if (transitionState === 'entering') return 'page-entering';
    return 'page-idle';
  };

  return (
    <div className={`page-transition-wrapper ${getTransitionClass()}`}>
      {}
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
