import Intro from './Intro.svelte';
import Riddle from './Riddle.svelte';
import Specialization from './Specialization.svelte';
import Modules from './Modules.svelte';
import Queues from './Queues.svelte';
import Variety from './Variety.svelte';
import Ergodicity from './Ergodicity.svelte';
import Contagion from './Contagion.svelte';
import Gate from './Gate.svelte';
import Tools from './Tools.svelte';
import Tinkering from './Tinkering.svelte';
import Pace from './Pace.svelte';
import Disbursement from './Disbursement.svelte';
import Monday from './Monday.svelte';

// `id` doubles as the URL anchor for deep links (#queues, #gate …).
// The story in five parts; `part` groups the chapters on the opening page.
export const PARTS = ['Two kinds of chains', 'How a chain grows rigid', 'When the world pulls on the chain', 'Chains that learn', 'One loan, the whole chain'];

// Twelve puzzles. The opening page has a quick guess that carries no points, and the playbook has none.
export const CHAPTERS = [
  { id: 'start', short: 'Start', title: 'Two Kinds of Chains', component: Intro, part: 0, puzzle: false },
  { id: 'riddle', short: 'The riddle', title: 'A riddle about chains', component: Riddle, part: 1 },
  { id: 'specialization', short: 'Specialization', title: 'Why longer chains get cheaper', component: Specialization, part: 1 },
  { id: 'modules', short: 'Two watchmakers', title: 'Two watchmakers', component: Modules, part: 1 },
  { id: 'queues', short: 'Queues', title: 'Why full calendars make long queues', component: Queues, part: 2 },
  { id: 'variety', short: 'Delegations', title: 'Only variety absorbs variety', component: Variety, part: 2 },
  { id: 'ergodicity', short: 'Averages', title: 'When the average lies', component: Ergodicity, part: 3 },
  { id: 'contagion', short: 'The stress test', title: 'When links become conditions', component: Contagion, part: 3 },
  { id: 'gate', short: 'The gate worth keeping', title: 'The gate worth keeping', component: Gate, part: 3 },
  { id: 'tools', short: 'Person in the loop', title: 'A person in the loop', component: Tools, part: 4 },
  { id: 'tinkering', short: 'Many short chains', title: 'Many short chains', component: Tinkering, part: 4 },
  { id: 'pace', short: 'How fast to forget', title: 'How fast to forget', component: Pace, part: 4 },
  { id: 'disbursement', short: 'Disbursement', title: 'Time to disbursement', component: Disbursement, part: 5 },
  { id: 'monday', short: 'Patterns', title: 'What it means on Monday', component: Monday, part: 5, puzzle: false },
];

// Chapters that left the story, and the chapter that now carries what each was about, so old links still land.
export const MOVED = {
  systems: 'queues',
  async: 'queues',
  emergence: 'variety',
  'black-swans': 'gate',
  covenants: 'gate',
  extinction: 'tinkering',
  graph: 'contagion',
  knot: 'disbursement',
  automation: 'tools',
  redqueen: 'pace',
};
