import { NextResponse } from "next/server";
import { readSession, customerIdFromSession } from "@/lib/session";
import { getBusinessForCustomer, getWholesaleCatalog } from "@/services/wholesale";
import { WHOLESALE_MIN_SUBTOTAL, WHOLESALE_MIN_ITEM_QTY } from "@/config/wholesale";

export async function GET() {
  const session = await readSession();
  const customerId = customerIdFromSession(session);
  if (!session)
    return NextResponse.json({ ok: false, message: "برای مشاهده کاتالوگ عمده وارد حساب کاربری شوید." }, { status: 401 });
  const business = await getBusinessForCustomer(customerId, session.phone);
  if (!business)
    return NextResponse.json({ ok: false, message: "حساب عمده‌ای برای شما ثبت نشده است." }, { status: 403 });
  if (business.status !== "approved")
    return NextResponse.json(
      { ok: false, message: "حساب عمده شما هنوز تأیید نشده است.", status: business.status },
      { status: 403 },
    );

  const items = await getWholesaleCatalog(business.discountPercent);
  return NextResponse.json({
    ok: true,
    business: { code: business.code, businessName: business.businessName, discountPercent: business.discountPercent },
    rules: { minSubtotal: WHOLESALE_MIN_SUBTOTAL, minItemQty: WHOLESALE_MIN_ITEM_QTY },
    items,
  });
}
