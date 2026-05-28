import { Route, Router } from '@solidjs/router';
import { Component, Suspense } from 'solid-js';
import IndexPage from './routes/page';
import GamePage from './routes/game/[id]';
import { ColorModeProvider, ColorModeScript, createLocalStorageManager } from '@kobalte/core';
import { AnalyticsContext } from './lib/analytics';
import { cardSystem } from './lib/globals';
import { CardSystemProvider } from './lib/deckStore';
import { Toaster } from './components/ui/sonner';
import { getBuildData } from './lib/console-capture';
import { MetaProvider } from '@solidjs/meta';

const App: Component = () => {
  const storageManager = createLocalStorageManager('vite-ui-theme');
  return (
    <Router
      root={props => (
        <MetaProvider>
          <CardSystemProvider>
            <AnalyticsContext>
              <script>
                {`
                window.env = ${getBuildData()}
              `}
              </script>
              <ColorModeScript storageType={storageManager.type} />
              <ColorModeProvider storageManager={storageManager}>
                {/* <Nav /> */}
                <Suspense>{props.children}</Suspense>
                <Toaster />
              </ColorModeProvider>
            </AnalyticsContext>
          </CardSystemProvider>
        </MetaProvider>
      )}>
      <Route path='/' component={IndexPage} />
      <Route path='/game/:gameId' component={GamePage} />
    </Router>
  );
};

export default App;
