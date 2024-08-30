import { Route, Router } from '@solidjs/router';
import { Component } from 'solid-js';
import IndexPage from './routes/page';
import GamePage from './routes/game/[id]';

const App: Component = () => {
  return (
    <Router>
      <Route path='/' component={IndexPage} />
      <Route path='/game/:gameId' component={GamePage} />
    </Router>
  );
};

export default App;
