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
import Extinction from './Extinction.svelte';
import Graph from './Graph.svelte';
import Modules from './Modules.svelte';
import Disbursement from './Disbursement.svelte';
import Monday from './Monday.svelte';

// `id` doubles as the URL anchor for deep links (#systems, #black-swans …).
// The story in four parts; `part` groups the chapters on the opening page.
export const PARTS = ['Two kinds of chains', 'How a chain grows rigid', 'When the world pulls on the chain', 'Chains that bend'];

export const CHAPTERS = [
  { id: 'start', short: 'Start', title: 'Two Kinds of Chains', component: Intro, part: 0 },
  { id: 'riddle', short: 'The riddle', title: 'A riddle about chains', component: Riddle, part: 1 },
  { id: 'specialization', short: 'Specialization', title: 'Why longer chains get cheaper', component: Specialization, part: 1 },
  { id: 'systems', short: 'Linked systems', title: 'When systems lean on each other', component: Systems, part: 2 },
  { id: 'queues', short: 'Queues', title: 'Why full calendars make long queues', component: Queues, part: 2 },
  { id: 'async', short: 'Asynchronous work', title: 'Don’t wait for each other', component: Async, part: 2 },
  { id: 'emergence', short: 'The fast track', title: 'The fast track', component: Local, part: 2 },
  { id: 'ergodicity', short: 'Averages', title: 'When the average lies', component: Ergodicity, part: 3 },
  { id: 'contagion', short: 'Contagion', title: '2008: when links became conditions', component: Contagion, part: 3 },
  { id: 'black-swans', short: 'Black swans', title: 'How to find a black swan', component: BlackSwans, part: 3 },
  { id: 'extinction', short: 'Extinction', title: 'Why species go extinct', component: Extinction, part: 3 },
  { id: 'tools', short: 'Tool or gate', title: 'Tool or gate?', component: Tools, part: 4 },
  { id: 'graph', short: 'Networks', title: 'The shape of the network', component: Graph, part: 4 },
  { id: 'modules', short: 'Modules', title: 'Two watchmakers', component: Modules, part: 4 },
  { id: 'disbursement', short: 'Disbursement', title: 'Time to disbursement', component: Disbursement, part: 4 },
  { id: 'monday', short: 'Playbook', title: 'What it means on Monday', component: Monday, part: 4, puzzle: false },
];
