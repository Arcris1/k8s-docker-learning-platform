import { computed } from 'vue'
import { modules } from 'virtual:k8s-modules'
import type { ModuleMeta, TierInfo } from '../types'

const TIER_INFO: Omit<TierInfo, 'modules'>[] = [
  {
    id: 1,
    name: 'Foundations',
    slug: 'foundations',
    description: 'Docker basics, containerization concepts, and Kubernetes introduction',
    color: 'emerald',
    icon: 'cube',
  },
  {
    id: 2,
    name: 'Intermediate',
    slug: 'intermediate',
    description: 'Docker networking, Compose, Kubernetes workloads and services',
    color: 'cyan',
    icon: 'rocket',
  },
  {
    id: 3,
    name: 'Advanced',
    slug: 'advanced',
    description: 'Storage, security, configuration, monitoring and logging',
    color: 'amber',
    icon: 'star',
  },
  {
    id: 4,
    name: 'Master',
    slug: 'master',
    description: 'GitOps, service mesh, multi-cluster, advanced observability',
    color: 'violet',
    icon: 'academic-cap',
  },
]

export function useContentLoader() {
  const allModules = computed<ModuleMeta[]>(() => modules)

  const tiers = computed<TierInfo[]>(() =>
    TIER_INFO.map((info) => ({
      ...info,
      modules: modules.filter((m: ModuleMeta) => m.tier === info.id),
    }))
  )

  function getTier(tierId: number): TierInfo | undefined {
    return tiers.value.find((t) => t.id === tierId)
  }

  function getModule(slug: string): ModuleMeta | undefined {
    return modules.find((m: ModuleMeta) => m.slug === slug)
  }

  function getModulesByTier(tierId: number): ModuleMeta[] {
    return modules.filter((m: ModuleMeta) => m.tier === tierId)
  }

  function getModuleById(id: string): ModuleMeta | undefined {
    return modules.find((m: ModuleMeta) => m.id === id)
  }

  return {
    allModules,
    tiers,
    getTier,
    getModule,
    getModulesByTier,
    getModuleById,
  }
}
