export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Reading = { tokens: number; window: number; limits: Limit[] }
export type Handoff =
  | { phase: 'idle' }
  | { phase: 'stashing' }
  | { phase: 'ready'; name: string }
  | { phase: 'awaitClear'; name: string }
  | { phase: 'resuming'; name: string }

declare module 'claude-code' {
  interface PluginState {
    'context-band': { reading: Reading | null; handoff: Handoff }
  }
}
