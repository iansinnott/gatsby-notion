import { PluginOptions } from 'gatsby';

export interface NotionDatabasePluginOptions extends PluginOptions {
  name: string;
  databaseViewUrl: string;
  debug?: boolean;
  token?: string;
}

export interface NotionPageAttribute {
  att: string;
  value?: string;
}

export interface NotionPageText {
  text: string;
  atts: NotionPageAttribute[];
}

export interface NotionPageProperty {
  propName: string;
  value: NotionPageText[];
}

export interface NotionPageBlock {
  type: string;
  blockId: string;
  properties: NotionPageProperty[];
  attributes: NotionPageAttribute[];
  blockIds: string[];
  collectionViews?: CollectionViewMap[];
}

export interface Aggregate {
  property: string;
  type: string;
  aggregation_type: string;
  id: 'count' | string;
  view_type: string;
}

export interface Aggregate2 {
  property: string;
  aggregator: string;
}
export interface Query2 {
  aggregate: Aggregate[];
  aggregations: Aggregate2[];
  filter: {
    filters: any[];
    operator: string;
  };
  sort: any[];
}

export type NotionCollectionSchema = {
  [k: string]: {
    name: string;
    type: string;
    options: any[];
  };
};

// Not well typed yet
export type NotionCollectionFormat = { [k: string]: any };

export interface NotionCollection {
  id: string;
  version: number;
  name: string[];
  schema: NotionCollectionSchema;
  format: NotionCollectionFormat;
  parent_id: string;
  parent_table: 'block';
  alive: boolean;
}

export interface NotionCollectionView {
  id: string;
  version: number;
  type: string; // Is actually any enum: "list" | "table" | ... others I don't know about
  name: string;
  format: NotionCollectionFormat;
  parent_id: string;
  parent_table: 'block';
  alive: boolean;
  page_sort?: string[]; // A string of ids, not always defined though...
  query2: Query2;
}

export interface NotionPageImage {
  pageId: string;
  notionUrl: string;
  signedUrl: string;
  contentId: string;
}

export interface NotionImageNodes {
  imageUrl: string;
  localFile: {
    publicURL: string;
  };
}

export interface NotionPageLinkedPage {
  pageId: string;
}

export interface NotionPageDescription {
  pageId: string;
  title: string;
  indexPage: number;
  slug: string;
  excerpt: string;
  pageIcon: string;
  createdAt: string;
  tags: string[];
  isDraft: boolean;
  blocks: NotionPageBlock[];
  images: NotionPageImage[];
  linkedPages: NotionPageLinkedPage[];
  properties: NotionPageProperty[];
  collectionViews?: CollectionViewMap[];
}

// generic type to hold json data
export type JsonTypes = string | number | boolean | Date | Json | JsonArray;
export interface Json {
  [x: string]: JsonTypes;
}
export type JsonArray = Array<JsonTypes>;

export interface NotionLoaderImageInformation {
  imageUrl: string;
  contentId: string;
}

export interface NotionLoaderImageResult {
  imageUrl: string;
  contentId: string;
  signedImageUrl: string;
}

export type Collections = { [k: string]: NotionCollection };
export type CollectionViews = { [k: string]: NotionCollectionView };
export interface CollectionViewMap {
  collection: NotionCollection;
  collectionView: NotionCollectionView;
}

export interface NotionLoader {
  loadPage(pageId: string): Promise<void>;
  getCollectionViews(): CollectionViewMap[];
  downloadImages(
    images: NotionLoaderImageInformation[],
  ): Promise<NotionLoaderImageResult[]>;
  getBlockById(blockId: string): NotionPageBlock | undefined;
  getBlocks(copyTo: NotionPageBlock[], pageId: string): void;
  reset(): void;
}
