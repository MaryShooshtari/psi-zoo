import { useEffect, useRef, useState } from 'react';
import { LEARNING_STEPS, learningObservation, type LearningStep } from './learningPath';
import type { MuseumScene, Topic } from './museumScience';

export function LearningJourney({ step, resumeKey = 0, scene, baseline, move, exit, tryAction, openChapter }: {
  step: number; resumeKey?: number; scene: MuseumScene | null; baseline: MuseumScene | null;
  move: (step: number) => void; exit: (finished: boolean) => void;
  tryAction: (action: LearningStep['action']) => void; openChapter: (topic: Topic) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), resume = useRef<HTMLButtonElement>(null);
  const lesson = LEARNING_STEPS[step]!;
  useEffect(() => { setCollapsed(false); }, [step, resumeKey]);
  useEffect(() => { if (!collapsed) heading.current?.focus(); }, [step, collapsed, resumeKey]);
  const attempt = (action: LearningStep['action']) => { setCollapsed(true); tryAction(action); };
  const ready = scene?.kind === '2d' && !!scene.snapshot.world;
  return <aside className="learning-panel" data-collapsed={collapsed} aria-labelledby="learning-title" data-step={step + 1}>
    <div className="learning-progress"><span aria-live="polite">Step {step + 1} of {LEARNING_STEPS.length}</span>{!collapsed && <button onClick={() => { setCollapsed(true); requestAnimationFrame(() => resume.current?.focus()); }}>Minimize</button>}<button onClick={() => exit(false)} aria-label="Exit learning path">Exit</button></div>
    <progress value={step + 1} max={LEARNING_STEPS.length} aria-label="Learning path progress" />
    <h2 id="learning-title" tabIndex={-1} ref={heading}>{lesson.title}</h2>
    {collapsed ? <button ref={resume} onClick={() => setCollapsed(false)}>Return to lesson</button> : <>
      <h3>What you are seeing</h3><p>{lesson.seeing}</p>
      <h3>Try this</h3><p>{lesson.tryThis}</p>
      <div className="controls"><button disabled={!ready} onClick={() => attempt(lesson.action)}>{lesson.actionLabel}</button>
        {step === 6 && <button disabled={!ready} onClick={() => attempt('Measure mood')}>Measure a mood</button>}</div>
      <h3>What happened?</h3><p data-learning-observation>{learningObservation(step, scene, baseline)}</p>
      <button className="learning-chapter" onClick={() => openChapter(lesson.topic)}>Learn more →</button>
      <nav className="learning-navigation" aria-label="Learning path steps">
        <button disabled={step === 0} onClick={() => move(step - 1)}>Back</button>
        <button onClick={() => step === LEARNING_STEPS.length - 1 ? exit(true) : move(step + 1)}>{step === LEARNING_STEPS.length - 1 ? 'Finish' : 'Next'}</button>
      </nav>
    </>}
  </aside>;
}
