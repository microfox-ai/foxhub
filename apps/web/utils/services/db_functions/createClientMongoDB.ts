import { MongoClient } from 'mongodb';
import { prisma } from '@/prisma/prisma';

export async function createClientMongoDB({
    userId,
    botProjectId,
    name,
}: {
    userId: string;
    botProjectId: string;
    name: string;
}) {
    const DB_URL = process.env.CLIENT_DB_URL;
    if (!DB_URL) {
        throw new Error("CLIENT_DB_URL is not set");
    }
    const client = new MongoClient(DB_URL);

    try {
        await client.connect();
        const db = client.db(name);
        await db.createCollection('init');
        await db.collection('init').insertOne({
            userId: userId,
            botProjectId: botProjectId,
            name: name,
            createdAt: new Date(),
        });

        await prisma.clientSecret.create({
            data: {
                botProjectId: botProjectId,
                userId: userId,
                name: name,
                type: 'Configs',
                variables: [{
                    key: 'DATABASE_URL',
                    value: DB_URL,
                    isOptional: true,
                    mode: ['production', 'staging', 'development'],
                }],
            },
        });
    } catch (error) {
        console.error('Error creating MongoDB database:', error);
        // Don't throw error here as the bot project is already created
    } finally {
        await client.close();
    }
}

