import { fileURLToPath } from "node:url";
import { prisma } from "../prisma.js";

export const points = [
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
  ...Array.from({ length: 20 }, (_, index) => {
    const gateNo = index + 1;
    return {
      code: `GATE ${gateNo}`,
      name: `Campus Gate ${gateNo}`,
      description: `Shuttle pickup point near campus gate ${gateNo}.`,
      referenceStopLat: 24.858 + index * 0.0006,
      referenceStopLng: 67.065 + (index % 5) * 0.0011,
      status: "active" as const,
    };
  }).filter((point) => point.code !== "GATE 7"),
  ...Array.from({ length: 10 }, (_, index) => {
    const blockName = String.fromCharCode("A".charCodeAt(0) + index);
    return {
      code: `BLOCK ${blockName}`,
      name: `Academic Block ${blockName}`,
      description: `Transit stop serving Academic Block ${blockName}.`,
      referenceStopLat: 24.852 + index * 0.001,
      referenceStopLng: 67.083 + (index % 4) * 0.0009,
      status: "active" as const,
    };
  }).filter((point) => point.code !== "BLOCK C"),
  ...Array.from({ length: 6 }, (_, index) => {
    const hostelNo = index + 1;
    return {
      code: `HOSTEL ${hostelNo}`,
      name: `Hostel ${hostelNo}`,
      description: `Residential shuttle stop for Hostel ${hostelNo}.`,
      referenceStopLat: 24.872 + index * 0.0007,
      referenceStopLng: 67.061 + (index % 3) * 0.001,
      status: "active" as const,
    };
  }),
  ...Array.from({ length: 3 }, (_, index) => {
    const cafeNo = index + 1;
    return {
      code: `CAFE ${cafeNo}`,
      name: cafeNo === 1 ? "Main Cafeteria" : `Cafeteria ${cafeNo}`,
      description: `Food court transit stop for Cafeteria ${cafeNo}.`,
      referenceStopLat: 24.86 + index * 0.0012,
      referenceStopLng: 67.06 + index * 0.0014,
      status: cafeNo === 1 ? ("inactive" as const) : ("active" as const),
    };
  }).filter((point) => point.code !== "CAFE 1"),
  ...Array.from({ length: 4 }, (_, index) => {
    const plazaNo = index + 1;
    return {
      code: `PLAZA ${plazaNo}`,
      name: plazaNo === 2 ? "Student Union" : `Student Plaza ${plazaNo}`,
      description: `Open plaza pickup point ${plazaNo}.`,
      referenceStopLat: 24.868 + index * 0.0008,
      referenceStopLng: 67.069 + index * 0.0007,
      status: plazaNo === 2 ? ("delayed" as const) : ("active" as const),
    };
  }).filter((point) => point.code !== "PLAZA 2"),
  {
    code: "AUDI 1",
    name: "Main Auditorium",
    description: "Event hall transit point near the main auditorium.",
    referenceStopLat: 24.8625,
    referenceStopLng: 67.076,
    status: "active" as const,
  },
  {
    code: "LAB 1",
    name: "Computer Lab Complex",
    description: "Pickup point beside the computer lab complex.",
    referenceStopLat: 24.8555,
    referenceStopLng: 67.087,
    status: "active" as const,
  },
  {
    code: "SPORTS",
    name: "Sports Complex",
    description: "Transit stop for the sports complex and grounds.",
    referenceStopLat: 24.8745,
    referenceStopLng: 67.073,
    status: "active" as const,
  },
  {
    code: "ADMIN",
    name: "Administration Block",
    description: "Administration block shuttle point.",
    referenceStopLat: 24.864,
    referenceStopLng: 67.0815,
    status: "active" as const,
  },
  {
    code: "PARKING N",
    name: "North Parking",
    description: "North parking shuttle pickup point.",
    referenceStopLat: 24.878,
    referenceStopLng: 67.079,
    status: "active" as const,
  },
  {
    code: "PARKING S",
    name: "South Parking",
    description: "South parking shuttle pickup point.",
    referenceStopLat: 24.851,
    referenceStopLng: 67.071,
    status: "active" as const,
  },
  {
    code: "MASJID",
    name: "Campus Masjid",
    description: "Transit point near the campus masjid.",
    referenceStopLat: 24.866,
    referenceStopLng: 67.067,
    status: "active" as const,
  },
  {
    code: "BOOKSHOP",
    name: "Bookshop Corner",
    description: "Pickup point near the campus bookshop.",
    referenceStopLat: 24.859,
    referenceStopLng: 67.074,
    status: "active" as const,
  },
  {
    code: "WORKSHOP",
    name: "Workshop Yard",
    description: "Engineering workshop shuttle stop.",
    referenceStopLat: 24.853,
    referenceStopLng: 67.091,
    status: "active" as const,
  },
  {
    code: "INCUBATOR",
    name: "Innovation Center",
    description: "Transit stop for the incubation and innovation center.",
    referenceStopLat: 24.871,
    referenceStopLng: 67.085,
    status: "active" as const,
  },
  {
    code: "EXAM HALL",
    name: "Examination Hall",
    description: "Exam hall pickup and drop-off point.",
    referenceStopLat: 24.856,
    referenceStopLng: 67.077,
    status: "active" as const,
  },
  {
    code: "FACULTY",
    name: "Faculty Offices",
    description: "Faculty offices transit point.",
    referenceStopLat: 24.863,
    referenceStopLng: 67.088,
    status: "active" as const,
  },
] satisfies Array<{
  code: string;
  name: string;
  description: string;
  referenceStopLat: number;
  referenceStopLng: number;
  status: "active" | "inactive" | "delayed" | "signal_lost";
}>;

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
