import Intro from './Intro.svelte';
import Riddle from './Riddle.svelte';
import Specialization from './Specialization.svelte';
import Systems from './Systems.svelte';
import Queues from './Queues.svelte';
import Async from './Async.svelte';
import Local from './Local.svelte';
import Tools from './Tools.svelte';
import Ergodicity from './Ergodicity.svelte';
import Contagion from './Contagion.svelte';
import BlackSwans from './BlackSwans.svelte';
import Survivors from './Survivors.svelte';
import Extinction from './Extinction.svelte';
import Graph from './Graph.svelte';
import Winners from './Winners.svelte';
import Monday from './Monday.svelte';

// `id` doubles as the URL anchor for deep links (#systems, #black-swans …).
export const CHAPTERS = [
  { id: 'start', short: 'Start', title: 'Two Kinds of Chains', component: Intro },
  { id: 'riddle', short: 'The riddle', title: 'A riddle about chains', component: Riddle },
  { id: 'specialization', short: 'Specialization', title: 'Why longer chains get cheaper', component: Specialization },
  { id: 'systems', short: 'Linked systems', title: 'When systems lean on each other', component: Systems },
  { id: 'queues', short: 'Queues', title: 'Why full calendars make long queues', component: Queues },
  { id: 'async', short: 'Asynchronous work', title: 'Don’t wait for each other', component: Async },
  { id: 'emergence', short: 'Emergence', title: 'When every part does its best', component: Local },
  { id: 'tools', short: 'AI and tools', title: 'Tools before gates', component: Tools },
  { id: 'ergodicity', short: 'Ergodicity', title: 'When the average lies', component: Ergodicity },
  { id: 'contagion', short: 'Contagion', title: '2008: when links became conditions', component: Contagion },
  { id: 'black-swans', short: 'Black swans', title: 'What the data cannot show', component: BlackSwans },
  { id: 'survivors', short: 'Survivorship bias', title: 'The planes that came back', component: Survivors },
  { id: 'extinction', short: 'Extinction', title: 'Why species go extinct', component: Extinction },
  { id: 'winners', short: 'Winner-take-all', title: 'Why the winner takes most', component: Winners },
  { id: 'graph', short: 'Networks', title: 'The shape of the network', component: Graph },
  { id: 'monday', short: 'Playbook', title: 'What to do on Monday', component: Monday },
];
