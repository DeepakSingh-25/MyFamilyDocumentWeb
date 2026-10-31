import { UiService } from '../../core/services/ui.service';
import { FamilyMember } from '../../shared/models/models';

/**
 * Same question on the list and the member page (spec 008 §B.6a). The API only soft-deletes,
 * so the text says "removed from the app", not "permanently". Restore is SQL-only, so it is not mentioned.
 */
export function confirmMemberDelete(ui: UiService, member: FamilyMember): Promise<boolean> {
  const docs = member.documentCount ? ` and all ${member.documentCount} of their documents` : '';
  return ui.confirm('Delete member?', `${member.name}${docs} will be removed from the app.`);
}
