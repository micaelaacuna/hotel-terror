import cds from '@sap/cds';
import { Extras } from '#cds-models/hotel';
import { round2 } from '../../lib/pricing';

interface ChargeData {
  ID?: string;
  quantity?: number;
  extra_code?: string;
  amount?: number;
}

// a charge's amount is quantity times the extra's unit price. clients never set it, so recompute
// on every write and overwrite whatever came in. charges are a composition under the booking
// draft, so this also runs on the draft rows; read any missing field back from req.target, which
// points at the draft or active table being written.
export async function priceCharge(req: cds.Request): Promise<void> {
  const data = req.data as ChargeData;
  let { quantity, extra_code } = data;
  const ID = data.ID;

  // UPDATE sends only the changed fields, so fill the rest in from the stored row
  if (ID != null && (quantity == null || extra_code == null)) {
    const stored = (await SELECT.one.from(req.target.name).where({ ID })) as ChargeData | undefined;
    if (stored) {
      quantity ??= stored.quantity;
      extra_code ??= stored.extra_code;
    }
  }

  if (extra_code == null) return;

  const extra = await SELECT.one.from(Extras).columns('price').where({ code: extra_code });
  if (!extra) return;

  req.data.amount = round2(Number(quantity ?? 1) * Number(extra.price ?? 0));
}
