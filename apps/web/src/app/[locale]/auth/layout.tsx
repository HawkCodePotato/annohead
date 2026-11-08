import { AuthLayout } from '@/components/layouts/auth'

export default function Layout({ children }: LayoutProps<'/[locale]'>) {
  return <AuthLayout>{children}</AuthLayout>
}
