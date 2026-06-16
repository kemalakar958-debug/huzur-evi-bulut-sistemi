import Patient360Client from './Patient360Client';

export default async function Patient360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Patient360Client patientId={id} />;
}
