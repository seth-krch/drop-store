"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmReset, login, requestReset, resendCode, signup, verify, type FormState } from "./actions";

function Field({
  name, label, type = "text", state, autoComplete, hint, ...rest
}: {
  name: string; label: string; type?: string; state: FormState; autoComplete?: string; hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.fieldErrors?.[name];
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={state?.values?.[name]}
        aria-invalid={err ? true : undefined}
        aria-describedby={err || hint ? `${name}-msg` : undefined}
        {...rest}
      />
      {(err || hint) && <p id={`${name}-msg`} className={err ? "field__err" : "note"}>{err ?? hint}</p>}
    </div>
  );
}

function Banner({ state }: { state: FormState }) {
  if (state?.error) return <p className="banner banner--err" role="alert">{state.error}</p>;
  if (state?.notice) return <p className="banner" role="status">{state.notice}</p>;
  return null;
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={action} className="form" noValidate>
      <Banner state={state} />
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="Email" type="email" autoComplete="email" state={state} required />
      <Field name="password" label="Password" type="password" autoComplete="current-password" state={state} required />
      <p className="note"><Link href="/account/reset" className="u">Forgot your password?</Link></p>
      <button className="btn btn--block" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, null);
  return (
    <form action={action} className="form" noValidate>
      <Banner state={state} />
      <input type="hidden" name="next" value={next} />
      <Field name="name" label="First name" autoComplete="given-name" state={state} required maxLength={80} />
      <Field name="email" label="Email" type="email" autoComplete="email" state={state} required />
      <Field name="password" label="Password" type="password" autoComplete="new-password" state={state} required hint="At least 10 characters." />
      <label className="check">
        <input type="checkbox" name="terms" />
        <span>I agree to the <Link href="/terms" className="u">Terms</Link> and <Link href="/privacy" className="u">Privacy Policy</Link>.</span>
      </label>
      {state?.fieldErrors?.terms && <p className="field__err">{state.fieldErrors.terms}</p>}
      <label className="check">
        <input type="checkbox" name="news" />
        <span>Email me about upcoming drops.</span>
      </label>
      <button className="btn btn--block" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
  );
}

function ResendButton() {
  const [state, action, pending] = useActionState<FormState>(resendCode, null);
  return (
    <form action={action}>
      <Banner state={state} />
      <p className="note">Didn&rsquo;t get it? Check your spam folder or <button className="linkish" disabled={pending}>send a new code</button>.</p>
    </form>
  );
}

export function VerifyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verify, null);
  return (
    <>
      <form action={action} className="form" noValidate>
        <Banner state={state} />
        <Field name="code" label="Verification code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} state={state} required className="code" />
        <button className="btn btn--block" disabled={pending}>{pending ? "Verifying…" : "Verify email"}</button>
      </form>
      <ResendButton />
    </>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestReset, null);
  return (
    <form action={action} className="form" noValidate>
      <Banner state={state} />
      <Field name="email" label="Email" type="email" autoComplete="email" state={state} required />
      <button className="btn btn--block" disabled={pending}>{pending ? "Sending…" : "Send reset code"}</button>
    </form>
  );
}

export function ResetConfirmForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmReset, null);
  return (
    <>
      <form action={action} className="form" noValidate>
        <Banner state={state} />
        <Field name="code" label="Reset code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} state={state} required className="code" />
        <Field name="password" label="New password" type="password" autoComplete="new-password" state={state} required hint="At least 10 characters." />
        <button className="btn btn--block" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
      </form>
      <ResendButton />
    </>
  );
}
