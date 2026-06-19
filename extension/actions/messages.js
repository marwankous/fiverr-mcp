if (!self.FMcp) self.FMcp = {};

// The Fiverr inbox (/conversations → /inbox) is a React SPA.
// Contact list items: [data-testid="contact"] with .contact class.
// Username of the other party: data-track-value on the avatar element.
// Preview text: .contact-excerpt

async function waitForContacts(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const contacts = Array.from(document.querySelectorAll('[data-testid="contact"]'));
    if (contacts.length > 0) return contacts;
    await new Promise(r => setTimeout(r, 400));
  }
  return [];
}

function parseContact(el) {
  const username    = el.querySelector('[data-track-value]')?.getAttribute('data-track-value') ?? '';
  const displayName = el.querySelector('.user-info p, [data-track-tag="text"]')?.textContent.trim() ?? username;
  const preview     = el.querySelector('.contact-excerpt')?.textContent.trim() ?? '';
  const timeStr     = el.querySelector('time')?.textContent.trim() ?? '';
  // Unread badge: look for a pill / count indicator
  const unreadBadge = el.querySelector('[class*="unread"], [class*="badge"], [aria-label*="unread"]');
  const unreadCount = unreadBadge ? (parseInt(unreadBadge.textContent.trim(), 10) || 1) : 0;

  return {
    id:           username,          // username acts as conversation identifier
    with:         displayName,
    username:     username,
    preview:      preview,
    time:         timeStr,
    unread_count: unreadCount,
  };
}

self.FMcp.list_messages = async function({ unreadOnly } = {}) {
  const contacts = await waitForContacts();
  if (!contacts.length) return [];
  const result = contacts.map(parseContact);
  return unreadOnly ? result.filter(c => c.unread_count > 0) : result;
};

self.FMcp.get_conversation = async function({ conversationId }) {
  // conversationId is the other user's username (from list_messages)
  const contacts = await waitForContacts();
  const contact = contacts.find(c => {
    const username = c.querySelector('[data-track-value]')?.getAttribute('data-track-value') ?? '';
    return username === String(conversationId) ||
           c.querySelector('.user-info p')?.textContent.trim() === String(conversationId);
  });
  if (!contact) throw new Error(`Conversation with ${conversationId} not found`);

  // Click to open the thread
  contact.click();
  await new Promise(r => setTimeout(r, 1500));

  // Read messages from the thread pane
  // The thread panel is the right-side area; messages use [data-testid="message"] or similar
  const threadSelectors = [
    '[data-testid="message"]',
    '[class*="message-bubble"]',
    '[class*="MessageBubble"]',
    '.message',
  ];
  let messages = [];
  for (const sel of threadSelectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      messages = Array.from(els).map(m => ({
        text:   m.textContent.trim(),
        sender: m.getAttribute('data-sender') ?? (m.classList.contains('mine') ? 'me' : 'them'),
      }));
      break;
    }
  }

  // Also grab the thread URL (conversation URL that may have loaded in the SPA)
  const threadUrl = window.location.href;

  return {
    conversationId,
    threadUrl,
    messages: messages.length ? messages : [{ note: 'Messages could not be parsed — thread structure may have changed' }],
  };
};
