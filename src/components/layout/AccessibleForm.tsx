import { useEffect, useId, useRef, useState, type FormHTMLAttributes } from "react";

/** Keeps native validation visible, associated with each field, and announced. */
export function AccessibleForm({ children, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const ref = useRef<HTMLFormElement>(null);
  const formId = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([tabindex='-1']), select, textarea");
    fields.forEach((field, i) => {
      if (!field.id) field.id = `${formId}-field-${i}`;
      if (field.required) {
        const label = form.querySelector(`label[for="${field.id}"]`);
        if (label && !label.textContent?.includes("required")) label.append(" (required)");
      }
      if (!field.autocomplete) field.autocomplete = field.type === "email" ? "email" : field.type === "tel" ? "tel" : /name/i.test(field.id) ? "name" : "off";
    });
    let lastAnnouncement = "";
    const announce = () => {
      const alert = form.querySelector<HTMLElement>("[role='alert']");
      if (!alert || !alert.textContent) return;
      if (alert.textContent === lastAnnouncement) return;
      lastAnnouncement = alert.textContent;
      alert.id ||= `${formId}-error`;
      const confirmation = /match/i.test(alert.textContent) ? fields[fields.length - 1] : null;
      const invalid = confirmation || form.querySelector<HTMLElement>("[aria-invalid='true']") || fields[0];
      if (invalid) {
        invalid.setAttribute("aria-invalid", "true");
        invalid.setAttribute("aria-describedby", [...new Set([...(invalid.getAttribute("aria-describedby") || "").split(" ").filter(Boolean), alert.id])].join(" "));
        invalid.focus();
      }
    };
    const observer = new MutationObserver(announce);
    observer.observe(form, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [formId]);
  return (
    <form {...props} ref={ref} noValidate onInput={(event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
        field.removeAttribute("aria-invalid");
      }
      props.onInput?.(event);
    }} onSubmit={(event) => {
      const fields = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:not([tabindex='-1']), select, textarea"));
      const invalid = fields.filter((field) => !field.validity.valid);
      if (invalid.length) {
        event.preventDefault();
        setErrors(Object.fromEntries(invalid.map((field) => [field.id, field.validationMessage])));
        fields.forEach((field) => { field.setAttribute("aria-invalid", String(!field.validity.valid)); if (!field.validity.valid) field.setAttribute("aria-describedby", `${field.id}-validation`); });
        invalid[0]?.focus();
        return;
      }
      setErrors({});
      fields.forEach((field) => { field.removeAttribute("aria-invalid"); if (field.getAttribute("aria-describedby")?.endsWith("-validation")) field.removeAttribute("aria-describedby"); });
      onSubmit?.(event);
    }}>
      {children}
      <div aria-live="assertive" className="col-span-full">
        {Object.entries(errors).map(([id, message]) => <p key={id} id={`${id}-validation`} className="mt-2 text-sm text-destructive">{message}</p>)}
      </div>
    </form>
  );
}