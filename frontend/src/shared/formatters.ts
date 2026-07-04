export function currencyFromCents(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value / 100);
}

export function formatOrderDate(value: string): string {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue.replace(/([+-]\d{2})$/, "$1:00"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatRelativeTime(value: string): string {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue.replace(/([+-]\d{2})$/, "$1:00"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
