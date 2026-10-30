import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const SETTINGS_SECTIONS = ['Simulation', 'Terrain', 'Creatures', 'Moods & friendships', 'Experiments', 'Display', 'Physics notebook', 'Advanced'] as const;
export type SettingsSection = typeof SETTINGS_SECTIONS[number];
const SettingsNavigation = createContext<{ page: SettingsSection | null; navigate: (page: SettingsSection) => void } | null>(null);
export function SettingsPage({ section, children }: { section: SettingsSection; children: ReactNode }) {
  const navigation = useContext(SettingsNavigation);
  return <div className="settings-page-content" hidden={navigation !== null && navigation.page !== section}>{children}</div>;
}
export function useSettingsNavigation() { return useContext(SettingsNavigation); }

/** Presentation only: children stay mounted when closed, preserving controls and
 * their state. The floating panel never participates in playground layout. */
export function SettingsPopover({ children, navigation = false }: { children: ReactNode; navigation?: boolean }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<SettingsSection | null>(null);
  const lastSection = useRef<SettingsSection | null>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const close = () => { setOpen(false); previousFocus.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const element = panel.current!;
    element.querySelector<HTMLElement>('button')?.focus();
    // Click runs after native pointer focus handling, so returning focus to a
    // visible trigger is not immediately undone by a blank-background click.
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!element.contains(target) && !trigger.current?.contains(target) && !helpTrigger.current?.contains(target)) {
        setOpen(false);
        if (document.activeElement === document.body || element.contains(document.activeElement)) previousFocus.current?.focus();
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      // A native notebook dialog manages its own focus and Escape.
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]')]
          .filter(el => el.getClientRects().length > 0);
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
    if (!navigation) return;
    if (panel.current) panel.current.scrollTop = 0;
    if (page) pageHeading.current?.focus();
    else if (lastSection.current) panel.current?.querySelector<HTMLElement>(`[data-settings-link="${lastSection.current}"]`)?.focus();
  }, [page, navigation]);
  const navigate = (next: SettingsSection) => { lastSection.current = next; setPage(next); };
  const show = (source: HTMLElement) => { previousFocus.current = source; setOpen(true); };
  return <SettingsNavigation.Provider value={navigation ? { page, navigate } : null}><>
    <button ref={trigger} className="settings-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      onClick={event => open ? close() : show(event.currentTarget)}>Menu <span aria-hidden="true">☰</span></button>
    <button ref={helpTrigger} className="context-help" onClick={event => show(event.currentTarget)} aria-label="Help and settings" aria-haspopup="dialog" aria-controls={id}>? <span>Help & settings</span></button>
    <div ref={panel} id={id} className="settings-popover" role="dialog" aria-label="Terrarium settings and help" hidden={!open}>
      <div className="popover-heading"><h2>Explore your terrarium</h2><button onClick={close} aria-label="Close settings">Close ×</button></div>
      {navigation && <>
        <nav className="settings-navigation" aria-label="Settings sections" hidden={page !== null}>
          {SETTINGS_SECTIONS.map(section => <button key={section} data-settings-link={section} aria-controls={`${id}-pages`} onClick={() => navigate(section)}>{section}</button>)}
        </nav>
        <div hidden={page === null} className="settings-page-heading"><button onClick={() => setPage(null)}>← Back to menu</button><h3 ref={pageHeading} tabIndex={-1}>{page}</h3></div>
      </>}
      <div id={`${id}-pages`}>{children}</div>
    </div>
  </></SettingsNavigation.Provider>;
}

export function PlaybackBar({ children }: { children: ReactNode }) {
  return <div className="playback-bar">{children}</div>;
}
