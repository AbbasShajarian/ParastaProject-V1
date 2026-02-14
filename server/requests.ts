import { prisma } from "@/lib/prisma";

export type CreateRequestInput = {
  requesterPhone: string;
  userId?: number | null;
  patientId?: number;
  patient?: {
    nationalCode?: string;
    firstName?: string;
    lastName?: string;
    age?: number;
    gender?: "MALE" | "FEMALE" | "OTHER";
  };
  serviceItemId?: number;
  city?: string;
  time?: string;
  notes?: string;
};

export async function createRequest(input: CreateRequestInput) {
  const now = new Date();

  const patient = await getOrCreatePatient(input.patientId, input.patient, input.requesterPhone);
  const requester = await getOrCreateRequester(patient.id, input.requesterPhone, input.userId);
  const resolvedServiceItemId = await resolveServiceItemId(input.serviceItemId);

  await prisma.patientRequester.update({
    where: { id: requester.id },
    data: {
      totalRequests: { increment: 1 },
      lastRequestAt: now,
    },
  });

  const status =
    patient.verificationStatus === "VERIFIED" ? "NEW" : "DOCS_PENDING";

  const created = await prisma.request.create({
    data: {
      patientId: patient.id,
      requesterId: requester.id,
      serviceItemId: resolvedServiceItemId,
      status,
      city: input.city,
      time: input.time,
      notes: input.notes,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: created.id,
      actorRequesterId: requester.id,
      action: "REQUEST_CREATED",
    },
  });

  return created;
}

export async function listRequestsForUser(userId: number) {
  return prisma.request.findMany({
    where: {
      OR: [
        { requester: { userId } },
        {
          patient: {
            requesters: {
              some: {
                userId,
                historyAccessGranted: true,
              },
            },
          },
        },
      ],
    },
    include: {
      serviceItem: true,
      patient: {
        include: {
          documents: {
            select: { status: true },
          },
        },
      },
      requester: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRequestsForCaregiver(userId: number) {
  return prisma.request.findMany({
    where: { assignedCaregiverId: userId },
    include: {
      serviceItem: true,
      patient: {
        include: {
          documents: {
            select: { status: true },
          },
        },
      },
      requester: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listRequestsForSupport() {
  return prisma.request.findMany({
    where: { supportType: { not: null } },
    include: {
      serviceItem: true,
      patient: {
        include: {
          documents: {
            select: { status: true },
          },
        },
      },
      requester: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listRequestsForExpert() {
  return prisma.request.findMany({
    where: { supportType: null },
    include: {
      serviceItem: true,
      patient: {
        include: {
          documents: {
            select: { status: true },
          },
        },
      },
      requester: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listRequestsForAdmin() {
  return prisma.request.findMany({
    include: {
      serviceItem: true,
      patient: {
        include: {
          documents: {
            select: { status: true },
          },
        },
      },
      requester: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateRequestFields(id: number, data: Partial<{
  serviceItemId: number;
  patientId: number;
  city: string;
  time: string;
  notes: string;
  status: string;
  assignedCaregiverId: number | null;
  assignedExpertId: number | null;
  currentOwnerUserId: number | null;
  lastActionByUserId: number | null;
  supportType: "CANCEL" | "CHANGE" | "OTHER" | null;
}>) {
  return prisma.request.update({
    where: { id },
    data,
  });
}

async function getOrCreatePatient(
  patientId: number | undefined,
  patientData: CreateRequestInput["patient"] | undefined,
  requesterPhone?: string,
) {
  if (patientId) {
    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (existing) return existing;
  }

  const nationalCode = patientData?.nationalCode?.toString().trim();
  if (nationalCode) {
    const byNationalCode = await prisma.patient.findUnique({
      where: { nationalCode },
    });

    if (byNationalCode) return byNationalCode;

    const fullName = [patientData?.firstName, patientData?.lastName].filter(Boolean).join(" ").trim();
    return prisma.patient.create({
      data: {
        nationalCode,
        firstName: patientData?.firstName,
        lastName: patientData?.lastName,
        fullName: fullName || null,
        age: patientData?.age,
        gender: patientData?.gender,
        verificationStatus: "PENDING",
      },
    });
  }

  const fullName = [patientData?.firstName, patientData?.lastName].filter(Boolean).join(" ").trim();
  return prisma.patient.create({
    data: {
      nationalCode: generateTempNationalCode(requesterPhone),
      firstName: patientData?.firstName,
      lastName: patientData?.lastName,
      fullName: fullName || null,
      age: patientData?.age,
      gender: patientData?.gender,
      verificationStatus: "PENDING",
    },
  });
}

async function getOrCreateRequester(patientId: number, phone: string, userId?: number | null) {
  if (userId) {
    const byUser = await prisma.patientRequester.findFirst({
      where: { patientId, userId },
    });
    if (byUser) return byUser;
  }

  const byPhone = await prisma.patientRequester.findFirst({
    where: { patientId, phone },
  });
    if (byPhone) {
      if (userId && !byPhone.userId) {
        return prisma.patientRequester.update({
          where: { id: byPhone.id },
          data: { userId },
        });
      }
      return byPhone;
    }

  return prisma.patientRequester.create({
    data: {
      patientId,
      userId: userId ?? null,
      phone,
      score: 0,
      totalRequests: 0,
      lastRequestAt: null,
      isPrimary: false,
      isSecondary: false,
      historyAccessGranted: false,
    },
  });
}

const FALLBACK_CATEGORY_TITLE = "مشاوره و ارزیابی اولیه";
const FALLBACK_ITEM_TITLE = "تماس و تعیین نیازها";

async function resolveServiceItemId(serviceItemId?: number) {
  if (serviceItemId) {
    const existing = await prisma.serviceItem.findUnique({
      where: { id: serviceItemId },
    });
    if (existing) return existing.id;
  }

  return getOrCreateFallbackServiceItemId();
}

async function getOrCreateFallbackServiceItemId() {
  let category = await prisma.serviceCategory.findFirst({
    where: { title: FALLBACK_CATEGORY_TITLE },
  });

  if (!category) {
    category = await prisma.serviceCategory.create({
      data: {
        title: FALLBACK_CATEGORY_TITLE,
        sortOrder: 0,
        isActive: true,
      },
    });
  }

  let item = await prisma.serviceItem.findFirst({
    where: { title: FALLBACK_ITEM_TITLE, categoryId: category.id },
  });

  if (!item) {
    item = await prisma.serviceItem.create({
      data: {
        title: FALLBACK_ITEM_TITLE,
        categoryId: category.id,
        isActive: true,
      },
    });
  }

  return item.id;
}

function generateTempNationalCode(requesterPhone?: string) {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  const timestamp = Date.now().toString().slice(-6);
  const phonePart = requesterPhone ? requesterPhone.replace(/\D/g, "").slice(-4) : "0000";
  return `TEMP-${phonePart}-${timestamp}-${random}`;
}
