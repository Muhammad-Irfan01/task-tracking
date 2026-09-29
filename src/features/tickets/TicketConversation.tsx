"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui";
import { useCollection } from "@/hooks/useCollection";
import { ticketsService } from "@/services";
import { toast, useCannedResponsesStore, useTicketsStore } from "@/store";
import type { Ticket, TicketMessage } from "@/types";
import { MessageList, ReplyComposer } from "./conversation";

interface TicketConversationProps {
  ticket: Ticket;
  messages: TicketMessage[];
}

export function TicketConversation({ ticket, messages }: TicketConversationProps) {
  const reply = useTicketsStore((state) => state.reply);
  const canned = useCollection(useCannedResponsesStore);
  const loadLimits = useCallback(() => ticketsService.attachmentLimits(ticket.id), [ticket.id]);

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper-100">
        Conversation <span className="text-sm font-normal text-ink-900/40 dark:text-paper-100/40">· {messages.length}</span>
      </h2>
      <MessageList messages={messages} />
      <ReplyComposer
        label="Reply to customer"
        loadLimits={loadLimits}
        templates={canned.items.filter((r) => r.enabled)}
        greetingName={ticket.customer}
        onSend={async (body, files, storage) => {
          await reply(ticket.id, body, files, storage);
          toast.success(`Reply sent to ${ticket.customer}`);
        }}
      />
    </Card>
  );
}
