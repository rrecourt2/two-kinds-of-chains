// Standalone page: the single-file build that opens from disk, an iframe or an artifact link.
import './theme.css';
import './page.css';
import { mountStory } from './mount.js';

mountStory(document.getElementById('app'), { theme: 'auto', syncHash: true });
