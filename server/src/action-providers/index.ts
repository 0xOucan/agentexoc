import { wethActionProvider } from './weth';
import { xocolatlActionProvider } from './xocolatl';
import { bobcProtocolActionProvider } from './bobc-protocol';

export const actionProviders = [
  wethActionProvider(),
  xocolatlActionProvider,
  bobcProtocolActionProvider,
];

export { wethActionProvider };
export { xocolatlActionProvider };
export { bobcProtocolActionProvider };