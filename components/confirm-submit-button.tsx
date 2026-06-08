"use client";

/** A submit button that asks for confirmation before submitting its form. */
export function ConfirmSubmitButton({
  children,
  message,
  className = "btn-danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
