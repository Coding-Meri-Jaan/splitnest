import type { ComponentType } from "react";
import {
  CarrotIcon,
  HouseIcon,
  PartyPopperIcon,
  PlaneIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  ZapIcon,
} from "lucide-react";

import type { CategoryId } from "@/types";

type CategoryIcon = ComponentType<{ className?: string }>;

export interface CategoryMeta {
  label: string;
  icon: CategoryIcon;
}

export const categoryMeta: Record<CategoryId, CategoryMeta> = {
  food: { label: "Food", icon: UtensilsIcon },
  travel: { label: "Travel", icon: PlaneIcon },
  groceries: { label: "Groceries", icon: CarrotIcon },
  rent: { label: "Rent", icon: HouseIcon },
  utilities: { label: "Utilities", icon: ZapIcon },
  entertainment: { label: "Entertainment", icon: PartyPopperIcon },
  shopping: { label: "Shopping", icon: ShoppingBagIcon },
  other: { label: "Other", icon: ReceiptIcon },
};

export function getCategoryMeta(category: CategoryId): CategoryMeta {
  return categoryMeta[category];
}
