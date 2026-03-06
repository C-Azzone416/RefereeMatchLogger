"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary text-sm px-4 py-2"
    >
      Print / Save PDF
    </button>
  );
}
