import { useEffect, useMemo, useState } from "react";
import { collection, documentId, onSnapshot, query, where, type Query } from "firebase/firestore";
import { db } from "./firebase";
import { chunk } from "./utils";

export function useRealtimeList<T = any>(
  buildQuery: () => Query,
  deps: any[] = [],
  enabled = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const q = buildQuery();
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as T[]
        );
        setLoading(false);
      },
      (err) => {
        console.error("Realtime listener error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useRealtimeDocsByIds<T = any>(
  collectionName: string,
  ids: string[],
  enabled = true
) {
  const [state, setState] = useState<{ key: string; chunks: Record<string, Record<string, T>> }>({
    key: "",
    chunks: {},
  });
  const [loading, setLoading] = useState(enabled && ids.length > 0);
  const [error, setError] = useState<Error | null>(null);

  const stableIds = useMemo(
    () => (Array.isArray(ids) ? ids : []).filter(Boolean).map(String).sort(),
    [ids]
  );
  const idsKey = stableIds.join("|");
  const stateKey = `${collectionName}:${idsKey}`;
  const idChunks = useMemo(() => chunk(stableIds, 10), [stableIds]);

  useEffect(() => {
    if (!enabled || idChunks.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const colRef = collection(db, collectionName);
    const unsubs = idChunks.map((idsChunk) => {
      const chunkKey = idsChunk.join("|");
      const q = query(colRef, where(documentId(), "in", idsChunk));
      return onSnapshot(
        q,
        (snap) => {
          const next: Record<string, T> = {};
          snap.docs.forEach((docSnap) => {
            next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as T;
          });
          setState((prev) => ({
            key: stateKey,
            chunks: {
              ...(prev.key === stateKey ? prev.chunks : {}),
              [chunkKey]: next,
            },
          }));
          setLoading(false);
        },
        (err) => {
          console.error("Realtime docs by ids error:", err);
          setError(err);
          setLoading(false);
        }
      );
    });

    return () => unsubs.forEach((unsub) => unsub());
  }, [collectionName, enabled, idChunks, stateKey]);

  const data = useMemo(() => {
    if (!enabled || !idsKey || state.key !== stateKey) return [];
    return Object.values(state.chunks).flatMap((group) => Object.values(group));
  }, [enabled, idsKey, state, stateKey]);

  return { data, loading, error };
}

export function useRealtimeWhereIn<T = any>(
  collectionName: string,
  fieldName: string,
  ids: string[],
  enabled = true
) {
  const [state, setState] = useState<{ key: string; chunks: Record<string, Record<string, T>> }>({
    key: "",
    chunks: {},
  });
  const [loading, setLoading] = useState(enabled && ids.length > 0);
  const [error, setError] = useState<Error | null>(null);

  const stableIds = useMemo(
    () => (Array.isArray(ids) ? ids : []).filter(Boolean).map(String).sort(),
    [ids]
  );
  const idsKey = stableIds.join("|");
  const stateKey = `${collectionName}:${fieldName}:${idsKey}`;
  const idChunks = useMemo(() => chunk(stableIds, 10), [stableIds]);

  useEffect(() => {
    if (!enabled || idChunks.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const colRef = collection(db, collectionName);
    const unsubs = idChunks.map((idsChunk) => {
      const chunkKey = idsChunk.join("|");
      const q = query(colRef, where(fieldName, "in", idsChunk));
      return onSnapshot(
        q,
        (snap) => {
          const next: Record<string, T> = {};
          snap.docs.forEach((docSnap) => {
            next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as T;
          });
          setState((prev) => ({
            key: stateKey,
            chunks: {
              ...(prev.key === stateKey ? prev.chunks : {}),
              [chunkKey]: next,
            },
          }));
          setLoading(false);
        },
        (err) => {
          console.error("Realtime where-in error:", err);
          setError(err);
          setLoading(false);
        }
      );
    });

    return () => unsubs.forEach((unsub) => unsub());
  }, [collectionName, enabled, fieldName, idChunks, stateKey]);

  const data = useMemo(() => {
    if (!enabled || !idsKey || state.key !== stateKey) return [];
    return Object.values(state.chunks).flatMap((group) => Object.values(group));
  }, [enabled, idsKey, state, stateKey]);

  return { data, loading, error };
}
