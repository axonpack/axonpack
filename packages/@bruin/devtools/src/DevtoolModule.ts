import { NativeModule, requireNativeModule } from 'expo';

declare class DevtoolModule extends NativeModule<{}> {}

export default requireNativeModule<DevtoolModule>('Devtool');
