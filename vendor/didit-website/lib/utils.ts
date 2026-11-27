import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Didit component `className` merger — follows shadcn convention exactly.
 *  Usage: <div className={cn("base", condition && "extra", props.className)} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
