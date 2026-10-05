import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="auth" style={{ textAlign: "center" }}>
        <p className="mono muted">404</p>
        <h1 className="display">Not found</h1>
        <p className="muted">That page doesn’t exist, or it sold out and moved on.</p>
        <Link className="btn" href="/shop">Back to the shop</Link>
      </div>
    </div>
  );
}
