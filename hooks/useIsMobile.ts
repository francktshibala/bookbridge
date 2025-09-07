import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    // Function to update the state
    const handleResize = () => {
      const width = window.innerWidth;
      console.log('[useIsMobile] Window width:', width, 'Is mobile?', width <= breakpoint);
      setWindowWidth(width);
      setIsMobile(width <= breakpoint);
    };

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return { isMobile, windowWidth };
};

export default useIsMobile;