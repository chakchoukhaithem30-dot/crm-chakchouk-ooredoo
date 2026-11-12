import { html } from './utils/html.js';
import { App } from './App.js';

const rootEl = document.getElementById('root');
if (window.ReactDOM.createRoot) {
  window.ReactDOM.createRoot(rootEl).render(html`<${App} />`);
} else {
  window.ReactDOM.render(html`<${App} />`, rootEl);
}

