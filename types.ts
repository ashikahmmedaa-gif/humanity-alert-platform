export type ReportStatus = "under_review" | "verified" | "in_progress" | "resolved" | "rejected";
export type Report = {
  id: string; title: string; country: string; region: string; category: string;
  original_language: string; original_text: string; english_text: string | null;
  status: ReportStatus; created_at: string; anonymous: boolean;
};
export const CATEGORIES = ["Food & Water","Education","Healthcare","Poverty","Natural Disasters","Housing & Shelter","Child Protection","Human Rights","Other Humanitarian Issues"];
export const LANGUAGES = ["English","Bengali","Arabic","French","Spanish","Urdu","Other"];
