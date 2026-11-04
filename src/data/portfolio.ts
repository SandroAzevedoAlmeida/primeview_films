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

export const portfolio: PortfolioItem[] = [
  {
    title: "Chácara Parreiral - 50 Anos",
    slug: "chacaraparreiral-50anos",
    category: "video",
    description: "Vídeo Comemorativo de 50 anos do bairro Chácara Parreiral",
    thumbnail: "/assets/portfolio/thumb-chacaraparreiral.svg",
    videoUrl: "https://www.youtube.com/embed/XXXXX", // Substituir com seu vídeo no YouTube/Vimeo
    location: "Serra, ES",
    featured: true
  }
];