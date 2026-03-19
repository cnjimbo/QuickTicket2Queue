import { defineStore } from "pinia";
import {
  StorageSerializers,
  useAsyncState,
  useSessionStorage,
  useStorage,
} from "@vueuse/core";
import { TicketResponse, TicketType } from "@/types/orm_types";
import { computed, reactive, ref, toRaw } from "vue";

export const fieldLabels = {
  userName: "工单提交人",
  title: "工单简要标题",
  content: "工单详细描述",
  queue_val: "队列",
} as const;

type FieldKey = keyof typeof fieldLabels;
type ValidationMessages = Record<FieldKey, string>;

const createEmptyValidationMessages = (): ValidationMessages => ({
  userName: "",
  title: "",
  content: "",
  queue_val: "",
});

const requiredFields: FieldKey[] = ["userName", "title", "content"];
const TICKET_DRAFT_STORAGE_KEY = "quickticket2queue:ticket-draft:v1";
const HISTORY_COPY_PAYLOAD_KEY = "quickticket2queue:history-copy-payload:v1";

type TicketDraftCache = Pick<TicketType, "title" | "content" | "queue_val">;

const createEmptyDraft = (): TicketDraftCache => ({
  title: "",
  content: "",
  queue_val: "",
});

export const useTicketStore = defineStore("ticket", () => {
  const ticket = reactive<TicketType>({
    title: "",
    content: "",
    queue_val: "",
    userName: "",
  } as TicketType);
  const validationMessages = reactive<ValidationMessages>(
    createEmptyValidationMessages(),
  );
  const result = ref<TicketResponse>();
  const suppressDraftPersistence = ref(false);
  const historyCopyPayload = useSessionStorage<Partial<TicketType> | null>(
    HISTORY_COPY_PAYLOAD_KEY,
    null,
    { serializer: StorageSerializers.object },
  );
  const draftBaselineSnapshot = ref(JSON.stringify(createEmptyDraft()));
  const draftCache = useStorage<TicketDraftCache>(
    TICKET_DRAFT_STORAGE_KEY,
    createEmptyDraft(),
    localStorage,
  );
  const { execute: executeSubmitTicket, isLoading: isSubmitting } = useAsyncState(
    (payload: TicketType) => window.electron.ticket(payload),
    undefined as TicketResponse | undefined,
    { immediate: false, resetOnExecute: false },
  );
  const { execute: executeSubmitInternalTicket, isLoading: isSubmittingInternalTicket } = useAsyncState(
    (payload: TicketType) => window.electron.internalTicket(payload),
    undefined as TicketResponse | undefined,
    { immediate: false, resetOnExecute: false },
  );

  const isFormValid = computed(() =>
    requiredFields.every((field) => (ticket[field] ?? "").trim().length > 0),
  );
  const hasUnsavedDraftChanges = computed(
    () => JSON.stringify(getTicketDraftSnapshot()) !== draftBaselineSnapshot.value,
  );

  const resetValidationMessages = () => {
    Object.assign(validationMessages, createEmptyValidationMessages());
  };

  const setTicketField = (field: FieldKey, value: string) => {
    ticket[field] = value;
  };

  const getTicketDraftSnapshot = (): TicketDraftCache => ({
    title: ticket.title ?? "",
    content: ticket.content ?? "",
    queue_val: ticket.queue_val ?? "",
  });

  const saveTicketDraft = () => {
    draftCache.value = getTicketDraftSnapshot();
  };

  const refreshDraftBaseline = () => {
    draftBaselineSnapshot.value = JSON.stringify(getTicketDraftSnapshot());
  };

  const setTicketFieldsWithoutDraft = (fields: Partial<TicketType>) => {
    suppressDraftPersistence.value = true;
    if (typeof fields.userName === "string") {
      ticket.userName = fields.userName;
    }
    if (typeof fields.title === "string") {
      ticket.title = fields.title;
    }
    if (typeof fields.content === "string") {
      ticket.content = fields.content;
    }
    if (typeof fields.queue_val === "string") {
      ticket.queue_val = fields.queue_val;
    }
    suppressDraftPersistence.value = false;
  };

  const setHistoryCopyPayload = (fields: Partial<TicketType>) => {
    historyCopyPayload.value = {
      userName:
        typeof fields.userName === "string" ? fields.userName : undefined,
      title: typeof fields.title === "string" ? fields.title : undefined,
      content: typeof fields.content === "string" ? fields.content : undefined,
      queue_val:
        typeof fields.queue_val === "string" ? fields.queue_val : undefined,
    };
  };

  const consumeHistoryCopyPayload = () => {
    const payload = historyCopyPayload.value;
    historyCopyPayload.value = null;
    return payload;
  };

  const hydrateTicketDraft = () => {
    const draft = draftCache.value;
    if (!draft) return;

    ticket.title = draft.title;
    ticket.content = draft.content;
    if (!ticket.queue_val?.trim()) {
      ticket.queue_val = draft.queue_val;
    }
  };

  const clearTicketDraft = () => {
    const empty = createEmptyDraft();
    ticket.title = empty.title;
    ticket.content = empty.content;
    ticket.queue_val = empty.queue_val;
  };

  const validateTicket = () => {
    resetValidationMessages();
    let firstError = "";
    requiredFields.forEach((field) => {
      const value = (ticket[field] ?? "").trim();
      if (!value) {
        const msg = `${fieldLabels[field]}不能为空`;
        validationMessages[field] = msg;
        if (!firstError) firstError = msg;
      }
    });
    return firstError;
  };

  const setResult = (payload?: TicketResponse) => {
    result.value = payload;
  };

  const submitTicket = async () => {
    const validationError = validateTicket();
    if (validationError) {
      return validationError;
    }

    try {
      setResult();
      const payload = toRaw(ticket);
      saveTicketDraft();

      const res = await executeSubmitTicket(0, payload);
      setResult(res);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "提交失败，请稍后重试";
      return message;
    }

    return undefined;
  };

  const submitInternalTicket = async () => {
    const validationError = validateTicket();
    if (validationError) {
      return validationError;
    }

    try {
      setResult();
      const payload = toRaw(ticket);
      saveTicketDraft();

      const res = await executeSubmitInternalTicket(0, payload);
      setResult(res);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "通过网页登录态提交失败，请稍后重试";
      return message;
    }

    return undefined;
  };

  return {
    ticket,
    validationMessages,
    result,
    isSubmitting,
    isSubmittingInternalTicket,
    isFormValid,
    hasUnsavedDraftChanges,
    setTicketField,
    getTicketDraftSnapshot,
    saveTicketDraft,
    refreshDraftBaseline,
    setTicketFieldsWithoutDraft,
    setHistoryCopyPayload,
    consumeHistoryCopyPayload,
    hydrateTicketDraft,
    clearTicketDraft,
    resetValidationMessages,
    validateTicket,
    setResult,
    submitTicket,
    submitInternalTicket,
  };
});
