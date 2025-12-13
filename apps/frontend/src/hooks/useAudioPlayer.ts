import { useRef, useCallback, useState } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isProcessingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playNext = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isProcessingRef.current = true;
    setIsPlaying(true);

    const audioContext = getAudioContext();
    const chunk = audioQueueRef.current.shift()!;

    try {
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(chunk.slice(0));

      // Create buffer source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Play next chunk when this one ends
      source.onended = () => {
        playNext();
      };

      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      // Try next chunk
      playNext();
    }
  }, [getAudioContext]);

  const enqueueAudio = useCallback(
    (chunk: ArrayBuffer) => {
      audioQueueRef.current.push(chunk);

      // Start playing if not already processing
      if (!isProcessingRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsPlaying(false);
  }, []);

  const resumeContext = useCallback(async () => {
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }, [getAudioContext]);

  return {
    isPlaying,
    enqueueAudio,
    clearQueue,
    resumeContext,
  };
}
