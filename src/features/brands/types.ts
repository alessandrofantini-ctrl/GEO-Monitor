export interface BrandFormData {
  name: string;
  url: string;
  country: string;
  location?: string;
  language: string;
  platforms: string[];
}

export interface SiteAnalysisResult {
  name: string;
  description: string;
  aliases: string[];
  country: string;
  language: string;
  categories: string[];
}

export interface GenerateQueriesInput {
  brand: string;
  aliases: string[];
  categories: string[];
  promptsPerCategory: number;
  country: string;
  language: string;
}

export interface GeneratedQuery {
  text: string;
  category: string;
}
