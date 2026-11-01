import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { visibleControl } from './visibleControl';

export const SETTINGS_SECTIONS = ['Creatures', 'Terrain', 'Experiments', 'Appearance', 'Science notebook'] as const;
const sectionGroup = (section: SettingsSection): SettingsSection => ({ Simulation: 'Science notebook', 'Moods & friendships': 'Creatures', Display: 'Appearance', 'Physics notebook': 'Science notebook', Advanced: 'Science notebook' } as Partial<Record<SettingsSection, SettingsSection>>)[section] ?? section;
const sectionIcons = ['♧', '▧', '⚗', '◐', '▤'];
export const SETTINGS_ACTIONS = ['Measure position', 'Entangle moods', 'Measure mood'] as const;
const actionDescriptions = ['Choose a creature and localize its position.', 'Prepare a shared two-qubit mood for two creatures.', 'Choose a paired creature and a mood measurement basis.'];
export type SettingsSection = typeof SETTINGS_SECTIONS[number] | typeof SETTINGS_ACTIONS[number] | 'Simulation' | 'Moods & friendships' | 'Display' | 'Physics notebook' | 'Advanced' | 'Draw terrain' | 'Measure mood — X/Z';
interface SettingsNavigationValue {
  page: SettingsSection | null; navigate: (page: SettingsSection) => void;
  close: () => void; closeAndHandoff: (focusTarget: () => HTMLElement | null) => void;
}
const SettingsNavigation = createContext<SettingsNavigationValue | null>(null);
export function SettingsPage({ section, children }: { section: SettingsSection; children: ReactNode }) {
  const navigation = useContext(SettingsNavigation);
  return <div className="settings-page-content" hidden={navigation !== null && navigation.page !== sectionGroup(section) && !(section === 'Terrain' && navigation.page === 'Draw terrain')}>{section === 'Advanced' ? <details><summary>Advanced diagnostics & legacy experiments</summary>{children}</details> : children}</div>;
}
export function useSettingsNavigation() { return useContext(SettingsNavigation); }
/** Navigation only: targets and execution remain in the guarded native forms. */
export function SettingsHomeActions({ disabled = false }: { disabled?: boolean }) {
  const navigation = useSettingsNavigation();
  return <div className="settings-home-actions" aria-label="Terrarium actions">{SETTINGS_ACTIONS.map((section, i) =>
    <button key={section} disabled={disabled} data-settings-link={section} onClick={() => navigation?.navigate(section)}><strong>{section}</strong><small>{actionDescriptions[i]}</small></button>)}</div>;
}

/** Presentation only: children stay mounted when closed, preserving controls and
 * their state. The floating panel never participates in playground layout. */
export function SettingsPopover({ children, navigation = false, homeActions, onNavigate, requestedPage }: {
  children: ReactNode; navigation?: boolean; homeActions?: ReactNode; onNavigate?: (page: SettingsSection) => void; requestedPage?: { sequence: number; page: SettingsSection } | null;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<SettingsSection | null>(null);
  const lastSection = useRef<SettingsSection | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeFocus = useRef<(() => HTMLElement | null) | null>(null);
  const close = () => { closeFocus.current = () => previousFocus.current?.isConnected ? previousFocus.current : trigger.current; setOpen(false); };
  const closeAndHandoff = (focusTarget: () => HTMLElement | null) => { closeFocus.current = focusTarget; setOpen(false); };
  useEffect(() => {
    // This runs after hidden state is committed and the open effect's focus-trap
    // listeners are removed. Resolve a ref now, not while its region is hidden.
    if (!open) {
      const resolveFocus = closeFocus.current; closeFocus.current = null;
      if (!resolveFocus) return;
      const target = resolveFocus();
      if (target?.isConnected && target.getClientRects().length) target.focus();
      else trigger.current?.focus();
      return;
    }
    const element = panel.current!;
    element.querySelector<HTMLElement>('button')?.focus();
    // Click runs after native pointer focus handling, so returning focus to a
    // visible trigger is not immediately undone by a blank-background click.
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && !trigger.current?.contains(target)) {
        setOpen(false);
        if (document.activeElement === document.body || element.contains(document.activeElement)) previousFocus.current?.focus();
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      // Escape belongs to a top modal first; never cascade a handled key into
      // this popover and then the creature tool's cancellation handler.
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]')]
          .filter(visibleControl);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('click', outside); document.removeEventListener('keydown', keyboard); };
  }, [open]);
  useEffect(() => {
    if (!navigation || !open) return;
    if (panel.current) panel.current.scrollTop = 0;
    if (page) pageHeading.current?.focus();
    else if (lastSection.current) {
      const parent = SETTINGS_ACTIONS.some(action => action === lastSection.current) ? 'Experiments' : sectionGroup(lastSection.current);
      panel.current?.querySelector<HTMLElement>(`[data-settings-link="${parent}"]`)?.focus();
    }
  }, [page, navigation, open]);
  const navigate = (next: SettingsSection) => { onNavigate?.(next); lastSection.current = next; setPage(next); };
  useEffect(() => {
    if (!requestedPage) return;
    previousFocus.current = document.activeElement as HTMLElement;
    // Open after the originating click finishes bubbling, so it cannot be
    // mistaken for an outside click by the newly installed popover listener.
    const frame = requestAnimationFrame(() => { setOpen(true); navigate(requestedPage.page); });
    return () => cancelAnimationFrame(frame);
    // A navigation request is an explicit UI event, not a physics command.
  }, [requestedPage]);
  const show = (source: HTMLElement) => { previousFocus.current = source; setOpen(true); };
  return <SettingsNavigation.Provider value={navigation ? { page, navigate, close, closeAndHandoff } : null}><>
    <button ref={trigger} className="settings-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      onClick={event => open ? close() : show(event.currentTarget)}>Menu <span aria-hidden="true">☰</span></button>
    <div ref={panel} id={id} className="settings-popover" role="dialog" aria-label="Terrarium settings and help" hidden={!open}>
      <div className="popover-heading"><h2>Explore your terrarium</h2><button onClick={close} aria-label="Close settings">Close ×</button></div>
      {navigation && <>
        <nav className="settings-navigation" aria-label="Settings sections" hidden={page !== null}>
          {SETTINGS_SECTIONS.map((section, i) => <button key={section} data-settings-link={section} aria-controls={`${id}-pages`} onClick={() => navigate(section)}><span aria-hidden="true">{sectionIcons[i]} </span>{section}</button>)}
        </nav>
        <div hidden={page === null} className="settings-page-heading"><button onClick={() => setPage(null)}>← Back to menu</button><h3 ref={pageHeading} tabIndex={-1}>{page}</h3></div>
      </>}
      <div id={`${id}-pages`}>{navigation && <div hidden={page !== 'Experiments'}>{homeActions}</div>}{children}</div>
    </div>
  </></SettingsNavigation.Provider>;
}

export function PlaybackBar({ children }: { children: ReactNode }) {
  return <div className="playback-bar">{children}</div>;
}
