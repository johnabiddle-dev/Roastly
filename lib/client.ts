export function getBrowserId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("roastly-browser-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("roastly-browser-id", id);
  }
  return id;
}

export async function startCheckout(priceId: string, source = "upgrade_modal"): Promise<{ url?: string; error?: string }> {
  if (!priceId) return { error: "This product isn't set up yet." };
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, browserId: getBrowserId(), source }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.url) return { url: data.url };
  return { error: data.error || "Something went wrong" };
}
