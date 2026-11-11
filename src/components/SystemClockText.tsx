import React, { useEffect, useState } from 'react';
import { formatSystemDateTimeVN, getSystemNow } from '../utils/dateUtils.ts';

interface SystemClockTextProps {
  referenceDate?: string;
}

export const SystemClockText: React.FC<SystemClockTextProps> = ({ referenceDate }) => {
  const [now, setNow] = useState(() => getSystemNow(referenceDate));

  useEffect(() => {
    const refresh = () => setNow(getSystemNow(referenceDate));
    const intervalId = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [referenceDate]);

  return <>{formatSystemDateTimeVN(now)}</>;
};
