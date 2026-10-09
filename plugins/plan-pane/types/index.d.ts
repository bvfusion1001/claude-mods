export type Item = { isDone: boolean; text: string }
export type Section = { title: string; items: Item[] }
export type Doc = { path: string; sections: Section[] } | null
export type Tab = 'plan' | 'dod'
export type Working = { name: string; source: 'picked' | 'branch' | 'legacy' | 'none'; isFreeform: boolean }

declare module 'claude-code' {
  interface PluginState {
    'plan-pane': { plan: Doc; dod: Doc; tab: Tab; ticket: string | null; isOpen: boolean; working: Working; picker: string[] | null; found: string[] }
  }
}
