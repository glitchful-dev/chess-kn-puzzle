import '@glitchful-dev/ds-css';
import { initTheme } from '@glitchful-dev/ds-ui';
import { render } from 'preact';
import { App } from './App.tsx';
import './app.css';

initTheme();
render(<App />, document.getElementById('app') as HTMLElement);
