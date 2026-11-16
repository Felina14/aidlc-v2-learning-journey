import { mount } from './app';

mount(document, {
  fetch: (input, init) => window.fetch(input, init),
  getStorage: () => window.localStorage,
  getNudgeStorage: () => window.localStorage,
});
