import Intro from './Intro.svelte';
import Riddle from './Riddle.svelte';
import Specialization from './Specialization.svelte';
import Dependence from './Dependence.svelte';
import Queues from './Queues.svelte';
import Ergodicity from './Ergodicity.svelte';
import Contagion from './Contagion.svelte';
import Extinction from './Extinction.svelte';
import Scale from './Scale.svelte';
import Monday from './Monday.svelte';

// `id` doubles as the URL anchor for deep links (#dependence, #contagion …).
export const CHAPTERS = [
  { id: 'start', short: 'Start', title: 'Two Kinds of Chains', component: Intro },
  { id: 'riddle', short: 'The riddle', title: 'A riddle about chains', component: Riddle },
  { id: 'specialization', short: 'Specialization', title: 'Why longer chains get cheaper', component: Specialization },
  { id: 'dependence', short: 'Dependence', title: 'Waiting for people who aren’t there', component: Dependence },
  { id: 'queues', short: 'Queues', title: 'Why full calendars make long queues', component: Queues },
  { id: 'ergodicity', short: 'Ergodicity', title: 'When the average lies', component: Ergodicity },
  { id: 'contagion', short: 'Contagion', title: '2008: when links became conditions', component: Contagion },
  { id: 'extinction', short: 'Extinction', title: 'Why species go extinct', component: Extinction },
  { id: 'scale', short: 'Scale', title: 'Scale amplifies what you build', component: Scale },
  { id: 'monday', short: 'Playbook', title: 'What to do on Monday', component: Monday },
];
