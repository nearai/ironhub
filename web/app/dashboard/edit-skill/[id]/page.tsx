import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Editing moved onto the item's own page: managing and editing one item is a
 * single job, and splitting it across two routes meant a round trip for every
 * change. Kept as a redirect so links already handed out still land somewhere
 * useful.
 */
export default async function EditSkillRedirect({ params }: PageProps) {
  const { id } = await params
  return redirect(`/dashboard/manage/${id}`)
}
