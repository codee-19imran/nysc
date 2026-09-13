import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // 1. If navigationType is 'POP', it means they clicked the browser's Back/Forward button.
    // We return early and do NOTHING. This lets the browser natively restore the previous scroll position.
    if (navigationType === 'POP') {
      return;
    }

    // 2. If it's 'PUSH' or 'REPLACE' (they clicked a link), we scroll to top.
    // Removing the setTimeout eliminates the "laggy" delay jump.
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

  }, [pathname, key, navigationType]);

  return null;
}