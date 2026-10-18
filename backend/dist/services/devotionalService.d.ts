import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { devotionalFilterSchema } from '../validators/devotionalSchema';
export declare function listDevotionals(filter: z.infer<typeof devotionalFilterSchema>): Promise<{
    texts: {
        id: string;
        slug: string;
        title: string;
        contentStatus: string;
        category: string;
        deity: string;
        titleHindi: string;
        sourceUrl: string;
    }[];
    total: number;
    page: number;
    pages: number;
    deities: {
        name: string;
        count: true | {
            id?: number | undefined;
            sourceId?: number | undefined;
            category?: number | undefined;
            slug?: number | undefined;
            title?: number | undefined;
            titleHindi?: number | undefined;
            deity?: number | undefined;
            hindi?: number | undefined;
            transliteration?: number | undefined;
            contentStatus?: number | undefined;
            sourceUrl?: number | undefined;
            attribution?: number | undefined;
            checksum?: number | undefined;
            fetchedAt?: number | undefined;
            createdAt?: number | undefined;
            updatedAt?: number | undefined;
            _all?: number | undefined;
        } | undefined;
    }[];
}>;
export declare function getDevotional(category: string, slug: string): Promise<{
    text: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        title: string;
        contentStatus: string;
        category: string;
        deity: string;
        titleHindi: string;
        sourceId: string;
        hindi: string | null;
        transliteration: string | null;
        sourceUrl: string;
        attribution: string;
        checksum: string;
        fetchedAt: Date;
    };
    related: {
        id: string;
        slug: string;
        title: string;
        contentStatus: string;
        category: string;
        deity: string;
        titleHindi: string;
        sourceUrl: string;
    }[];
}>;
export declare function getCalendarMonth(year: number, month: number): Promise<{
    year: number;
    month: number;
    location: string;
    timezone: string;
    note: string;
    availableFrom: string | null;
    availableTo: string | null;
    days: {
        date: string;
        data: Prisma.JsonValue;
        sourceUrl: string;
        fetchedAt: Date;
    }[];
}>;
//# sourceMappingURL=devotionalService.d.ts.map