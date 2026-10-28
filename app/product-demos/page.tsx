import { permanentRedirect } from "next/navigation";

/** The product demos are listed on the hub; the old index URL moved there for good. */
export default function ProductDemos() {
  permanentRedirect("/#product-demos");
}
