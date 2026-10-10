export type Language = "jsx" | "js" | "ts" | "css" | "html" | "sql";

export type Category = "Checkout" | "Auth" | "Payment" | "Database" | "UI";

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  language: Language;
  category: Category;
  /** Current (possibly edited) content */
  content: string;
  /** Original content, used to compute the "modified" state and diffs */
  originalContent: string;
}

export interface CategoryMeta {
  label: string;
  /** Tailwind classes */
  dot: string;
  text: string;
  bg: string;
  border: string;
  ring: string;
  chip: string;
}

export interface Toast {
  id: number;
  message: string;
  type: "success" | "info" | "error";
}
