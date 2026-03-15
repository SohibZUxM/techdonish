import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function useRealtimeWhereIn(
  collectionName,
  fieldName,
  ids,
  enabled = true
) {
  const [state, setState] = useState({ key: "", map: {} });

  const stableIds = useMemo(() => {
    const clean = (Array.isArray(ids) ? ids : []).filter(Boolean).map(String);
    clean.sort();
    return clean;
  }, [ids]);

  const idsKey = stableIds.join("|");
  const stateKey = `${collectionName}:${fieldName}:${idsKey}`;
  const idChunks = useMemo(() => chunk(stableIds, 10), [stableIds]);

  useEffect(() => {
    if (!enabled || idChunks.length === 0) {
      return undefined;
    }

    const colRef = collection(db, collectionName);
    const unsubs = idChunks.map((ids10) => {
      const chunkQuery = query(colRef, where(fieldName, "in", ids10));

      return onSnapshot(
        chunkQuery,
        (snap) => {
          const next = {};
          snap.docs.forEach((d) => {
            next[d.id] = { id: d.id, ...d.data() };
          });

          setState((prev) => ({
            key: stateKey,
            map: {
              ...(prev.key === stateKey ? prev.map : {}),
              ...next,
            },
          }));
        },
        (err) => console.error("Listener error:", err)
      );
    });

    return () => unsubs.forEach((u) => u && u());
  }, [collectionName, enabled, fieldName, idChunks, stateKey]);

  return useMemo(() => {
    if (!enabled || !idsKey || state.key !== stateKey) {
      return [];
    }

    return Object.values(state.map);
  }, [enabled, idsKey, state, stateKey]);
}
