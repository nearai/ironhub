import { prisma } from "../db"
import { requireAuthSession } from "./session"

async function assertOrgMembership(organizationId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  })

  if (!member) {
    throw new Response("Not a member of this organization", { status: 403 })
  }
}

export async function requireActiveOrganization() {
  const { user, session } = await requireAuthSession()
  const organizationId = session.activeOrganizationId

  if (!organizationId) {
    throw new Response("No active organization selected", { status: 400 })
  }

  await assertOrgMembership(organizationId, user.id)

  return { organizationId, userId: user.id }
}
