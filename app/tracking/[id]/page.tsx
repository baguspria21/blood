import { TrackingStatus } from './_components/TrackingStatus'

export const metadata = {
  title: 'Tracking Permintaan Darah — Blood-Connect Palu',
  description: 'Pantau status permintaan darah Anda secara real-time.',
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <TrackingStatus requestId={id} />
}
