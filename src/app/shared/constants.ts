/** Built-in category "Medical Documents" — fixed GUID, contract with the API (`DomainRules.MedicalCategoryId`, spec 014). */
export const MEDICAL_CATEGORY_ID: string = '10000000-0000-0000-0000-000000000003';

/**
 * Built-in relationship "Self" — fixed GUID (`DomainRules.SelfRelationshipId`, spec 014). Only one active member
 * per account (spec 007 §B.2).
 */
export const SELF_RELATIONSHIP_ID: string = '20000000-0000-0000-0000-000000000001';

/** Dropdown value of the "+ Add new…" option in the category / relationship selects (spec 013). Never a GUID (spec 014). */
export const ADD_NEW_ID: string = 'new';

/** Same as `DomainRules.CategoryNameMax`, `CategoryExamplesMax` and `RelationshipMax` (spec 013). */
export const CATEGORY_NAME_MAX = 60;
export const CATEGORY_EXAMPLES_MAX = 300;
export const RELATIONSHIP_NAME_MAX = 30;

/** Earliest date of birth the API accepts (`DomainRules.MinDateOfBirth`, spec 007 §B.1). */
export const MIN_DATE_OF_BIRTH = '1900-01-01';

/** Same as `DomainRules.MemberNameMax`. */
export const MEMBER_NAME_MAX = 100;

/** Rows per page offered by the paginator; the API default is 10 and its maximum 50 (spec 009 §B.1). */
export const PAGE_SIZES = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/** Same as `DomainRules.SearchMax` — longer search text is a 400 on the API. */
export const SEARCH_MAX = 100;
