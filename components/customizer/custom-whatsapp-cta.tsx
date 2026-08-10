"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomizerStore } from "@/store/customizer-store";
import { customOrderLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/track";

const spring = { type: "spring", stiffness: 300, damping: 24 } as const;

export function CustomWhatsAppCta() {
  const product = useCustomizerStore((s) => s.product);
  const selectedFabric = useCustomizerStore((s) => s.selectedFabric);
  const selectedFinish = useCustomizerStore((s) => s.selectedFinish);
  const selectedConfiguration = useCustomizerStore((s) => s.selectedConfiguration);
  const priceBreakdown = useCustomizerStore((s) => s.priceBreakdown);

  if (!product) return null;

  const { total } = priceBreakdown();
  const href = customOrderLink({
    productTitle: product.title,
    slug: product.slug,
    fabricName: selectedFabric?.name,
    finishName: selectedFinish?.name,
    configurationLabel: selectedConfiguration?.label,
    totalPrice: total,
  });

  return (
    <div className="space-y-2">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={spring}
      >
        <Button asChild variant="whatsapp" size="lg" className="w-full">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent(product._id, "WHATSAPP_CLICK")}
          >
            <MessageCircle aria-hidden="true" />
            Pedir este Mueble Personalizado
          </a>
        </Button>
      </motion.div>
      <p className="text-center text-xs text-brand-taupe">
        Te responderemos con disponibilidad y tiempo de fabricación.
      </p>
    </div>
  );
}
