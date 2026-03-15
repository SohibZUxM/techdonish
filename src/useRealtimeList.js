import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

/**
 * Shared realtime Firestore list hook.
 * buildQuery: () => Query
 * deps: dependency array for when to re-run the listener
 * enabled: when false, clears data and skips subscribing
 */
export default function useRealtimeList(buildQuery, deps = [], enabled = true) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      return;
    }

    const q = buildQuery();
    const unsub = onSnapshot(
      q,
      (snap) => setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Listener error:", err)
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}

