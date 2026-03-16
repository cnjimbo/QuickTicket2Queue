import { defineStore } from "pinia";
import { TicketResponse, TicketType } from "@/types/orm_types";
import { computed, reactive, ref, toRaw, watch } from "vue";

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

type TicketDraftCache = Pick<TicketType, "title" | "content" | "queue_val">;

const createEmptyDraft = (): TicketDraftCache => ({
  title: "",
  content: "",
  queue_val: "",
});

function readDraftFromStorage(): TicketDraftCache | null {
  try {
    const raw = window.localStorage.getItem(TICKET_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TicketDraftCache>;
    return {
      title: String(parsed.title ?? ""),
      content: String(parsed.content ?? ""),
      queue_val: String(parsed.queue_val ?? ""),
    };
  } catch {
    return null;
  }
}

function writeDraftToStorage(draft: TicketDraftCache): void {
  try {
    window.localStorage.setItem(TICKET_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage write errors (quota, privacy mode, etc.)
  }
}

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
  const isSubmitting = ref(false);

  const isFormValid = computed(() =>
    requiredFields.every((field) => (ticket[field] ?? "").trim().length > 0),
  );

  const resetValidationMessages = () => {
    Object.assign(validationMessages, createEmptyValidationMessages());
  };

  const setTicketField = (field: FieldKey, value: string) => {
    ticket[field] = value;
  };

  const hydrateTicketDraft = () => {
    const draft = readDraftFromStorage();
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
      isSubmitting.value = true;
      // console.log("🚀 ~ submitTicket ~ isSubmitting:", isSubmitting.value);
      setResult();
      const payload = toRaw(ticket);
      writeDraftToStorage({
        title: payload.title ?? "",
        content: payload.content ?? "",
        queue_val: payload.queue_val ?? "",
      });

      // console.log("Submitting ticket:", payload, "Queue:", payload.queue_val);
      const res = await window.electron.ticket(payload); //typedInvoke(ipcChannels.ticket, payload)
      setResult(res);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "提交失败，请稍后重试";
      return message;
    } finally {
      isSubmitting.value = false;
    }

    return undefined;
  };

  watch(
    () => ({
      title: ticket.title,
      content: ticket.content,
      queue_val: ticket.queue_val,
    }),
    (draft) => {
      writeDraftToStorage(draft);
    },
    { deep: true },
  );

  return {
    ticket,
    validationMessages,
    result,
    isSubmitting,
    isFormValid,
    setTicketField,
    hydrateTicketDraft,
    clearTicketDraft,
    resetValidationMessages,
    validateTicket,
    setResult,
    submitTicket,
  };
});
