import { useEffect, useMemo, useState } from "react";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Subscribe (realtime) to a set of documents by id from a collection.
 * Uses `where(documentId(), "in", idsChunk)` (10 ids per query for safety).
 *
 * Returns an array of docs: [{ id, ...data }]
 */
export default function useRealtimeDocsByIds(collectionName, ids, enabled = true) {
  const [state, setState] = useState({ key: "", chunks: {} });

  const stableIds = useMemo(() => {
    const clean = (Array.isArray(ids) ? ids : []).filter(Boolean).map(String);
    clean.sort();
    return clean;
  }, [ids]);

  const idsKey = stableIds.join("|");
  const stateKey = `${collectionName}:${idsKey}`;
  const idChunks = useMemo(() => chunk(stableIds, 10), [stableIds]);

  useEffect(() => {
    if (!enabled || idChunks.length === 0) {
      return undefined;
    }

    const colRef = collection(db, collectionName);

    const unsubs = idChunks.map((ids10) => {
      const chunkKey = ids10.join("|");
      const q = query(colRef, where(documentId(), "in", ids10));
      return onSnapshot(
        q,
        (snap) => {
          const next = {};
          snap.docs.forEach((d) => {
            next[d.id] = { id: d.id, ...d.data() };
          });
          setState((prev) => ({
            key: stateKey,
            chunks: {
              ...(prev.key === stateKey ? prev.chunks : {}),
              [chunkKey]: next,
            },
          }));
        },
        (err) => console.error("Listener error:", err)
      );
    });

    return () => unsubs.forEach((u) => u && u());
  }, [collectionName, enabled, idChunks, stateKey]);

  return useMemo(() => {
    if (!enabled || !idsKey || state.key !== stateKey) {
      return [];
    }

    return Object.values(state.chunks).flatMap((chunkMap) => Object.values(chunkMap));
  }, [enabled, idsKey, state, stateKey]);
}

