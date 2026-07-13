import { asc, eq, sql } from "drizzle-orm";
import type { db } from "../../db/index.js";
import { appUser, userSocialLink } from "../../db/schema/index.js";
import type { NetworkingCard, SocialLink } from "./networking.types.js";

export class NetworkingRepository {
  constructor(readonly database: typeof db) {}

  async findByUserId(userId: number): Promise<NetworkingCard | null> {
    // Una sola sentencia garantiza que opt-in y enlace provengan del mismo
    // snapshot aunque un PUT concurrente esté reemplazando el carnet.
    const rows = await this.database
      .select({
        ownerId: appUser.id,
        optIn: appUser.networkingOptIn,
        platform: userSocialLink.platform,
        url: userSocialLink.url,
        label: userSocialLink.label,
      })
      .from(appUser)
      .leftJoin(userSocialLink, eq(userSocialLink.userId, appUser.id))
      .where(eq(appUser.id, userId))
      .orderBy(asc(userSocialLink.id));

    const owner = rows[0];
    if (!owner) return null;

    return {
      optIn: Boolean(owner.optIn),
      links: rows.flatMap((row) =>
        row.platform == null || row.url == null
          ? []
          : [{ platform: row.platform, url: row.url, label: row.label }],
      ),
    };
  }

  async replaceByUserId(
    userId: number,
    optIn: boolean,
    link: SocialLink | null,
  ): Promise<NetworkingCard | null> {
    return this.database.transaction(async (tx) => {
      // El lock explícito serializa dos PUT concurrentes del mismo propietario
      // antes del delete+insert y preserva el máximo de una fila total.
      const locked = await tx.execute(sql`
        select id
        from app_user
        where id = ${userId}
        for update
      `) as unknown as Array<{ id: number }>;

      if (locked.length === 0) return null;

      await tx
        .update(appUser)
        .set({ networkingOptIn: optIn })
        .where(eq(appUser.id, userId));

      await tx.delete(userSocialLink).where(eq(userSocialLink.userId, userId));

      if (link) {
        await tx.insert(userSocialLink).values({
          userId,
          platform: link.platform,
          url: link.url,
          label: link.label ?? null,
        });
      }

      return {
        optIn,
        links: link ? [link] : [],
      };
    });
  }
}
