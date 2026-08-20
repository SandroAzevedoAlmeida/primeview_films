export type PortfolioCategory = "video" | "drone" | "fotografia" | "tour360";

export interface PortfolioItem {
  title: string;
  slug: string;
  category: PortfolioCategory;
  description?: string;
  thumbnail: string;
  videoUrl?: string;
  tourUrl?: string;
  location?: string;
  featured?: boolean;
}

// A coleção permanece vazia até que materiais reais sejam adicionados.
export const portfolio: PortfolioItem[] = [];