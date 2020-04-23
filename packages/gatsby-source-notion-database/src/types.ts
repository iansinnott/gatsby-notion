import { PluginOptions } from 'gatsby';
import { Block } from 'notionapi-agent/dist/interfaces';
import { BasicBlockUnion } from 'notionapi-agent/dist/interfaces/notion-models/block/basic_block';
import { MediaBlockUnion } from 'notionapi-agent/dist/interfaces/notion-models/block/media';
import { SemanticString } from 'notionapi-agent/dist/interfaces';
import { IntermediateForm } from './mapIntermediateContentRepresentation';

export type NotionPropertyValue = Array<[string, any?]>;

export type NotionContentBlock = BasicBlockUnion | MediaBlockUnion;

export interface PropertyDetails {
  pid: string;
  value: string;
  _raw: string;
  name: string;
  type: string;
}

export type CollectionBlock = Block & {
  properties: { [k: string]: NotionPropertyValue };
};

export interface DateObject {
  type: 'date';
  start_date: string;
}

export interface NotionMeta {
  slug?: string;
  date?: string;
  tags?: string[];
  isDraft?: boolean;
  excerpt?: string;
}

export interface NotionPageAtt {
  att: string;
  value?: string;
}

export interface NotionPageText {
  text: string;
  atts: NotionPageAtt[];
}

export interface NotionPageProperty {
  propName: string;
  value: NotionPageText[];
}

export interface NotionPageBlock {
  type: string;
  blockId: string;
  properties: NotionPageProperty[];
  attributes: NotionPageAtt[];
  blockIds: string[];
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
  title: string;
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
}

// generic type to hold json data
export type JsonTypes = string | number | boolean | Date | Json | JsonArray;
export interface Json {
  [x: string]: JsonTypes;
}
export type JsonArray = Array<JsonTypes>;

// plugin configuration data
export interface NotionsoPluginOptions extends PluginOptions {
  databaseViewUrl: string;
  name: string;
  tokenv2?: string;
  downloadLocal: boolean;
  debug?: boolean;
  renderers?: { [k: string]: (x: IntermediateForm) => any };
  makeSlug?: (x: IntermediateForm) => string;
}

export interface NotionLoaderImageInformation {
  imageUrl: string;
  contentId: string;
}

export interface NotionLoaderImageResult {
  imageUrl: string;
  contentId: string;
  signedImageUrl: string;
}

export interface NotionLoader {
  loadPage(pageId: string): Promise<void>;
  downloadImages(
    images: NotionLoaderImageInformation[],
  ): Promise<NotionLoaderImageResult[]>;
  getBlockById(blockId: string): NotionPageBlock | undefined;
  getBlocks(copyTo: NotionPageBlock[], pageId: string): void;
  reset(): void;
}

export interface BlockType {
  id: string;
  version: number;
  type: string;
  properties: { [k: string]: any };
  content?: NotionContentBlock[];
  created_time: number;
  last_edited_time: number;
  parent_id: string;
  parent_table: string;
  alive: boolean;
  created_by_table: string;
  created_by_id: string;
  last_edited_by_table: string;
  last_edited_by_id: string;
  _notionBlockId: string;
  _propertyDetails: { [k: string]: PropertyDetails };
}

export { IntermediateForm };

export type Unpacked<T> = T extends (infer U)[] ? U : T;
