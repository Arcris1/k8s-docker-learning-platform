// Content types
export interface ModuleMeta {
  id: string
  number: number
  title: string
  tier: number
  tierName: string
  slug: string
  objectives: string[]
  sections: Section[]
  labs: Lab[]
  checkpoints: Checkpoint[]
  keyTakeaways: string[]
  htmlContent: string
  codeBlocks: CodeBlock[]
}

export interface Section {
  id: string
  title: string
  level: number
  children: Section[]
}

export interface CodeBlock {
  language: string
  code: string
  highlightedHtml: string
  isAsciiDiagram: boolean
  meta?: string
}

export interface Lab {
  id: string
  title: string
  moduleId: string
  steps: LabStep[]
  initialState?: ClusterStateFixture
}

export interface LabStep {
  id: string
  instruction: string
  expectedCommands: string[]
  hints: string[]
  validation?: string
}

export interface Checkpoint {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// Cluster state types
export interface ClusterStateFixture {
  nodes?: K8sNode[]
  namespaces?: string[]
  pods?: Pod[]
  deployments?: Deployment[]
  services?: K8sService[]
  configmaps?: ConfigMap[]
  secrets?: K8sSecret[]
}

export interface K8sNode {
  name: string
  status: 'Ready' | 'NotReady'
  roles: string[]
  version: string
  internalIP: string
  os: string
  cpu: string
  memory: string
}

export interface Pod {
  name: string
  namespace: string
  status: 'Pending' | 'ContainerCreating' | 'Running' | 'Terminating' | 'Succeeded' | 'Failed' | 'CrashLoopBackOff'
  ready: string
  restarts: number
  age: string
  ip: string
  node: string
  labels: Record<string, string>
  containers: Container[]
  image: string
  ownerRef?: string
}

export interface Container {
  name: string
  image: string
  ports: number[]
  ready: boolean
  state: string
}

export interface Deployment {
  name: string
  namespace: string
  replicas: number
  readyReplicas: number
  availableReplicas: number
  image: string
  labels: Record<string, string>
  selector: Record<string, string>
  strategy: 'RollingUpdate' | 'Recreate'
  age: string
}

export interface ReplicaSet {
  name: string
  namespace: string
  replicas: number
  readyReplicas: number
  deployment: string
  labels: Record<string, string>
  age: string
}

export interface K8sService {
  name: string
  namespace: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName'
  clusterIP: string
  externalIP?: string
  ports: ServicePort[]
  selector: Record<string, string>
  age: string
}

export interface ServicePort {
  name?: string
  port: number
  targetPort: number
  nodePort?: number
  protocol: string
}

export interface ConfigMap {
  name: string
  namespace: string
  data: Record<string, string>
  age: string
}

export interface K8sSecret {
  name: string
  namespace: string
  type: string
  data: Record<string, string>
  age: string
}

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'exited' | 'created' | 'paused'
  ports: string
  created: string
  command: string
  networks: string[]
}

export interface DockerImage {
  repository: string
  tag: string
  id: string
  size: string
  created: string
}

export interface DockerNetwork {
  name: string
  id: string
  driver: string
  scope: string
  subnet?: string
  gateway?: string
  containers: string[]
}

export interface DockerVolume {
  name: string
  driver: string
  mountpoint: string
  created: string
}

export interface K8sEvent {
  type: 'Normal' | 'Warning'
  reason: string
  object: string
  message: string
  age: string
}

// Progress types
export interface UserProgress {
  modules: Record<string, ModuleProgress>
  labs: Record<string, LabProgress>
  lastActivity: string
  totalTimeSpent: number
}

export interface ModuleProgress {
  moduleId: string
  sectionsCompleted: string[]
  checkpointAnswers: Record<string, number>
  completed: boolean
  lastAccessed: string
}

export interface LabProgress {
  labId: string
  currentStep: number
  stepsCompleted: number[]
  completed: boolean
  lastAccessed: string
}

// Tier info
export interface TierInfo {
  id: number
  name: string
  slug: string
  description: string
  color: string
  icon: string
  modules: ModuleMeta[]
}

// Command reference
export interface CommandRef {
  tool: 'kubectl' | 'docker'
  command: string
  description: string
  syntax: string
  examples: string[]
  flags: CommandFlag[]
}

export interface CommandFlag {
  flag: string
  description: string
  example?: string
}

// Parsed command from terminal input
export interface ParsedCommand {
  tool: string
  subcommand: string
  args: string[]
  flags: Record<string, string | boolean>
  raw: string
}
