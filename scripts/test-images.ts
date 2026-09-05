import assert from "node:assert/strict";
import { normalizeImageUrl } from "../lib/utils";

const generated = "https://camihogar-rose.vercel.app/_next/image?url=%2Fhero%2Fliving-warm.jpg&w=1200&q=75";
assert.equal(normalizeImageUrl(generated), "/hero/living-warm.jpg");
assert.equal(normalizeImageUrl("/products/sofa.jpg"), "/products/sofa.jpg");
assert.equal(normalizeImageUrl("https://res.cloudinary.com/demo/image/upload/sofa.jpg"), "https://res.cloudinary.com/demo/image/upload/sofa.jpg");
console.log("Image URL checks passed.");