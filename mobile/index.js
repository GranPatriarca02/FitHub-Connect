import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App)
// Se encarga de que la app funcione tanto en Expo Go como en builds nativos
registerRootComponent(App);
