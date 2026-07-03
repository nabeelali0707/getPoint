import { prisma } from "../prisma.js";

const points = [
  {
    code: "GATE 7",
    name: "Central Library",
    description: "Main library transit stop near the central campus entrance.",
    referenceStopLat: 24.86,
    referenceStopLng: 67.08,
    status: "active" as const,
  },
  {
    code: "PLAZA 2",
    name: "Student Union",
    description: "Student union plaza pickup point.",
    referenceStopLat: 24.87,
    referenceStopLng: 67.07,
    status: "delayed" as const,
  },
  {
    code: "BLOCK C",
    name: "Engineering Block",
    description: "Engineering faculty shuttle stop.",
    referenceStopLat: 24.85,
    referenceStopLng: 67.09,
    status: "active" as const,
  },
  {
    code: "CAFE 1",
    name: "Main Cafeteria",
    description: "Cafeteria loop stop.",
    referenceStopLat: 24.86,
    referenceStopLng: 67.06,
    status: "inactive" as const,
  },
  {
    code: "CLINIC",
    name: "Health Center",
    description: "Campus health center transit point.",
    referenceStopLat: 24.88,
    referenceStopLng: 67.08,
    status: "signal_lost" as const,
  },
];

async function main() {
  for (const point of points) {
    await prisma.point.upsert({
      where: { code: point.code },
      update: {
        name: point.name,
        description: point.description,
        referenceStopLat: point.referenceStopLat,
        referenceStopLng: point.referenceStopLng,
        status: point.status,
      },
      create: point,
    });
  }

  console.info(`Seeded ${points.length} transit points.`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
