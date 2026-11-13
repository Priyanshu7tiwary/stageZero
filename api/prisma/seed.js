// Demo data: 3 open jobs, 4 candidates each, everyone in the Applied stage,
// plus the recruiter sign-in account (ADMIN_EMAIL / ADMIN_PASSWORD).
//
//   npm run db:seed                  -> wipe the database and load this data
//   node prisma/seed.js --if-empty   -> only load it into an empty database (Docker does this)
//
// People are fictional; all emails use example.com.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const inDays = (n) => new Date(`${new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`);

const JOBS = [
  {
    title: 'Senior Backend Engineer',
    location: 'Bengaluru (Hybrid)',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    minExperienceYears: 4,
    skillsWeight: 60,
    screeningPassCount: 2,
    closingDate: inDays(30),
    candidates: [
      { fullName: 'Rohan Iyer', email: 'rohan.iyer@example.com', phone: '+91 98450 11223', skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS'], experienceYears: 6 },
      { fullName: 'Meera Pillai', email: 'meera.pillai@example.com', phone: '+91 99001 44556', skills: ['Node.js', 'JavaScript', 'MongoDB', 'Express'], experienceYears: 3, referred: true },
      { fullName: 'Aditya Rao', email: 'aditya.rao@example.com', phone: null, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Kafka'], experienceYears: 7 },
      { fullName: 'Kavya Nair', email: 'kavya.nair@example.com', phone: '+91 90080 77889', skills: ['TypeScript', 'NestJS', 'Postgres', 'GCP'], experienceYears: 4.5 },
    ],
  },
  {
    title: 'Frontend Developer',
    location: 'Remote (India)',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
    minExperienceYears: 2,
    skillsWeight: 70,
    screeningPassCount: 2,
    closingDate: inDays(21),
    candidates: [
      { fullName: 'Ishaan Malhotra', email: 'ishaan.malhotra@example.com', phone: '+91 98110 23344', skills: ['React.js', 'TypeScript', 'Next.js', 'Tailwind'], experienceYears: 3 },
      { fullName: 'Sneha Kulkarni', email: 'sneha.kulkarni@example.com', phone: null, skills: ['Vue.js', 'JavaScript', 'CSS', 'Figma'], experienceYears: 2 },
      { fullName: 'Arjun Bhatia', email: 'arjun.bhatia@example.com', phone: '+91 97300 55667', skills: ['React', 'Redux', 'JavaScript'], experienceYears: 1.5, referred: true },
      { fullName: 'Nikita Joshi', email: 'nikita.joshi@example.com', phone: '+91 96200 88990', skills: ['Angular', 'TypeScript', 'RxJS'], experienceYears: 5 },
    ],
  },
  {
    title: 'Data Analyst',
    location: 'Hyderabad',
    skills: ['SQL', 'Python', 'Power BI', 'Excel'],
    minExperienceYears: 2,
    skillsWeight: 50,
    screeningPassCount: 2,
    closingDate: inDays(14),
    candidates: [
      { fullName: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91 98765 43210', skills: ['SQL', 'Python', 'Tableau', 'Excel'], experienceYears: 3 },
      { fullName: 'Vikram Reddy', email: 'vikram.reddy@example.com', phone: '+91 99490 12121', skills: ['SQL', 'Power BI', 'Excel', 'DAX'], experienceYears: 2 },
      { fullName: 'Ananya Das', email: 'ananya.das@example.com', phone: null, skills: ['R', 'Statistics', 'Excel'], experienceYears: 1, referred: true },
      { fullName: 'Karthik Menon', email: 'karthik.menon@example.com', phone: '+91 94470 34343', skills: ['Python', 'pandas', 'SQL', 'Machine Learning'], experienceYears: 4 },
    ],
  },
];

async function main() {
  if (process.argv.includes('--if-empty') && (await prisma.job.count()) > 0) {
    console.log('Database already has data; skipping seed.');
    return;
  }

  // Clear everything (applications cascade from jobs/candidates; tokens from users).
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const email = (process.env.ADMIN_EMAIL || 'recruiter@example.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'password123';
  await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME || 'Demo Recruiter', passwordHash: await bcrypt.hash(password, 10) },
  });

  for (const { candidates, ...job } of JOBS) {
    const created = await prisma.job.create({ data: { ...job, status: 'OPEN' } });
    for (const { referred = false, ...candidate } of candidates) {
      await prisma.application.create({
        data: {
          stage: 'APPLIED',
          referred,
          job: { connect: { id: created.id } },
          candidate: { create: candidate },
        },
      });
    }
  }

  const count = JOBS.reduce((n, j) => n + j.candidates.length, 0);
  console.log(`Seeded ${JOBS.length} jobs and ${count} candidates (all in Applied). Sign in: ${email}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
