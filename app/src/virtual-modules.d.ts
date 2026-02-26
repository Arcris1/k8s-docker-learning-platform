declare module 'virtual:k8s-modules' {
  import type { ModuleMeta } from './types'
  export const modules: ModuleMeta[]
  export default modules
}

declare module 'splitpanes' {
  import { DefineComponent } from 'vue'
  export const Splitpanes: DefineComponent<any, any, any>
  export const Pane: DefineComponent<any, any, any>
}
