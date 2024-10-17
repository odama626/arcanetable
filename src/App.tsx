import { Route, Router } from '@solidjs/router';
import { Component, Suspense } from 'solid-js';
import IndexPage from './routes/page';
import GamePage from './routes/game/[id]';
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core';

const App: Component = () => {
  const storageManager = createLocalStorageManager('vite-ui-theme');
  return (
    <Router
      root={props => (
        <>
          <ColorModeScript storageType={storageManager.type} />
          <ColorModeProvider storageManager={storageManager}>
            {/* <Nav /> */}
            <Suspense>{props.children}</Suspense>
          </ColorModeProvider>
        </>
      )}>
      <Route path='/' component={IndexPage} />
      <Route path='/game/:gameId' component={GamePage} />
    </Router>
  );
};

export default App;
