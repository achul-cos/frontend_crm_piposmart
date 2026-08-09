"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDiscussionThreads,
  createDiscussionThread,
  toggleDiscussionLike,
  deleteDiscussionThread,
  addDiscussionReply,
  deleteDiscussionReply,
  type BackendDiscussionThread,
  type CreateDiscussionThreadPayload,
  type CreateDiscussionReplyPayload,
} from "@/app/lib/api";

export const bantuanKeys = {
  all: ["bantuan", "threads"] as const,
  list: (channel: string, query: string) => [...bantuanKeys.all, channel, query] as const,
};

export function useDiscussionThreadsQuery(channel: string, query: string, enabled = true) {
  return useQuery<BackendDiscussionThread[]>({
    queryKey: bantuanKeys.list(channel, query),
    queryFn: () => fetchDiscussionThreads(channel, query),
    enabled,
  });
}

export function useCreateDiscussionThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDiscussionThreadPayload) => createDiscussionThread(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bantuanKeys.all }),
  });
}

// Optimistically flips like state on the active (channel, query) cache entry so the UI updates
// instantly, matching the old hand-rolled optimistic setThreads behaviour. No rollback on error,
// same as the original (errors were swallowed and the optimistic state kept).
export function useToggleDiscussionLike(channel: string, query: string) {
  const qc = useQueryClient();
  const key = bantuanKeys.list(channel, query);
  return useMutation({
    mutationFn: (threadId: number) => toggleDiscussionLike(threadId),
    onMutate: (threadId: number) => {
      qc.setQueryData<BackendDiscussionThread[]>(key, (old) =>
        old?.map((t) =>
          t.id === threadId ? { ...t, isLiked: !t.isLiked, likes: t.isLiked ? t.likes - 1 : t.likes + 1 } : t,
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bantuanKeys.all }),
  });
}

export function useDeleteDiscussionThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: number) => deleteDiscussionThread(threadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: bantuanKeys.all }),
  });
}

export function useAddDiscussionReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, payload }: { threadId: number; payload: CreateDiscussionReplyPayload }) =>
      addDiscussionReply(threadId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bantuanKeys.all }),
  });
}

export function useDeleteDiscussionReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => deleteDiscussionReply(replyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: bantuanKeys.all }),
  });
}
