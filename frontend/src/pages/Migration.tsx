import { EmptyState } from '../components/EmptyState'
import { Page } from './Workspace'
export function Migration() { return <Page title="Migration plan" eyebrow="Plan"><EmptyState title="No migration plan available" description="Migration tasks will appear here after a plan has been generated and persisted by the backend." /></Page> }
