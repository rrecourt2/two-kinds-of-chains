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
import Gate from './Gate.svelte';
import Graph from './Graph.svelte';
import Modules from './Modules.svelte';
import Disbursement from './Disbursement.svelte';
import Knot from './Knot.svelte';
import Covenants from './Covenants.svelte';
import Automation from './Automation.svelte';
import Variety from './Variety.svelte';
import Tinkering from './Tinkering.svelte';
import RedQueen from './RedQueen.svelte';
import Pace from './Pace.svelte';
import Monday from './Monday.svelte';

// `id` doubles as the URL anchor for deep links (#systems, #black-swans …).
// The story in four parts; `part` groups the chapters on the opening page.
export const PARTS = ['Two kinds of chains', 'How a chain grows rigid', 'When the world pulls on the chain', 'Chains that bend', 'Chains that learn'];

export const CHAPTERS = [
  { id: 'start', short: 'Start', title: 'Two Kinds of Chains', component: Intro, part: 0 },
  { id: 'riddle', short: 'The riddle', title: 'A riddle about chains', component: Riddle, part: 1 },
  { id: 'specialization', short: 'Specialization', title: 'Why longer chains get cheaper', component: Specialization, part: 1 },
  { id: 'systems', short: 'Linked systems', title: 'When systems lean on each other', component: Systems, part: 2 },
  { id: 'queues', short: 'Queues', title: 'Why full calendars make long queues', component: Queues, part: 2 },
  { id: 'async', short: 'Asynchronous work', title: 'Don’t wait for each other', component: Async, part: 2 },
  { id: 'emergence', short: 'The fast track', title: 'The fast track', component: Local, part: 2 },
  { id: 'ergodicity', short: 'Averages', title: 'When the average lies', component: Ergodicity, part: 3 },
  { id: 'contagion', short: 'The stress test', title: 'When links become conditions', component: Contagion, part: 3 },
  { id: 'black-swans', short: 'Black swans', title: 'How to find a black swan', component: BlackSwans, part: 3 },
  { id: 'extinction', short: 'Extinction', title: 'Why species go extinct', component: Extinction, part: 3 },
  { id: 'gate', short: 'A gate worth keeping', title: 'The gate worth keeping', component: Gate, part: 4 },
  { id: 'graph', short: 'Networks', title: 'The shape of the network', component: Graph, part: 4 },
  { id: 'knot', short: 'Looped chains', title: 'A chain looped back on itself', component: Knot, part: 4 },
  { id: 'modules', short: 'Modules', title: 'Two watchmakers', component: Modules, part: 4 },
  { id: 'disbursement', short: 'Disbursement', title: 'Time to disbursement', component: Disbursement, part: 4 },
  { id: 'covenants', short: 'Covenants', title: 'A warning light, not a tripwire', component: Covenants, part: 4 },
  { id: 'tools', short: 'Person in the loop', title: 'A person in the loop', component: Tools, part: 5 },
  { id: 'automation', short: 'The reliable machine', title: 'The irony of the reliable machine', component: Automation, part: 5 },
  { id: 'variety', short: 'Requisite variety', title: 'Only variety absorbs variety', component: Variety, part: 5 },
  { id: 'tinkering', short: 'Many short chains', title: 'Many short chains', component: Tinkering, part: 5 },
  { id: 'redqueen', short: 'Running to stand still', title: 'Running to stand still', component: RedQueen, part: 5 },
  { id: 'pace', short: 'How fast to forget', title: 'How fast to forget', component: Pace, part: 5 },
  { id: 'monday', short: 'Patterns', title: 'What it means on Monday', component: Monday, part: 5, puzzle: false },
];
