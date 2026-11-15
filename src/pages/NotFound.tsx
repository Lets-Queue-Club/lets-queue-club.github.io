import { EmptyState } from '../components/Layout.tsx'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

export function NotFound({ what = 'Page' }: { what?: string }) {
  useTitle('Not found')
  return (
    <EmptyState title={`${what} not found`}>
      <p>That link doesn&apos;t match anything in the club records.</p>
      <a className="button primary" href={paths.home()}>Back to home</a>
    </EmptyState>
  )
}
