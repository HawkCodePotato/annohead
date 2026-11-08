import { MainLayout } from '@/components/layouts/main'

export default function Layout({ children }: LayoutProps<'/[locale]'>) {
  return <MainLayout>{children}</MainLayout>
}
