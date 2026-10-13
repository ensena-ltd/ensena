"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaPermissionError = "denied" | "not-found" | "in-use" | "other" | null;

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface UseLocalMediaResult {
  /** Null until getUserMedia resolves (or fails) — real MediaStream, not a placeholder. */
  stream: MediaStream | null;
  /** Requested state — the track is actually enabled/disabled to match, camera light genuinely turns off. */
  micOn: boolean;
  camOn: boolean;
  setMicOn: (on: boolean) => void;
  setCamOn: (on: boolean) => void;
  error: MediaPermissionError;
  /** True while the initial getUserMedia call is in flight. */
  loading: boolean;
  /** Re-requests camera/mic — call after the user grants a previously-denied permission. */
  retry: () => void;
  /** Real enumerateDevices() results — empty until the browser grants at least one device label (requires a live stream first). */
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicId: string | null;
  selectedSpeakerId: string | null;
  /** Re-acquires the stream constrained to this specific device. */
  setCameraId: (deviceId: string) => void;
  setMicId: (deviceId: string) => void;
  /** No stream to re-acquire for an output device — callers apply this via HTMLMediaElement.setSinkId on the actual <video>/<audio> element playing the remote peer's audio. */
  setSpeakerId: (deviceId: string) => void;
  /** True on browsers exposing distinct audio-output devices (HTMLMediaElement.setSinkId) — Firefox/Safari don't, so callers must hide the speaker picker rather than show one that silently does nothing. */
  canSelectSpeaker: boolean;
  /** Live 0-1 input level from the current microphone track, for a real "is my mic working" meter — not simulated. */
  micLevel: number;
}

function classifyError(err: unknown): MediaPermissionError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "not-found";
    if (err.name === "NotReadableError" || err.name === "TrackStartError") return "in-use";
  }
  return "other";
}

// Real camera/microphone access — the actual MediaStream this classroom's
// video is built on, not a simulated avatar. Track enabled/disabled state
// (not stopping the track) is used for mute/camera-off so re-enabling is
// instant and doesn't need to re-request the device. Device selection
// (camera/mic) requires re-acquiring the stream with a `deviceId` constraint
// — there's no way to swap a live track's source device in place.
export function useLocalMedia(initialMicOn = true, initialCamOn = true): UseLocalMediaResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOnState] = useState(initialMicOn);
  const [camOn, setCamOnState] = useState(initialCamOn);
  const [error, setError] = useState<MediaPermissionError>(null);
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const canSelectSpeaker = typeof window !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- acquiring a real device stream is an external-system side effect, not derivable from props/state
    setLoading(true);

    async function acquire() {
      try {
        // `ideal` (never `exact`/`min`) for shape/resolution — a real webcam
        // request should degrade gracefully on whatever the device actually
        // offers rather than failing outright. Requesting a normal 16:9
        // frame here means the video element's own container rarely needs
        // to letterbox at all; it's a complement to (not a replacement for)
        // object-contain in VideoStreamView, which is what actually
        // guarantees the full frame stays visible on devices that ignore
        // this hint entirely.
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
        };
        const media = await navigator.mediaDevices.getUserMedia({
          video: selectedCameraId ? { ...videoConstraints, deviceId: { exact: selectedCameraId } } : videoConstraints,
          audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        media.getAudioTracks().forEach((t) => (t.enabled = micOn));
        media.getVideoTracks().forEach((t) => (t.enabled = camOn));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = media;
        setStream(media);
        setError(null);

        // Device labels are only populated once a stream has actually been
        // granted — this is why enumeration lives here, after acquire(), and
        // not in an independent effect that runs before any permission exists.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameras(devices.filter((d) => d.kind === "videoinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })));
        setMicrophones(devices.filter((d) => d.kind === "audioinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })));
        setSpeakers(devices.filter((d) => d.kind === "audiooutput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${i + 1}` })));
      } catch (err) {
        if (!cancelled) setError(classifyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void acquire();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-acquire on an explicit retry or device switch, not on every micOn/camOn toggle (those just flip track.enabled below)
  }, [retryToken, selectedCameraId, selectedMicId]);

  // Stop the previous stream's tracks only once React has moved on to the
  // next one (unmount or a fresh device) rather than inside the effect
  // above, whose own cleanup would otherwise stop a stream mid-acquire.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // A real mic-level meter (not a fake bouncing bar) — an AnalyserNode reads
  // the actual current input's volume so the Settings panel can prove the
  // selected microphone is genuinely picking up sound.
  useEffect(() => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (!audioTrack) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the meter when the mic track itself disappears (device switch/teardown), not a derivable render value
      setMicLevel(0);
      return;
    }
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    function tick() {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const normalized = (value - 128) / 128;
        sumSquares += normalized * normalized;
      }
      setMicLevel(Math.min(1, Math.sqrt(sumSquares / data.length) * 4));
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void audioContext.close();
    };
  }, [stream]);

  const setMicOn = useCallback((on: boolean) => {
    setMicOnState(on);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
  }, []);

  const setCamOn = useCallback((on: boolean) => {
    setCamOnState(on);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
  }, []);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  return {
    stream,
    micOn,
    camOn,
    setMicOn,
    setCamOn,
    error,
    loading,
    retry,
    cameras,
    microphones,
    speakers,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    setCameraId: setSelectedCameraId,
    setMicId: setSelectedMicId,
    setSpeakerId: setSelectedSpeakerId,
    canSelectSpeaker,
    micLevel,
  };
}
