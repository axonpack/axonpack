// Reexport the native module. On web, it will be resolved to DevtoolModule.web.ts
// and on native platforms to DevtoolModule.ts
export { default } from './DevtoolModule';
export * from './Devtool.types';
