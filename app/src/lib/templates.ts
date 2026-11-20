import templatesJson from '../data/templates.json';

export interface TemplateStep { section: string; how: string; frames: string[] }
export interface Template { key: string; part: 'W1' | 'W2' | 'S1' | 'S2' | 'S3'; name: string; when: string; length: string; structure: TemplateStep[]; avoid: string[] }
interface TemplatesFile { intro: string; linkers: Record<string, string[]>; templates: Template[] }

const T = templatesJson as unknown as TemplatesFile;
export const TEMPLATE_INTRO = T.intro;
export const LINKERS = T.linkers;
export const TEMPLATES = T.templates;
export const templateByKey: Record<string, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));
/** W2 answers store `type_key` (opinion, adv_disadv…); the matching template key is `w2_<type_key>`. */
export const w2TemplateKey = (typeKey?: string) => (typeKey ? `w2_${typeKey}` : undefined);
export const templateHref = (key?: string) => (key && templateByKey[key] ? `/bai-mau/khung?k=${key}` : undefined);
