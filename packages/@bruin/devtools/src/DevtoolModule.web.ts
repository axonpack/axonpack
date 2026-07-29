import { registerWebModule, NativeModule } from 'expo';

class DevtoolModule extends NativeModule<{}> {}

export default registerWebModule(DevtoolModule, 'DevtoolModule');
