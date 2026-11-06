/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IndieTrack } from '../utils/musicDiscovery';

class WebAudioMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying = false;
  private currentTrack: IndieTrack | null = null;
  private playbackStartTime = 0;
  private pausedAtTime = 0;
  private volume = 0.75;
  private isMuted = false;
  private crossfadeDuration = 4; // crossfade in seconds
  private intervalId: number | null = null;
  private schedulerTimer: number | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private onTrackEndedCallback: (() => void) | null = null;
  private hasTriggeredEnded = false;

  // Synthesizer active nodes
  private activeVoices: Array<{ stop: () => void }> = [];

  // Real audio stream element and node
  private audioEl: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private isUsingAudioElement = false;

  constructor() {
    // AudioContext will be initialized on user gesture
  }

  public setCrossfadeDuration(sec: number) {
    this.crossfadeDuration = Math.max(0, Math.min(12, sec));
  }

  public getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128; // 64 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.audioEl) {
      this.audioEl.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.audioEl) {
      this.audioEl.volume = this.isMuted ? 0 : this.volume;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public onTimeUpdate(cb: (currentTime: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  public onTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  public playTrack(track: IndieTrack, startOffset = 0) {
    this.initContext();
    this.stopAudioNodes();

    this.currentTrack = track;
    this.pausedAtTime = startOffset;
    this.playbackStartTime = (this.ctx?.currentTime || 0) - startOffset;
    this.isPlaying = true;
    this.hasTriggeredEnded = false;

    // Apply smooth fade-in if crossfade is active and starting from beginning
    if (this.ctx && this.masterGain && this.crossfadeDuration > 0 && startOffset < 1) {
      const now = this.ctx.currentTime;
      const fadeInDuration = Math.min(this.crossfadeDuration, 2.0);
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, now + fadeInDuration);
    }

    // If track has a real audio preview URL (e.g., from Spotify / Apple Music stream)
    if (track.audioUrl) {
      this.playRealAudio(track, startOffset);
    } else {
      this.isUsingAudioElement = false;
      this.startMusicPattern(track);
      this.startProgressTicker();
    }
  }

  private playRealAudio(track: IndieTrack, startOffset = 0) {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';

      this.audioEl.addEventListener('ended', () => {
        // Natural end of track or preview stream: notify callback so playlist advances to next track
        this.isPlaying = false;
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      });

      this.audioEl.addEventListener('timeupdate', () => {
        if (!this.isPlaying || !this.audioEl || !this.currentTrack) return;
        const elapsed = (this.ctx?.currentTime || 0) - this.playbackStartTime;
        const boundedTime = Math.min(elapsed, this.currentTrack.duration);
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(boundedTime, this.currentTrack.duration);
        }
      });

      this.audioEl.addEventListener('error', (e) => {
        console.warn('Real audio playback error, falling back to synth engine:', e);
        this.isUsingAudioElement = false;
        if (this.isPlaying && this.currentTrack) {
          this.startMusicPattern(this.currentTrack);
          this.startProgressTicker();
        }
      });

      try {
        if (this.ctx && this.masterGain && !this.mediaSourceNode) {
          this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioEl);
          this.mediaSourceNode.connect(this.masterGain);
        }
      } catch (err) {
        console.warn('AudioContext media element source connection skipped:', err);
      }
    }

    this.isUsingAudioElement = true;
    this.audioEl.src = track.audioUrl!;
    this.audioEl.volume = this.isMuted ? 0 : this.volume;
    this.audioEl.currentTime = startOffset;

    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play request failed or blocked:', err);
        this.isUsingAudioElement = false;
        if (this.isPlaying && this.currentTrack) {
          this.startMusicPattern(this.currentTrack);
          this.startProgressTicker();
        }
      });
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.isUsingAudioElement && this.audioEl) {
      this.audioEl.pause();
      this.pausedAtTime = this.audioEl.currentTime;
    } else if (this.ctx) {
      this.pausedAtTime = this.ctx.currentTime - this.playbackStartTime;
    }
    this.stopAudioNodes();
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public resume() {
    if (this.isPlaying || !this.currentTrack) return;
    if (this.isUsingAudioElement && this.audioEl) {
      this.isPlaying = true;
      this.audioEl.play().catch(() => {
        if (this.currentTrack) {
          this.playTrack(this.currentTrack, this.pausedAtTime);
        }
      });
    } else {
      this.playTrack(this.currentTrack, this.pausedAtTime);
    }
  }

  public seek(targetSeconds: number) {
    if (!this.currentTrack) return;
    const maxDur = (this.isUsingAudioElement && this.audioEl?.duration)
      ? this.audioEl.duration
      : this.currentTrack.duration;
    const clamped = Math.max(0, Math.min(targetSeconds, maxDur));

    if (this.isUsingAudioElement && this.audioEl) {
      this.audioEl.currentTime = clamped;
      this.pausedAtTime = clamped;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(clamped, maxDur);
      }
      return;
    }

    if (this.isPlaying) {
      this.playTrack(this.currentTrack, clamped);
    } else {
      this.pausedAtTime = clamped;
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(clamped, this.currentTrack.duration);
      }
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentTrack = null;
    this.pausedAtTime = 0;
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.stopAudioNodes();
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): IndieTrack | null {
    return this.currentTrack;
  }

  public getByteFrequencyData(): Uint8Array {
    return this.getVisualizerData();
  }

  public getVisualizerData(): Uint8Array {
    const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    if (!this.isPlaying) {
      // Idle resting wave
      const t = Date.now() / 400;
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = Math.max(2, Math.round(Math.sin(t + i * 0.2) * 6 + 8));
      }
      return dataArray;
    }

    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    }

    // If no direct Web Audio signal captured (e.g. YouTube iframe cross-origin restriction),
    // generate an expressive beat-reactive frequency curve based on current track tempo and energy
    const hasSignal = dataArray.some((val) => val > 0);
    if (!hasSignal) {
      const t = Date.now() / 110;
      const energy = this.currentTrack?.energy ?? 0.65;
      const volMultiplier = this.isMuted ? 0 : this.volume;
      const bpmSpeed = (this.currentTrack?.bpm || 105) / 60;

      for (let i = 0; i < bufferLength; i++) {
        const normalizedIndex = i / bufferLength;
        // Bass punch at low frequencies
        const bassBeat = Math.max(0, Math.sin(t * bpmSpeed * 2)) * (1 - normalizedIndex * 0.8) * 110;
        // Mid harmonic warmth
        const midHarmonic = Math.sin(t * 1.5 + i * 0.25) * 45;
        // High sparkle
        const shimmer = Math.cos(t * 3.2 + i * 0.6) * 25;
        // Combine with energy
        const raw = (bassBeat + midHarmonic + shimmer + 80) * energy * volMultiplier;
        dataArray[i] = Math.max(4, Math.min(255, Math.round(raw)));
      }
    }
    return dataArray;
  }

  private stopAudioNodes() {
    if (this.schedulerTimer) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const voice of this.activeVoices) {
      try {
        voice.stop();
      } catch {
        // Voice might already be finished
      }
    }
    this.activeVoices = [];
  }

  private startProgressTicker() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.currentTrack) return;

      const elapsed = this.ctx.currentTime - this.playbackStartTime;
      const totalDur = this.currentTrack.duration;
      const remaining = totalDur - elapsed;

      // Handle crossfade volume curve during the tail of the track
      if (this.crossfadeDuration > 0 && remaining <= this.crossfadeDuration && remaining > 0 && this.masterGain) {
        const fadeProgress = Math.max(0, remaining / this.crossfadeDuration); // 1.0 -> 0.0
        const gainVal = this.isMuted ? 0 : this.volume * fadeProgress;
        this.masterGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.05);

        // When almost at the end of the crossfade window, trigger next track
        if (remaining <= 0.35 && !this.hasTriggeredEnded) {
          this.hasTriggeredEnded = true;
          this.pause();
          if (this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          }
          return;
        }
      }

      if (elapsed >= totalDur) {
        // Track finished
        if (!this.hasTriggeredEnded) {
          this.hasTriggeredEnded = true;
          this.pause();
          if (this.onTrackEndedCallback) {
            this.onTrackEndedCallback();
          }
        }
      } else {
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(elapsed, this.currentTrack.duration);
        }
      }
    }, 200);
  }

  /**
   * Procedural Web Audio Indie Music Synthesizer
   * Generates rich chords, bass, melody, and rhythm tailored to the genre and energy
   */
  private startMusicPattern(track: IndieTrack) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    // Harmonic scales based on mood & genre
    // Melancholic = minor/dorian, Euphoric = major/lydian
    const isMelancholic = track.melancholy > 0.5;
    const baseFreqs = isMelancholic
      ? [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13] // C Minor pentatonic/aeolian
      : [130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66]; // C Major pentatonic/lydian

    const tempoBpm = 68 + Math.round(track.energy * 64); // 68 to 132 bpm
    const beatDuration = 60 / tempoBpm;
    let step = 0;

    // Filter node for warmth & lo-fi vibe
    const filter = ctx.createBiquadFilter();
    filter.type = track.genre === 'Bedroom Lo-Fi' ? 'lowpass' : 'lowpass';
    filter.frequency.value = track.genre === 'Bedroom Lo-Fi' ? 1400 : 3800;
    filter.Q.value = 1.2;
    filter.connect(master);

    const playVoice = (freq: number, startTime: number, duration: number, type: OscillatorType, gainVol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth envelope attack and release
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainVol, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);

      this.activeVoices.push({
        stop: () => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        },
      });
    };

    const playDrum = (isKick: boolean, startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isKick) {
        osc.frequency.setValueAtTime(130, startTime);
        osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.12);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      } else {
        // Snare / Rimshot / Hi-hat
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
      }

      osc.connect(gain);
      gain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + 0.2);

      this.activeVoices.push({
        stop: () => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        },
      });
    };

    // Schedule pulses in small intervals
    const scheduleNextBeats = () => {
      if (!this.isPlaying) return;
      const now = ctx.currentTime;
      const lookahead = 0.4; // 400ms ahead

      for (let i = 0; i < 4; i++) {
        const beatTime = now + i * (beatDuration / 2);
        const currentStep = (step + i) % 16;

        // Drums (on high energy tracks or Lo-Fi beats)
        if (track.energy > 0.25) {
          if (currentStep === 0 || currentStep === 8) {
            playDrum(true, beatTime);
          }
          if (currentStep === 4 || currentStep === 12) {
            playDrum(false, beatTime);
          }
        }

        // Bassline
        if (currentStep % 4 === 0) {
          const bassNote = baseFreqs[currentStep % baseFreqs.length] * 0.5;
          playVoice(bassNote, beatTime, beatDuration * 1.5, 'triangle', 0.15 * track.energy + 0.08);
        }

        // Lush Dreamy Chords & Arpeggio
        if (currentStep % 2 === 0) {
          const chordIndex = Math.floor(currentStep / 4) % 3;
          const root = baseFreqs[chordIndex];
          const third = baseFreqs[(chordIndex + 2) % baseFreqs.length];
          const fifth = baseFreqs[(chordIndex + 4) % baseFreqs.length];

          // Chord pad
          if (currentStep % 8 === 0) {
            playVoice(root * 1.0, beatTime, beatDuration * 3.8, 'sine', 0.09);
            playVoice(third * 1.0, beatTime, beatDuration * 3.8, 'sine', 0.07);
            playVoice(fifth * 1.0, beatTime, beatDuration * 3.8, 'sine', 0.07);
          }

          // Twinkling indie arpeggiated note
          const arpNote = baseFreqs[(currentStep * 3) % baseFreqs.length] * 2;
          playVoice(arpNote, beatTime, beatDuration * 0.8, 'sine', 0.06);
        }
      }

      step = (step + 4) % 16;
    };

    scheduleNextBeats();
    this.schedulerTimer = window.setInterval(scheduleNextBeats, beatDuration * 1000 * 2);
  }
}

export const audioEngine = new WebAudioMusicEngine();
