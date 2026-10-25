import { prisma } from "../src/db/prisma.js";

const specialties = [
  "General Practitioner",
  "Dermatologist",
  "Cardiologist",
  "Pediatrician",
];

const clinics = [
  {
    name: "Paris Central Clinic",
    city: "Paris",
    address: "12 Rue de Rivoli, 75001 Paris",
  },
  {
    name: "Lyon Part-Dieu Clinic",
    city: "Lyon",
    address: "45 Cours Lafayette, 69003 Lyon",
  },
];

// clinicIndex refers to the clinics array above
const doctors = [
  {
    name: "Dr. Claire Martin",
    specialty: "General Practitioner",
    clinicIndex: 0,
  },
  {
    name: "Dr. Louis Bernard",
    specialty: "General Practitioner",
    clinicIndex: 1,
  },
  { name: "Dr. Sophie Dubois", specialty: "Dermatologist", clinicIndex: 0 },
  { name: "Dr. Antoine Moreau", specialty: "Dermatologist", clinicIndex: 1 },
  { name: "Dr. Julie Laurent", specialty: "Cardiologist", clinicIndex: 0 },
  { name: "Dr. Marc Girard", specialty: "Cardiologist", clinicIndex: 1 },
  { name: "Dr. Emma Roux", specialty: "Pediatrician", clinicIndex: 0 },
  { name: "Dr. Hugo Fontaine", specialty: "Pediatrician", clinicIndex: 1 },
];

const faqs = [
  {
    title: "Cancellation policy",
    content:
      "Appointments can be cancelled free of charge up to 24 hours before the scheduled time. Cancellations made less than 24 hours in advance may be charged a fee of 20 euros. No-shows are charged 30 euros.",
  },
  {
    title: "Insurance and reimbursement",
    content:
      "Our clinics accept the French national health insurance (Carte Vitale) and most private mutual insurers. Consultations with a general practitioner cost 30 euros and are reimbursed at 70 percent. Specialist fees vary between 50 and 80 euros.",
  },
  {
    title: "Preparing for your visit",
    content:
      "Please arrive 10 minutes before your appointment. Bring a list of your current medications and any recent test results. Fasting is only required if your doctor asks for it in advance.",
  },
  {
    title: "Opening hours",
    content:
      "Our clinics are open Monday to Friday from 9:00 to 17:00. They are closed on weekends and on French public holidays. Online booking is available 24 hours a day.",
  },
  {
    title: "Rescheduling an appointment",
    content:
      "You can reschedule an appointment up to 24 hours before the scheduled time by cancelling it and booking a new slot. Rescheduling within 24 hours follows the cancellation policy.",
  },
  {
    title: "Documents to bring",
    content:
      "Please bring a photo ID, your Carte Vitale or insurance card, and your mutual insurance card if you have one. For children, bring the health record booklet (carnet de sante).",
  },
];

const patients = [
  { name: "Alice Dupont", email: "alice.dupont@example.com" },
  { name: "Bruno Lefevre", email: "bruno.lefevre@example.com" },
];

const SLOT_HOURS = [9, 10, 11, 14, 15, 16];
const SLOT_MINUTES = 30;
const DAYS_AHEAD = 14;

function buildSlotTimes(): Date[] {
  const times: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i),
    );
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // skip weekends
    for (const hour of SLOT_HOURS) {
      times.push(
        new Date(
          Date.UTC(
            day.getUTCFullYear(),
            day.getUTCMonth(),
            day.getUTCDate(),
            hour,
          ),
        ),
      );
    }
  }
  return times;
}

async function main() {
  // Reset in FK order so the seed can be re-run safely
  await prisma.$transaction([
    prisma.appointment.deleteMany(),
    prisma.slot.deleteMany(),
    prisma.doctor.deleteMany(),
    prisma.clinic.deleteMany(),
    prisma.specialty.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.faqChunk.deleteMany(),
    prisma.faqDocument.deleteMany(),
  ]);

  const specialtyRows = await Promise.all(
    specialties.map((name) => prisma.specialty.create({ data: { name } })),
  );
  const clinicRows = await Promise.all(
    clinics.map((data) => prisma.clinic.create({ data })),
  );

  const slotTimes = buildSlotTimes();

  for (const d of doctors) {
    const specialty = specialtyRows.find((s) => s.name === d.specialty)!;
    const clinic = clinicRows[d.clinicIndex]!;
    const doctor = await prisma.doctor.create({
      data: {
        name: d.name,
        bio: `${d.specialty} at ${clinic.name}.`,
        specialtyId: specialty.id,
        clinicId: clinic.id,
      },
    });
    await prisma.slot.createMany({
      data: slotTimes.map((startsAt) => ({
        doctorId: doctor.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + SLOT_MINUTES * 60_000),
      })),
    });
  }

  for (const faq of faqs) {
    await prisma.faqDocument.create({
      data: {
        title: faq.title,
        content: faq.content,
        chunks: { create: [{ chunkIndex: 0, content: faq.content }] },
      },
    });
  }

  await prisma.patient.createMany({ data: patients });

  const [doctorCount, slotCount, faqCount] = await Promise.all([
    prisma.doctor.count(),
    prisma.slot.count(),
    prisma.faqDocument.count(),
  ]);
  console.log(
    `Seeded: ${doctorCount} doctors, ${slotCount} slots, ${faqCount} FAQ documents`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
