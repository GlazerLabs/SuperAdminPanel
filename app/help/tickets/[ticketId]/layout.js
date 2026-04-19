/**
 * Edge-to-edge chat: cancel root layout padding for this route so the module can use full width.
 */
export default function TicketChatLayout({ children }) {
  return <div className="-mx-6 -mt-4 -mb-6 flex min-h-0 flex-col">{children}</div>;
}
