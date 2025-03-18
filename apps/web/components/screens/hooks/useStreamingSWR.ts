import { useId, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

export async function* getCompletion(prompt: string, signal?: AbortSignal) {
  const url = new URL('/completion', 'http://localhost:4000');
  url.searchParams.append('prompt', prompt);

  const res = await fetch(url, {
    method: 'GET',
    signal,
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader');
  const decoder = new TextDecoder();

  let i = 0;
  while (i < 1000) {
    i++;
    const { done, value } = await reader.read();
    if (done) return;
    const token = decoder.decode(value);
    yield token;

    if (signal?.aborted) {
      await reader.cancel();
      return;
    }
  }
}

export const errorMessage = (err: unknown, fallback?: string) => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback || 'Unknown error';
};

export default function useStreamingSWR() {
  const id = useId();
  const { data, mutate } = useSWR<string>(['completion', id], null);
  const [abortController, setAbortController] =
    useState<AbortController | null>();

  const { trigger, isMutating, error } = useSWRMutation<
    void,
    unknown,
    [string, string],
    string
  >(['completion', id], async (_, { arg: prompt }) => {
    void mutate('', false);
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    const signal = controller.signal;
    setAbortController(controller);

    for await (const token of getCompletion(prompt, signal)) {
      void mutate((prev) => (prev ? prev + token : token), false);
    }
    setAbortController(null);
  });

  return [trigger, { data, error, isLoading: isMutating }] as const;
}
