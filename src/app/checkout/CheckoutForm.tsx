"use client";

import { useActionState, useTransition } from "react";
import type { FormState } from "@/app/account/actions";
import { placeOrder } from "./actions";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

function F({ name, label, state, className, ...rest }: { name: string; label: string; state: FormState; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.fieldErrors?.[name];
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={`co-${name}`}>{label}</label>
      <input id={`co-${name}`} name={name} defaultValue={state?.values?.[name]} aria-invalid={err ? true : undefined} aria-describedby={err ? `co-${name}-err` : undefined} {...rest} />
      {err && <p id={`co-${name}-err`} className="field__err">{err}</p>}
    </div>
  );
}

export function CheckoutForm({ email, name }: { email: string; name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(placeOrder, null);
  const [, startTransition] = useTransition();
  const regionErr = state?.fieldErrors?.region;
  return (
    <form
      action={action}
      className="checkout"
      noValidate
      // Submit manually so a declined card doesn't clear everything the shopper typed.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state?.error && <p className="banner banner--err" role="alert">{state.error}</p>}
      <fieldset>
        <legend>Contact</legend>
        <p className="muted" style={{ margin: 0 }}>{email}</p>
      </fieldset>
      <fieldset>
        <legend>Shipping address</legend>
        <div className="grid2">
          <F name="name" label="Full name" autoComplete="name" state={state} className="span2" defaultValue={state?.values?.name ?? name} />
          <F name="line1" label="Address" autoComplete="address-line1" state={state} className="span2" />
          <F name="line2" label="Apartment, suite (optional)" autoComplete="address-line2" state={state} className="span2" />
          <F name="city" label="City" autoComplete="address-level2" state={state} />
          <div className="field">
            <label htmlFor="co-region">State</label>
            <select id="co-region" name="region" autoComplete="address-level1" defaultValue={state?.values?.region ?? ""} aria-invalid={regionErr ? true : undefined}>
              <option value="" disabled>Select</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {regionErr && <p className="field__err">{regionErr}</p>}
          </div>
          <F name="postal" label="ZIP code" autoComplete="postal-code" inputMode="numeric" state={state} />
          <div className="field"><label htmlFor="co-country">Country</label><input id="co-country" value="United States" disabled /></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Payment</legend>
        <p className="banner">Mystic is a demo store. No payment is taken and nothing ships. Use the test card 4242 4242 4242 4242 with any future expiry and any CVC.</p>
        <div className="grid2">
          <F name="number" label="Card number" autoComplete="off" inputMode="numeric" state={state} className="span2" />
          <F name="exp" label="Expiry (MM/YY)" autoComplete="off" inputMode="numeric" placeholder="MM/YY" state={state} />
          <F name="cvc" label="Security code" autoComplete="off" inputMode="numeric" maxLength={4} state={state} />
        </div>
      </fieldset>
      <button className="btn btn--block" disabled={pending}>{pending ? "Placing order…" : "Place order"}</button>
    </form>
  );
}
