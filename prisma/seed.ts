import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    // ---------- 1. Roles ----------
    const roles = ["ADMIN", "EXPERT", "USER", "CARE_GIVER", "SUPPORT"];

    for (const roleName of roles) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });
    }

    // ---------- 2. Seed Users ----------
    const seedUsers = [
        { phone: "09120000001", password: "12345678", firstName: "Admin", lastName: "Root", roles: ["ADMIN"] },
        { phone: "09120000002", password: "12345678", firstName: "Expert", lastName: "One", roles: ["EXPERT"] },
        { phone: "09120000003", password: "12345678", firstName: "Support", lastName: "One", roles: ["SUPPORT"] },
        { phone: "09120000004", password: "12345678", firstName: "Care", lastName: "Giver", roles: ["CARE_GIVER"] },
        { phone: "09120000005", password: "12345678", firstName: "User", lastName: "One", roles: ["USER"] },
    ];

    for (const seed of seedUsers) {
        let user = await prisma.user.findUnique({ where: { phone: seed.phone } });
        const hashedPassword = await bcrypt.hash(seed.password, 10);

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phone: seed.phone,
                    password: hashedPassword,
                    firstName: seed.firstName,
                    lastName: seed.lastName,
                },
            });
            console.log(`✅ User created: ${seed.phone}`);
        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    firstName: seed.firstName,
                    lastName: seed.lastName,
                },
            });
            console.log(`✅ User updated: ${seed.phone}`);
        }

        for (const roleName of seed.roles) {
            const role = await prisma.role.findUnique({ where: { name: roleName } });
            if (!role) continue;

            await prisma.userRole.upsert({
                where: {
                    userId_roleId: {
                        userId: user.id,
                        roleId: role.id,
                    },
                },
                update: {},
                create: {
                    userId: user.id,
                    roleId: role.id,
                },
            });
        }
    }

    // ---------- 4. Service Catalog ----------
    const catalog = [
        {
            title: "پرستاری",
            items: [
                { title: "پرستار سالمند", price: null },
                { title: "پرستار بیمار", price: null },
            ],
        },
        {
            title: "خدمات پزشکی",
            items: [
                { title: "تزریقات و پانسمان", price: null },
                { title: "مراقبت شبانه‌روزی", price: null },
            ],
        },
    ];

    for (const category of catalog) {
        let categoryRow = await prisma.serviceCategory.findFirst({
            where: { title: category.title },
        });

        if (!categoryRow) {
            categoryRow = await prisma.serviceCategory.create({
                data: { title: category.title },
            });
        }

        for (const item of category.items) {
            const exists = await prisma.serviceItem.findFirst({
                where: { categoryId: categoryRow.id, title: item.title },
            });

            if (!exists) {
                await prisma.serviceItem.create({
                    data: {
                        categoryId: categoryRow.id,
                        title: item.title,
                        price: item.price ?? null,
                    },
                });
            }
        }
    }

    console.log("✅ Service catalog seeded");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
