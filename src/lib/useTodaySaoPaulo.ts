// Hook to provide today's date in America/Sao_Paulo (YYYY-MM-DD)
// and automatically refresh when midnight hits in Sao Paulo timezone.
import { useState, useEffect } from 'react';
import { getTodaySaoPaulo } from './firebase';

export function useTodaySaoPaulo(): string {
  const [today, setToday] = useState<string>(() => getTodaySaoPaulo());

  useEffect(() => {
    // 1. Function to check and update if date changed
    const checkDate = () => {
      const current = getTodaySaoPaulo();
      setToday((prev) => (prev !== current ? current : prev));
    };

    // 2. Calculate ms until next midnight in America/Sao_Paulo
    // We run a fast lightweight interval every 30 seconds to catch midnight transition reliably
    // without heavy CPU or timer drift issues.
    const interval = setInterval(checkDate, 30 * 1000);

    // Also run immediately on visibility change (e.g. agent unlocks tab/computer in the morning)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}
