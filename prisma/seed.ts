import { prisma } from '../src/lib/db';

async function main() {
  const existing = await prisma.platformSetting.findFirst();
  if (!existing) {
    await prisma.platformSetting.create({
      data: { commissionRate: 12, subscriptionFee: 50 },
    });
    console.log('Created default platform settings.');
  } else {
    console.log('Platform settings already exist.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
