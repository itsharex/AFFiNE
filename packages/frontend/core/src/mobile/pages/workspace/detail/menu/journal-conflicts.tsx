import {
  IconButton,
  MobileMenu,
  MobileMenuItem,
  MobileMenuSub,
  useConfirmModal,
} from '@affine/component';
import { MoveToTrash } from '@affine/core/components/page-list';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { JournalService } from '@affine/core/modules/journal';
import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { CalendarXmarkIcon, EditIcon, TodayIcon } from '@blocksuite/icons/rc';
import type { DocRecord } from '@toeverything/infra';
import {
  DocService,
  DocsService,
  useLiveData,
  useService,
} from '@toeverything/infra';
import { type MouseEvent, useCallback, useMemo } from 'react';

import * as styles from './journal-conflicts.css';

const ResolveConflictOperations = ({ docRecord }: { docRecord: DocRecord }) => {
  const t = useI18n();
  const journalService = useService(JournalService);
  const { openConfirmModal } = useConfirmModal();

  const handleOpenTrashModal = useCallback(
    (docRecord: DocRecord) => {
      openConfirmModal({
        title: t['com.affine.moveToTrash.confirmModal.title'](),
        description: t['com.affine.moveToTrash.confirmModal.description']({
          title: docRecord.title$.value || t['Untitled'](),
        }),
        cancelText: t['com.affine.confirmModal.button.cancel'](),
        confirmText: t.Delete(),
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: () => {
          docRecord.moveToTrash();
        },
      });
    },
    [openConfirmModal, t]
  );
  const handleRemoveJournalMark = useCallback(
    (docId: string) => {
      journalService.removeJournalDate(docId);
    },
    [journalService]
  );

  return (
    <>
      <MobileMenuItem
        prefixIcon={<CalendarXmarkIcon />}
        onClick={() => {
          handleRemoveJournalMark(docRecord.id);
        }}
        data-testid="journal-conflict-remove-mark"
      >
        {t['com.affine.page-properties.property.journal-remove']()}
      </MobileMenuItem>
      <MoveToTrash onSelect={() => handleOpenTrashModal(docRecord)} />
    </>
  );
};

const preventNav = (e: MouseEvent<HTMLButtonElement>) => {
  e.stopPropagation();
  e.preventDefault();
};

const DocItem = ({ docRecord }: { docRecord: DocRecord }) => {
  const docId = docRecord.id;
  const i18n = useI18n();
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const Icon = useLiveData(
    docDisplayMetaService.icon$(docId, { compareDate: new Date() })
  );
  const titleMeta = useLiveData(docDisplayMetaService.title$(docId));
  const title = i18n.t(titleMeta);
  return (
    <WorkbenchLink aria-label={title} to={`/${docId}`}>
      <MobileMenuItem
        prefixIcon={<Icon />}
        suffix={
          <MobileMenu
            items={<ResolveConflictOperations docRecord={docRecord} />}
          >
            <IconButton onClick={preventNav} icon={<EditIcon />} />
          </MobileMenu>
        }
      >
        <div className={styles.docItem}>
          {title}
          <div className={styles.duplicateTag}>
            {i18n['com.affine.page-properties.property.journal-duplicated']()}
          </div>
        </div>
      </MobileMenuItem>
    </WorkbenchLink>
  );
};

const ConflictList = ({ docRecords }: { docRecords: DocRecord[] }) => {
  return docRecords.map(docRecord => (
    <DocItem key={docRecord.id} docRecord={docRecord} />
  ));
};

export const MobileJournalConflictList = ({ date }: { date: string }) => {
  const docRecordList = useService(DocsService).list;
  const journalService = useService(JournalService);
  const docs = useLiveData(
    useMemo(() => journalService.journalsByDate$(date), [journalService, date])
  );
  const docRecords = useLiveData(
    docRecordList.docs$.map(records =>
      records.filter(v => {
        return docs.some(doc => doc.id === v.id);
      })
    )
  );

  return <ConflictList docRecords={docRecords} />;
};

const ConflictListMenuItem = ({ docRecords }: { docRecords: DocRecord[] }) => {
  const t = useI18n();
  return (
    <MobileMenuSub
      triggerOptions={{
        prefixIcon: <TodayIcon />,
        type: 'danger',
      }}
      items={<ConflictList docRecords={docRecords} />}
    >
      {t['com.affine.m.selector.journal-menu.conflicts']()}
    </MobileMenuSub>
  );
};

const JournalConflictsChecker = ({ date }: { date: string }) => {
  const docRecordList = useService(DocsService).list;
  const journalService = useService(JournalService);
  const docs = useLiveData(
    useMemo(() => journalService.journalsByDate$(date), [journalService, date])
  );
  const docRecords = useLiveData(
    docRecordList.docs$.map(records =>
      records.filter(v => {
        return docs.some(doc => doc.id === v.id);
      })
    )
  );

  if (docRecords.length <= 1) return null;

  return <ConflictListMenuItem docRecords={docRecords} />;
};

export const JournalConflictsMenuItem = () => {
  const journalService = useService(JournalService);
  const docId = useService(DocService).doc.id;
  const journalDate = useLiveData(journalService.journalDate$(docId));

  if (!journalDate) return null;

  return <JournalConflictsChecker date={journalDate} />;
};
