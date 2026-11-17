import type { ComponentType } from 'react';
import { Music, Clock, Disc3, Radio, Zap, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';
import Tempo from './tabs/Tempo';
import MetronomeTab from './tabs/Metronome';
import Repertoire from './tabs/Repertoire';
import Setlist from './tabs/Setlist';
import Performance from './tabs/Performance';
import Settings from './tabs/Settings';

/** Add a tab by adding an entry here. Keep it to five or fewer for a bottom bar. */
export interface TabDef {
  path: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

export const TABS: TabDef[] = [
  { path: '/', label: 'Tempo', icon: Music, component: Tempo },
  { path: '/metronome', label: 'Metronome', icon: Clock, component: MetronomeTab },
  { path: '/repertoire', label: 'Repertoire', icon: Disc3, component: Repertoire },
  { path: '/setlist', label: 'Setlist', icon: Radio, component: Setlist },
  { path: '/performance', label: 'Performance', icon: Zap, component: Performance },
  { path: '/settings', label: 'Settings', icon: SettingsIcon, component: Settings }
];
