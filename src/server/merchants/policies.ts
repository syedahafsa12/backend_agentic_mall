import { queryOne, withPlatformScope } from "@/server/db/pool";

export interface MerchantPoliciesRow {
  merchant_id: string;
  shipping: Record<string, unknown>;
  returns: Record<string, unknown>;
  warranty: Record<string, unknown>;
  notes: string | null;
  updated_at: string;
}

const EMPTY: Omit<MerchantPoliciesRow, "merchant_id" | "updated_at"> = {
  shipping: {},
  returns: {},
  warranty: {},
  notes: null,
};

/** Reads are unrestricted by RLS (merchant_policies_read_all) — a missing row just means no policy has been set yet. */
export async function getMerchantPolicies(merchantId: string): Promise<MerchantPoliciesRow> {
  const row = await queryOne<MerchantPoliciesRow>(`select * from merchant_policies where merchant_id = $1`, [merchantId]);
  return row ?? { merchant_id: merchantId, updated_at: new Date(0).toISOString(), ...EMPTY };
}

/**
 * Writes require app.bypass_rls (merchant_policies_platform_write/update) —
 * same "app-level ownership check, then platform-scoped write" pattern as
 * setMerchantStatus/createAuthorization in repository.ts, since this table
 * has no owner_id column of its own to drive row-level ownership.
 */
export async function upsertMerchantPolicies(
  merchantId: string,
  patch: { shipping?: unknown; returns?: unknown; warranty?: unknown; notes?: string | null },
): Promise<MerchantPoliciesRow> {
  return withPlatformScope(async (client) => {
    const res = await client.query<MerchantPoliciesRow>(
      `insert into merchant_policies (merchant_id, shipping, returns, warranty, notes, updated_at)
       values ($1, coalesce($2, '{}'::jsonb), coalesce($3, '{}'::jsonb), coalesce($4, '{}'::jsonb), $5, now())
       on conflict (merchant_id) do update set
         shipping = coalesce($2, merchant_policies.shipping),
         returns = coalesce($3, merchant_policies.returns),
         warranty = coalesce($4, merchant_policies.warranty),
         notes = coalesce($5, merchant_policies.notes),
         updated_at = now()
       returning *`,
      [
        merchantId,
        patch.shipping !== undefined ? JSON.stringify(patch.shipping) : null,
        patch.returns !== undefined ? JSON.stringify(patch.returns) : null,
        patch.warranty !== undefined ? JSON.stringify(patch.warranty) : null,
        patch.notes !== undefined ? patch.notes : null,
      ],
    );
    if (!res.rows[0]) throw new Error("failed to save merchant policies");
    return res.rows[0];
  });
}
