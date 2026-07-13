import type {
  NetworkingCard,
  PublicNetworkingCard,
  SocialLink,
} from "./networking.types.js";

type NetworkingLinkRow = {
  platform: SocialLink["platform"] | null;
  url: string | null;
  label: string | null;
};

export type NetworkingCardRow = NetworkingLinkRow & {
  optIn: boolean | null;
};

export type PublicNetworkingCardRow = NetworkingLinkRow & {
  user_id: number;
  code: string;
  full_name: string;
  networking_opt_in: boolean | null;
  career_name: string | null;
  role_label: string;
};

const mapSocialLinks = (rows: readonly NetworkingLinkRow[]): SocialLink[] =>
  rows.flatMap((row) =>
    row.platform == null || row.url == null
      ? []
      : [{ platform: row.platform, url: row.url, label: row.label }],
  );

export const mapNetworkingCardRows = (
  owner: NetworkingCardRow,
  rows: readonly NetworkingLinkRow[],
): NetworkingCard => ({
  optIn: Boolean(owner.optIn),
  links: mapSocialLinks(rows),
});

export const mapPublicNetworkingCardRows = (
  owner: PublicNetworkingCardRow,
  rows: readonly NetworkingLinkRow[],
): PublicNetworkingCard => ({
  optIn: Boolean(owner.networking_opt_in),
  links: mapSocialLinks(rows),
  owner: {
    userId: Number(owner.user_id),
    fullName: owner.full_name,
    primaryDetail: owner.career_name ?? "",
    secondaryDetail: `${owner.code} - ${owner.role_label}`,
    roleLabel: owner.role_label,
  },
});
