import { useEffect, useRef } from 'react';
import { createPsiGrid } from '@psi-zoo/sim-core';

const DT = 1 / 120;

function PlaceholderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 1;
    let height = 1;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // Slice 0: fixed update timestep. Visual movement below is illustrative,
    // NOT an evolved wavefunction. Slice 1 will replace the placeholder.
    let simTime = 0;
    let accumulator = 0;
    let previousTime: number | undefined;
    let frameId = 0;

    const draw = (now: number) => {
      if (previousTime === undefined) previousTime = now;
      accumulator += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      while (accumulator >= DT) {
        simTime += DT;
        accumulator -= DT;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#0e1930';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = '#374561';
      context.lineWidth = 1;
      context.setLineDash([4, 8]);
      context.beginPath();
      context.moveTo(0, height / 2);
      context.lineTo(width, height / 2);
      context.stroke();
      context.setLineDash([]);

      const x = width / 2 + 0.33 * width * Math.sin(simTime * 0.7);
      const y = height / 2;
      const glow = context.createRadialGradient(x, y, 4, x, y, 45);
      glow.addColorStop(0, '#a8f9fc');
      glow.addColorStop(0.25, '#56bce5');
      glow.addColorStop(1, 'rgba(86, 188, 229, 0)');
      context.fillStyle = glow;
      context.fillRect(x - 45, y - 45, 90, 90);
      context.fillStyle = '#e5feff';
      context.fillRect(x - 7, y - 7, 14, 14);
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return <canvas className="terrarium" ref={canvasRef} aria-label="Animated placeholder terrarium" />;
}

export default function App() {
  const grid = createPsiGrid(256, 0.1, -12.8);
  return (
    <main>
      <div className="heading">
        <div className="eyebrow">PSI ZOO · SLICE 0</div>
        <h1>A little world for wavefunctions.</h1>
        <p>Today: the browser and fixed-timestep loop. Next: a real Gaussian evolving under Schrödinger dynamics.</p>
      </div>
      <PlaceholderCanvas />
      <footer>
        <span><strong>Animation:</strong> placeholder, not quantum evolution</span>
        <span><strong>Core grid:</strong> {grid.count} points · Δx = {grid.dx}</span>
      </footer>
    </main>
  );
}
