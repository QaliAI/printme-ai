import type { CuratedDesign, PrintPlacement } from '../types';

export type DesignPublicationStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'archived';
export type DesignFilter = 'new' | 'trending' | 'bestsellers' | 'archive';

export interface CuratedDesignRecord extends CuratedDesign {
  slug: string;
  artistOrSource: string;
  rightsStatus: string;
  publicationStatus: DesignPublicationStatus;
  publicationDate: string | null;
  tags: string[];
  defaultProductColor: string | null;
  defaultPlacement: PrintPlacement;
  compatibleProductIds: string[];
  incompatibleProductIds: string[];
  merchandisingPriority: number;
  seoTitle: string;
  seoDescription: string;
  filters: DesignFilter[];
}

export interface DesignCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  publicationStatus: DesignPublicationStatus;
  designIds: string[];
}
export interface DesignDrop {
  id: string;
  slug: string;
  title: string;
  description: string;
  publicationStatus: DesignPublicationStatus;
  publicationDate: string | null;
  designIds: string[];
}
