/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barsCount?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barsCount = 20,
  height = 28,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      const freqData = audioEngine.getVisualizerData();
      const step = Math.max(1, Math.floor(freqData.length / barsCount));
      const barWidth = Math.max(2, (width / barsCount) - 2);

      for (let i = 0; i < barsCount; i++) {
        let value = isPlaying ? freqData[i * step] || 0 : 4;
        if (!isPlaying) {
          value = 3 + Math.sin(Date.now() * 0.003 + i) * 2;
        }

        const percent = Math.min(1, Math.max(0.08, value / 255));
        const barHeight = percent * (h - 2);
        const x = i * (barWidth + 2);
        const y = h - barHeight;

        // Gradient from Spotify green to teal
        const grad = ctx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, '#1ed760');
        grad.addColorStop(1, '#059669');

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Rounded bar top
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, barsCount]);

  return (
    <canvas
      ref={canvasRef}
      width={barsCount * 6}
      height={height}
      className={`block opacity-90 ${className}`}
      aria-label="Real-time music visualizer"
    />
  );
};
