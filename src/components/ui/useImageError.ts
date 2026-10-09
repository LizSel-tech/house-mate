'use client';

import { useEffect, useState } from 'react';

/** Returns whether `src` is usable plus an onError handler that flips it off when the file is missing. */
export function useImageError(src?: string | null): [boolean, () => void] {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return [Boolean(src) && !failed, () => setFailed(true)];
}
