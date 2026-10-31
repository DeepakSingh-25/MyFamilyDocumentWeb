export type FileType = 'pdf' | 'jpg' | 'png';

export interface User {
  id: string;
  fullName: string;
  email: string;
  createdOn: string;
}

/** `GET /api/account/profile` — the signed-in user's own profile. */
export interface Profile extends User {
  /** Null until the password is changed or reset for the first time. */
  passwordChangedOn: string | null;
  /** True when `GET /api/account/photo` has a photo. */
  hasPhoto: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationshipId: string;
  /** Relationship name, for display. */
  relationship: string;
  dateOfBirth?: string;
  documentCount: number;
}

export interface MemberInput {
  name: string;
  relationshipId: string;
  dateOfBirth?: string;
}

/** System (built-in) or the user's own item from `/api/categories` or `/api/relationships` (spec 013). */
export interface LookupItem {
  id: string;
  name: string;
  /** Built-in: cannot be renamed or deleted. */
  isSystem: boolean;
  /** List order from the API; the user's own items sit just before "Other". */
  sortOrder: number;
}

export interface DocumentCategory extends LookupItem {
  icon: string;
  /** Hint shown under the Category dropdown; may be empty for the user's own categories. */
  examples: string;
}

export type Relationship = LookupItem;

/** Body of POST / PUT `/api/categories`. */
export interface CategoryInput {
  name: string;
  examples?: string;
}

/** Body of POST / PUT `/api/relationships`. */
export interface RelationshipInput {
  name: string;
}

export interface FamilyDocument {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
  categoryId: string;
  categoryName: string;
  documentDate?: string;
  hospitalOrDoctor?: string;
  notes?: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  uploadedOn: string;
  updatedOn?: string;
}

export interface DocumentInput {
  name: string;
  memberId: string;
  categoryId: string;
  documentDate?: string;
  hospitalOrDoctor?: string;
  notes?: string;
  /** Required when adding; optional when editing (replaces the stored file). */
  file?: File | null;
}

export interface DocumentFilter {
  search?: string;
  memberId?: string;
  categoryId?: string;
}

/** `GET /api/documents` with paging (spec 009 §B.1). Default page / size are left out of the request. */
export interface DocumentQuery extends DocumentFilter {
  page?: number;
  pageSize?: number;
}

/** Paged envelope of `GET /api/documents` (spec 009 §B.1). `totalPages` is 0 when `totalCount` is 0. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** Filters of `GET /api/documents/counts` — no search: tabs and chips count every record (spec 009 §B.3). */
export type DocumentCountsFilter = Omit<DocumentFilter, 'search'>;

/** `GET /api/documents/counts` — only groups with count > 0 are returned. */
export interface DocumentCounts {
  total: number;
  byMember: { memberId: string; count: number }[];
  byCategory: { categoryId: string; count: number }[];
}

export interface DashboardSummary {
  totalMembers: number;
  totalDocuments: number;
  medicalDocuments: number;
  addedThisMonth: number;
  recent: FamilyDocument[];
  byCategory: { category: DocumentCategory; count: number }[];
}
