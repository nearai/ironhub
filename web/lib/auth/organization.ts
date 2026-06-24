import { randomUUID } from "node:crypto"

import { prisma } from "../db"

type OrganizationUser = {
  id: string
  name: string
  email: string
}

export async function createOrganization(user: OrganizationUser) {
  const base = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")
  const name = user.name.trim() ? user.name : user.email.split("@")[0]

  return prisma.organization.create({
    data: {
      id: randomUUID(),
      name,
      slug: `${base}-${Date.now()}`,
      createdAt: new Date(),
      members: {
        create: {
          id: randomUUID(),
          userId: user.id,
          role: "owner",
          createdAt: new Date(),
        },
      },
    },
  })
}

export async function getInitialOrganization(userId: string) {
  const existing = await prisma.organization.findFirst({
    where: { members: { some: { userId } } },
  })
  if (existing) {
    return existing
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  return createOrganization(user)
}
