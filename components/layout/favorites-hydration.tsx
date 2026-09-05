"use client";

import { useEffect } from "react";
import { useFavoritesStore } from "@/store/favorites-store";

export function FavoritesHydration() {
  useEffect(() => {
    void useFavoritesStore.persist.rehydrate();
  }, []);

  return null;
}
