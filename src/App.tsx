import { Route, Router } from '@solidjs/router';
import { Component, Suspense } from 'solid-js';
import IndexPage from './routes/page';
import GamePage from './routes/game/[id]';
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core';
import { AnalyticsContext } from './lib/analytics';

const App: Component = () => {
  const storageManager = createLocalStorageManager('vite-ui-theme');
  return (
    <Router
      root={props => (
        <AnalyticsContext>
          <ColorModeScript storageType={storageManager.type} />
          <ColorModeProvider storageManager={storageManager}>
            {/* <Nav /> */}
            <Suspense>{props.children}</Suspense>
          </ColorModeProvider>
        </AnalyticsContext>
      )}>
      <Route path='/' component={IndexPage} />
      <Route path='/game/:gameId' component={GamePage} />
    </Router>
  );
};

export default App;
